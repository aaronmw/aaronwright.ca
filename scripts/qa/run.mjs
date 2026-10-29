import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { stripVTControlCharacters } from 'node:util'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import {
  compare,
  config,
  configHash,
  environment,
  markdown,
  sourceHash,
} from './report.mjs'
import { installMeasurements } from './measure.mjs'
import { prepareTask, runTasks } from './tasks.mjs'

const root = resolve(import.meta.dirname, '../..')
process.chdir(root)
const args = process.argv.slice(2)
const tasksOnly = args.length === 1 && args[0] === '--tasks-only'
const referenceRoot =
  args.length === 2 && args[0] === '--reference' ? resolve(args[1]) : null
if (args.length && !tasksOnly && !referenceRoot)
  throw new Error(
    'Usage: pnpm qa:run [--tasks-only | --reference /path/to/published-checkout]',
  )
if (referenceRoot === root)
  throw new Error('The reference must be a separate checkout.')
if (referenceRoot) {
  const reference = await import(
    pathToFileURL(resolve(referenceRoot, 'scripts/qa/report.mjs'))
  )
  if (reference.configHash !== configHash)
    throw new Error(
      'Reference and candidate must use identical tasks, measurements and budgets.',
    )
  const version = cwd =>
    createRequire(resolve(cwd, 'package.json'))('@playwright/test/package.json')
      .version
  if (version(root) !== version(referenceRoot))
    throw new Error(
      'Reference and candidate must use the same Playwright version.',
    )
}

const id = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const targets = (
  referenceRoot
    ? [
        ['reference', referenceRoot],
        ['candidate', root],
      ]
    : [['candidate', root]]
).map(([name, cwd]) => {
  const artifacts = resolve(cwd, 'test-results/qa', id)
  mkdirSync(artifacts, { recursive: true })
  mkdirSync(resolve(cwd, 'qa/results'), { recursive: true })
  return {
    name,
    cwd,
    artifacts,
    report: {
      schema: 1,
      id,
      createdAt: new Date().toISOString(),
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd })
        .toString()
        .trim(),
      sourceHash: sourceHash(cwd),
      configHash,
      mode: tasksOnly ? 'diagnostic' : 'release',
      environment: null,
      checks: { unit: false, browser: false },
      samples: [],
      errors: [],
      failures: [],
      status: 'running',
    },
  }
})
const servers = []
let browser
let child
let interrupted = false
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    interrupted = true
    child?.kill('SIGTERM')
    for (const server of servers) server.kill('SIGTERM')
    void browser?.close()
  })

async function command(target, label, executable, args, env = {}) {
  const { cwd, artifacts } = target
  if (interrupted) throw new Error('QA interrupted')
  console.log(`\n${target.name}: ${label}`)
  let output = ''
  child = spawn(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', data => {
      output += data.toString()
      process.stdout.write(data)
    })
  const [code] = await once(child, 'exit')
  child = undefined
  writeFileSync(resolve(artifacts, `${label}.log`), output)
  if (interrupted) throw new Error('QA interrupted')
  return code === 0
}

