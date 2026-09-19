import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { createRequire } from 'node:module'
import { once } from 'node:events'
import { resolve } from 'node:path'
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

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '../..')
process.chdir(root)
const tasksOnly =
  process.argv.length === 3 && process.argv[2] === '--tasks-only'
if (process.argv.length > 2 && !tasksOnly)
  throw new Error(
    'Usage: pnpm qa:run [--tasks-only] (builds and temporarily serves this checkout on 127.0.0.1:3032)',
  )

const id = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const artifacts = resolve('test-results/qa', id)
mkdirSync(artifacts, { recursive: true })
mkdirSync('qa/results', { recursive: true })
const report = {
  schema: 1,
  id,
  createdAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
  sourceHash: sourceHash(),
  configHash,
  mode: tasksOnly ? 'diagnostic' : 'release',
  environment: null,
  checks: { unit: false, browser: false },
  samples: [],
  errors: [],
  failures: [],
  status: 'running',
}
const baseURL = 'http://127.0.0.1:3032'
let server
let browser
let child
let interrupted = false
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    interrupted = true
    child?.kill('SIGTERM')
    server?.kill('SIGTERM')
    void browser?.close()
  })

async function command(label, executable, args, env = {}) {
  if (interrupted) throw new Error('QA interrupted')
  console.log(`\n${label}`)
  let output = ''
  child = spawn(executable, args, {
    cwd: root,
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
  // Refuse to reuse or terminate an unrelated server on the QA port.
  const probe = createServer()
  probe.listen(3032, '127.0.0.1')
  await once(probe, 'listening')
  await new Promise((resolve, reject) =>
    probe.close(error => (error ? reject(error) : resolve())),
  )
  if (!(await command('build', 'pnpm', ['build'])))
    throw new Error('Production build failed')
  report.buildId = readFileSync('.next/BUILD_ID', 'utf8').trim()
  server = spawn(
    process.execPath,
    [
      require.resolve('next/dist/bin/next'),
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3032',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
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
    try {
      const response = await fetch(`${baseURL}/work`, {
        signal: AbortSignal.timeout(1000),
      })
      if (response.ok) break
    } catch {
      /* The owned server is still starting. */
    }
    if (Date.now() >= deadline)
      throw new Error(`QA server did not become ready: ${serverLog}`)
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  report.checks.unit = await command('unit', 'pnpm', ['test:unit'])
  if (!tasksOnly) {
    report.checks.browser = await command(
      'browser',
      'pnpm',
      [
        'exec',
        'playwright',
        'test',
        'portfolio.spec.ts',
        'portfolio-theme.spec.ts',
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
      browserResults.stats.expected > 0 && browserResults.stats.unexpected === 0
  } else {
    console.log(
      'Diagnostic run: cross-browser suite omitted; this report cannot authorize a release.',
    )
  }

  browser = await chromium.launch({ headless: true })
  report.environment = environment(browser.version())
  for (const profile of config.profiles) {
    for (let repetition = 1; repetition <= config.repetitions; repetition++) {
      if (interrupted) throw new Error('QA interrupted')
      console.log(
        `\nMeasuring ${profile.id}, repetition ${repetition}/${config.repetitions}`,
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
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu })
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
  if (sourceHash() !== report.sourceHash)
    report.errors.push(
      'Source changed during QA. Run again against the final checkout.',
    )
  if (readFileSync('.next/BUILD_ID', 'utf8').trim() !== report.buildId)
    report.errors.push(
      'The production build was replaced during QA. Run again.',
    )
} catch (error) {
  report.errors.push(error.message)
} finally {
  await browser
    ?.close()
    .catch(error => report.errors.push(`Browser cleanup: ${error.message}`))
  if (server && server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit')
    server.kill('SIGTERM')
    const timer = setTimeout(() => server.kill('SIGKILL'), 5000)
    await stopped
    clearTimeout(timer)
  }
  const baseline = existsSync('qa/baseline.json')
    ? JSON.parse(readFileSync('qa/baseline.json', 'utf8'))
    : null
  report.errors = report.errors.map(error =>
    error.replace(/\u001b\[[0-9;]*m/g, ''),
  )
  report.failures = compare(report, baseline)
  report.completedAt = new Date().toISOString()
  report.status = report.failures.length ? 'blocked' : 'passed'
  writeFileSync(`qa/results/${id}.json`, `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(`qa/results/${id}.md`, markdown(report))
  console.log(`\nQA ${report.status}: qa/results/${id}.md`)
  for (const failure of report.failures) console.error(failure)
  process.exitCode = report.failures.length ? 1 : 0
}
