import { readFileSync, readdirSync, existsSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compare, completeness, sourceHash } from './report.mjs'

process.chdir(resolve(import.meta.dirname, '../..'))
const [mode = 'check', path] = process.argv.slice(2)
if (
  !['check', 'baseline'].includes(mode) ||
  process.argv.length > (mode === 'baseline' ? 4 : 3)
)
  throw new Error(
    'Usage: pnpm qa:check OR pnpm qa:baseline qa/results/<run>.json',
  )
const read = path => JSON.parse(readFileSync(path, 'utf8'))
if (mode === 'baseline') {
  if (!path?.startsWith('qa/results/') || !path.endsWith('.json'))
    throw new Error(
      'Choose a recorded qa/results/*.json run to accept explicitly.',
    )
  const report = read(path)
  const problems = completeness(report)
  if (report.sourceHash !== sourceHash())
    problems.push('The checkout changed since this run.')
  if (!report.environment || !report.buildId)
    problems.push('Missing production build/environment evidence.')
  if (problems.length)
    throw new Error(`Cannot accept this baseline:\n${problems.join('\n')}`)
  copyFileSync(path, 'qa/baseline.json')
  console.log(
    `Accepted ${path}. Commit qa/baseline.json and the run with the tested changes.`,
  )
} else {
  if (!existsSync('qa/results') || !existsSync('qa/baseline.json'))
    throw new Error(
      'Release blocked: run pnpm qa:run and explicitly accept the first complete baseline.',
    )
  const reports = readdirSync('qa/results')
    .filter(file => file.endsWith('.json'))
    .sort()
  if (!reports.length) throw new Error('Release blocked: no QA report.')
  const report = read(`qa/results/${reports.at(-1)}`)
  const failures = compare(report, read('qa/baseline.json'))
  if (report.sourceHash !== sourceHash())
    failures.push(
      'QA evidence does not match this checkout. Run pnpm qa:run again.',
    )
  if (!report.buildId) failures.push('Missing production build evidence.')
  if (failures.length)
    throw new Error(`Release blocked:\n${failures.join('\n')}`)
  console.log(
    `Release QA passed for ${report.id} (${report.sourceHash.slice(0, 12)}).`,
  )
}
