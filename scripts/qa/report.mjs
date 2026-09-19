import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { cpus, platform, arch, release } from 'node:os'
import { resolve } from 'node:path'

export const config = JSON.parse(
  readFileSync(new URL('../../qa/config.json', import.meta.url)),
)
export const digest = value => createHash('sha256').update(value).digest('hex')
export const configHash = digest(
  JSON.stringify(config) +
    ['measure.mjs', 'tasks.mjs']
      .map(file => readFileSync(new URL(file, import.meta.url), 'utf8'))
      .join('\n'),
)

// Include uncommitted and untracked inputs, including media. Reports and ordinary
// documentation cannot invalidate the source they describe. TASKS.md is an input.
export function sourceHash(directory = process.cwd()) {
  const files = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: directory },
  )
    .toString()
    .split('\0')
    .filter(Boolean)
    .filter(
      file => !file.startsWith('qa/results/') && file !== 'qa/baseline.json',
    )
    .filter(
      file =>
        !file.startsWith('docs/') &&
        !file.startsWith('artifacts/') &&
        file !== 'next-env.d.ts' &&
        file !== 'README.md',
    )
  const hash = createHash('sha256')
  for (const file of [...new Set(files)].sort()) {
    const path = resolve(directory, file)
    // A deletion must hash the same before and after it is staged/committed.
    if (!existsSync(path)) continue
    hash.update(file).update('\0')
    hash.update(readFileSync(path))
    hash.update('\0')
  }
  return hash.digest('hex')
}

export function environment(browserVersion) {
  return {
    platform: platform(),
    osRelease: release(),
    arch: arch(),
    cpu: cpus()[0]?.model,
    cores: cpus().length,
    browserVersion,
    node: process.version,
  }
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

export function summarize(samples) {
  return config.profiles.flatMap(profile =>
    config.tasks.map(task => {
      const matching = samples.filter(
        sample => sample.profile === profile.id && sample.task === task,
      )
      const metrics = Object.fromEntries(
        Object.keys(config.regression).map(key => [
          key,
          median(matching.map(sample => sample[key])),
        ]),
      )
      return { profile: profile.id, task, count: matching.length, ...metrics }
    }),
  )
}

export function completeness(report) {
  const failures = []
  if (report.mode !== 'release')
    failures.push('Diagnostic or unknown run mode cannot authorize a release.')
  if (report.schema !== 1 || report.configHash !== configHash)
    failures.push('QA configuration changed or report schema is unsupported.')
  if (
    !report.environment?.browserVersion ||
    !report.environment?.cpu ||
    !report.buildId
  )
    failures.push('Missing production build/environment evidence.')
  if (!report.checks?.unit || !report.checks?.browser)
    failures.push('Unit or cross-browser checks did not pass.')
  if (report.errors?.length) failures.push(...report.errors)
  if (!Array.isArray(report.samples))
    return [...failures, 'Missing measured samples.']
  if (
    report.samples.length !==
    config.profiles.length * config.tasks.length * config.repetitions
  )
    failures.push('Incomplete sample matrix.')
  for (const profile of config.profiles)
    for (const task of config.tasks) {
      const samples = report.samples.filter(
        sample => sample.profile === profile.id && sample.task === task,
      )
      if (
        samples.length !== config.repetitions ||
        Array.from(
          { length: config.repetitions },
          (_, index) => index + 1,
        ).some(
          repetition =>
            !samples.some(sample => sample.repetition === repetition),
        )
      )
        failures.push(`Missing repetitions: ${profile.id}/${task}`)
      for (const sample of samples)
        for (const metric of Object.keys(config.regression)) {
          if (!Number.isFinite(sample[metric]) || sample[metric] < 0)
            failures.push(`Invalid metric: ${profile.id}/${task}/${metric}`)
        }
    }
  return failures
}

export function compare(report, baseline) {
  const failures = completeness(report)
  if (!baseline)
    return [
      ...failures,
      'No accepted baseline. Review a complete run, then use pnpm qa:baseline <report>.',
    ]
  if (completeness(baseline).length)
    return [
      ...failures,
      'The baseline is incomplete or uses a different QA configuration.',
    ]
  if (
    JSON.stringify(report.environment) !== JSON.stringify(baseline.environment)
  )
    return [
      ...failures,
      'Measurement environment changed. Recalibrate on the same machine/browser before comparing.',
    ]
  const previous = summarize(baseline.samples)
  for (const row of summarize(report.samples)) {
    const before = previous.find(
      candidate =>
        candidate.profile === row.profile && candidate.task === row.task,
    )
    for (const [metric, budget] of Object.entries(config.regression)) {
      const limit = Math.max(
        before[metric] * budget.ratio,
        before[metric] + budget.allowance,
      )
      if (row[metric] > limit)
        failures.push(
          `${row.profile}/${row.task}: ${metric} ${row[metric].toFixed(1)} > ${limit.toFixed(1)} (baseline ${before[metric].toFixed(1)})`,
        )
    }
  }
  return failures
}

export function markdown(report) {
  const rows = summarize(report.samples)
  const browser = report.browserResults
  return (
    [
      `# QA run ${report.id}`,
      `Source: \`${report.sourceHash}\``,
      `Commit: \`${report.commit}\` (working-tree contents are captured by the source hash).`,
      `Environment: \`${JSON.stringify(report.environment)}\``,
      `Status: **${report.status}**. Unit checks: ${report.checks.unit ? 'passed' : 'failed'}. Browser checks: ${report.checks.browser ? 'passed' : 'failed'}.`,
      browser
        ? `Browser matrix: ${browser.expected} passed, ${browser.unexpected} failed, ${browser.skipped} skipped.`
        : '',
      `Values are medians of ${config.repetitions} runs, in milliseconds. Incomplete groups are not eligible as a baseline.`,
      '| Profile | Task | Samples | Task duration | Longest task | Longest animation frame | p95 frame gap |\n| --- | --- | ---: | ---: | ---: | ---: | ---: |\n' +
        rows
          .map(
            row =>
              `| ${row.profile} | ${row.task} | ${row.count} | ${['durationMs', 'maxLongTaskMs', 'maxLongFrameMs', 'frameGapP95Ms'].map(key => (Number.isFinite(row[key]) ? row[key].toFixed(1) : 'missing')).join(' | ')} |`,
          )
          .join('\n'),
      report.failures.length
        ? '## Release blockers\n\n' +
          report.failures.map(failure => `- ${failure}`).join('\n')
        : 'All configured checks passed.',
      browser?.failures.length
        ? '## Browser failures\n\n' +
          browser.failures
            .map(
              failure =>
                `- **${failure.project}: ${failure.task}**\n\n  ${failure.error.split('\n').filter(Boolean).join('\n  ')}`,
            )
            .join('\n\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n') + '\n'
  )
}
