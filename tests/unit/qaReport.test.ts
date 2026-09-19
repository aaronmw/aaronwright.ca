import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  compare,
  completeness,
  config,
  configHash,
  median,
  sourceHash,
} from '../../scripts/qa/report.mjs'

function completeRun() {
  return {
    schema: 1,
    mode: 'release',
    configHash,
    buildId: 'production-build',
    environment: { browserVersion: 'chromium-1', cpu: 'test-cpu' },
    checks: { unit: true, browser: true },
    errors: [],
    samples: config.profiles.flatMap((profile: { id: string }) =>
      config.tasks.flatMap((task: string) =>
        Array.from({ length: config.repetitions }, (_, index) => ({
          profile: profile.id,
          task,
          repetition: index + 1,
          durationMs: 1000,
          maxLongTaskMs: 100,
          maxLongFrameMs: 100,
          frameGapP95Ms: 20,
        })),
      ),
    ),
  }
}

describe('release QA evidence', () => {
  it('keeps source evidence stable when additions and deletions are staged', () => {
    const directory = mkdtempSync(join(tmpdir(), 'portfolio-qa-'))
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: directory })
    try {
      git('init', '--quiet')
      writeFileSync(join(directory, 'keep.txt'), 'keep')
      writeFileSync(join(directory, 'remove.txt'), 'remove')
      const unstaged = sourceHash(directory)
      git('add', '.')
      expect(sourceHash(directory)).toBe(unstaged)
      unlinkSync(join(directory, 'remove.txt'))
      const deleted = sourceHash(directory)
      expect(deleted).not.toBe(unstaged)
      git('add', '-u')
      expect(sourceHash(directory)).toBe(deleted)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('compares medians, allowing one noisy repetition without moving the baseline', () => {
    const baseline = completeRun()
    const run = completeRun()
    run.samples[0].durationMs = 10_000
    expect(compare(run, baseline)).toEqual([])
    expect(baseline.samples[0].durationMs).toBe(1000)
    expect(median([5, 1, 3])).toBe(3)
  })

  it('blocks sustained regressions beyond relative and absolute noise allowances', () => {
    const run = completeRun()
    run.samples[0].durationMs = 1400
    run.samples[1].durationMs = 1500
    expect(compare(run, completeRun()).join('\n')).toContain(
      'durationMs 1400.0 > 1300.0',
    )
  })

  it('rejects missing, duplicated, and invalid measurements instead of treating them as zero', () => {
    const run = completeRun()
    run.samples.pop()
    run.samples[1].repetition = run.samples[0].repetition
    run.samples[0].frameGapP95Ms = Number.NaN
    const errors = completeness(run).join('\n')
    expect(errors).toContain('Incomplete sample matrix')
    expect(errors).toContain('Missing repetitions')
    expect(errors).toContain('Invalid metric')
  })

  it('requires a baseline, completed functional checks, and matching conditions', () => {
    const run = completeRun()
    expect(compare(run, null).join('\n')).toContain('No accepted baseline')
    run.checks.browser = false
    expect(compare(run, completeRun()).join('\n')).toContain(
      'cross-browser checks did not pass',
    )
    run.environment.browserVersion = 'changed'
    expect(compare(run, completeRun()).join('\n')).toContain(
      'environment changed',
    )
    run.configHash = 'changed'
    expect(completeness(run).join('\n')).toContain('configuration changed')
    run.mode = 'diagnostic'
    expect(completeness(run).join('\n')).toContain('cannot authorize a release')
  })
})