try {
  for (const target of targets) {
    const { report, cwd, artifacts } = target
    const require = createRequire(resolve(cwd, 'package.json'))
    let baseURL
    if (!(await command(target, 'build', 'pnpm', ['build'])))
      throw new Error('Production build failed')
    report.buildId = readFileSync(resolve(cwd, '.next/BUILD_ID'), 'utf8').trim()
    const server = spawn(
      process.execPath,
      [
        require.resolve('next/dist/bin/next'),
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        // Let this server bind an available port atomically, without a probe race.
        '0',
      ],
      { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    servers.push(server)
    let serverLog = ''
    let serverError
    server.on('error', error => {
      serverError = error
    })
    for (const stream of [server.stdout, server.stderr])
      stream.on('data', data => {
        serverLog += data.toString()
      })
    const deadline = Date.now() + 30_000
    while (true) {
      if (
        interrupted ||
        serverError ||
        server.exitCode !== null ||
        server.signalCode !== null
      )
        throw new Error(`QA server failed: ${serverError ?? serverLog}`)
      // Next reports the actual bound address, including an OS-assigned port.
      baseURL ??= stripVTControlCharacters(serverLog).match(
        /Local:\s+(http:\/\/127\.0\.0\.1:\d+)(?=\s|$)/,
      )?.[1]
      if (baseURL) {
        try {
          const response = await fetch(`${baseURL}/work`, {
            signal: AbortSignal.timeout(1000),
          })
          if (response.ok) break
        } catch {
          /* The owned server is still starting. */
        }
      }
      if (Date.now() >= deadline)
        throw new Error(`QA server did not become ready: ${serverLog}`)
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    report.baseURL = baseURL
    console.log(`QA ${target.name} server: ${baseURL}`)

    report.checks.unit = await command(target, 'unit', 'pnpm', ['test:unit'])
    if (!tasksOnly) {
      report.checks.browser = await command(
        target,
        'browser',
        'pnpm',
        [
          'exec',
          'playwright',
          'test',
          'portfolio.spec.ts',
          'portfolio-theme.spec.ts',
          ...(target.name === 'candidate'
            ? [
                'portfolioIsolation.spec.ts',
                'mosaicRoutes.spec.ts',
                'mosaicRelease.spec.ts',
              ]
            : []),
          '--workers=2',
          '--retries=0',
          '--reporter=list,json',
          `--output=${resolve(artifacts, 'browser')}`,
        ],
        {
          PLAYWRIGHT_BASE_URL: baseURL,
          PLAYWRIGHT_JSON_OUTPUT_NAME: resolve(artifacts, 'browser.json'),
        },
      )
      const browserResults = JSON.parse(
        readFileSync(resolve(artifacts, 'browser.json'), 'utf8'),
      )
      const failures = []
      function collectFailures(suite) {
        for (const spec of suite.specs ?? [])
          for (const test of spec.tests) {
            if (test.status === 'unexpected')
              failures.push({
                project: test.projectName,
                task: spec.title,
                error:
                  test.results
                    .at(-1)
                    ?.error?.message?.replace(/\u001b\[[0-9;]*m/g, '') ??
                  'Failed',
              })
          }
        for (const nested of suite.suites ?? []) collectFailures(nested)
      }
      browserResults.suites.forEach(collectFailures)
      report.browserResults = { ...browserResults.stats, failures }
      report.checks.browser &&=
        browserResults.stats.expected > 0 &&
        browserResults.stats.unexpected === 0
    } else {
      console.log(
        'Diagnostic run: cross-browser suite omitted; this report cannot authorize a release.',
      )
    }
  }
  browser = await chromium.launch({ headless: true })
  for (const { report } of targets)
    report.environment = environment(browser.version())
  let sequence = 0
  for (const profile of config.profiles) {
    for (let repetition = 1; repetition <= config.repetitions; repetition++) {
      // Counterbalance which build runs first; preserve each complete six-task journey.
      const ordered = sequence++ % 2 ? [...targets].reverse() : targets
      for (const target of ordered) {
        const { report, artifacts } = target
        const baseURL = report.baseURL
        if (interrupted) throw new Error('QA interrupted')
        console.log(
          `\nMeasuring ${target.name}: ${profile.id}, repetition ${repetition}/${config.repetitions}`,
        )
        const context = await browser.newContext({
          baseURL,
          viewport: { width: profile.width, height: profile.height },
          hasTouch: profile.touch,
          isMobile: profile.touch,
          deviceScaleFactor: profile.touch ? 2 : 1,
          colorScheme: 'dark',
          reducedMotion: 'no-preference',
          serviceWorkers: 'block',
        })
        const errors = []
        const page = await context.newPage()
        page.setDefaultTimeout(30_000)
        page.setDefaultNavigationTimeout(60_000)
        page.on('pageerror', error => errors.push(error.message))
        page.on('console', message => {
          if (message.type() === 'error') errors.push(message.text())
        })
        page.on('response', response => {
          if (response.status() >= 400 && response.url().startsWith(baseURL))
            errors.push(
              `HTTP ${response.status()}: ${response.url().slice(baseURL.length)}`,
            )
        })
        const cdp = await context.newCDPSession(page)
        let task = 'setup'
        try {
          await cdp.send('Network.enable')
          await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
          await cdp.send('Emulation.setCPUThrottlingRate', {
            rate: profile.cpu,
          })
          await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: profile.latency,
            downloadThroughput: profile.downloadMbps
              ? (profile.downloadMbps * 1_000_000) / 8
              : -1,
            uploadThroughput: profile.downloadMbps ? 750_000 / 8 : -1,
          })
          await context.addInitScript(installMeasurements)
          await runTasks({
            page,
            cdp,
            profile,
            measure: async (name, action, options = {}) => {
              task = name
              if (!config.tasks.includes(name))
                throw new Error(`Unknown task: ${name}`)
              try {
                await prepareTask(page, name)
                if (!options.navigation)
                  await page.evaluate(() => window.__qa.begin())
                await action()
                const metrics = await page.evaluate(() => window.__qa.finish())
                await options.verify?.()
                report.samples.push({
                  profile: profile.id,
                  repetition,
                  task,
                  ...metrics,
                })
                console.log(
                  `  ${task}: ${Math.round(metrics.durationMs)}ms; longest main-thread task ${Math.round(metrics.maxLongTaskMs)}ms`,
                )
              } catch (error) {
                report.errors.push(
                  `${profile.id}/${repetition}/${task}: ${error.message}`,
                )
                console.error(report.errors.at(-1))
                await page
                  .screenshot({
                    path: resolve(
                      artifacts,
                      `${profile.id}-${repetition}-${task}.png`,
                    ),
                  })
                  .catch(() => {})
              }
            },
          })
          if (errors.length)
            report.errors.push(
              `${profile.id}/${repetition}: ${errors.join('\n')}`,
            )
        } catch (error) {
          report.errors.push(
            `${profile.id}/${repetition}/${task}: ${error.message}`,
          )
          console.error(report.errors.at(-1))
          await page
            .screenshot({
              path: resolve(artifacts, `${profile.id}-${repetition}.png`),
            })
            .catch(() => {})
        } finally {
          await context.close()
        }
      }
    }
  }
  for (const { report, cwd } of targets) {
    if (sourceHash(cwd) !== report.sourceHash)
      report.errors.push(
        'Source changed during QA. Run again against the final checkout.',
      )
    if (
      readFileSync(resolve(cwd, '.next/BUILD_ID'), 'utf8').trim() !==
      report.buildId
    )
      report.errors.push(
        'The production build was replaced during QA. Run again.',
      )
  }
} catch (error) {
  for (const { report } of targets) report.errors.push(error.message)
} finally {
  await browser?.close().catch(error => {
    for (const { report } of targets)
      report.errors.push(`Browser cleanup: ${error.message}`)
  })
  for (const server of servers) {
    if (server.exitCode === null && server.signalCode === null) {
      const stopped = once(server, 'exit')
      server.kill('SIGTERM')
      const timer = setTimeout(() => server.kill('SIGKILL'), 5000)
      await stopped
      clearTimeout(timer)
    }
  }
  for (const { report, cwd, name } of targets) {
    const baselinePath = resolve(cwd, 'qa/baseline.json')
    const baseline = existsSync(baselinePath)
      ? JSON.parse(readFileSync(baselinePath, 'utf8'))
      : null
    report.errors = report.errors.map(error =>
      error.replace(/\u001b\[[0-9;]*m/g, ''),
    )
    report.failures = compare(report, baseline)
    report.completedAt = new Date().toISOString()
    report.status = report.failures.length ? 'blocked' : 'passed'
    if (referenceRoot && name === 'candidate') {
      const reference = targets[0].report
      report.referenceComparison = {
        id: reference.id,
        sourceHash: reference.sourceHash,
        buildId: reference.buildId,
        failures: compare(report, reference),
      }
      console.log(
        `Paired comparison: ${report.referenceComparison.failures.length} failures`,
      )
      for (const failure of report.referenceComparison.failures)
        console.error(failure)
    }
    writeFileSync(
      resolve(cwd, `qa/results/${id}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
    )
    writeFileSync(resolve(cwd, `qa/results/${id}.md`), markdown(report))
    console.log(`\n${name} QA ${report.status}: ${cwd}/qa/results/${id}.md`)
    for (const failure of report.failures) console.error(failure)
    if (report.failures.length) process.exitCode = 1
  }
}
