# Paired environment calibration — October 29, 2026

## Decision before measuring

The accepted baseline was measured on Chromium 151 / Darwin 25.6.0. The current
toolchain uses Chromium 156 / Darwin 27.0.0. An environment recalibration is
required independently of whether the candidate is faster or slower. The earlier
unaccepted reference is not stable across time: its unchanged published source
showed a laptop cold-entry longest-task median of 263 ms in the initial full run
and 425 ms in the later alternating diagnostic. The startup profile did not
identify added candidate hydration CPU cost. These observations justify matching
the measurement period, not blaming other applications or relaxing thresholds.

The QA runner now accepts an explicit published-source checkout. It rebuilds and
runs that checkout's original unit/browser checks, then rebuilds and runs the
candidate's complete checks including grid/isolation coverage. After all checks,
one Chromium process runs the unchanged six-task journey in fresh contexts for
both builds, alternating which build goes first across the twelve profile /
repetition pairs. That gives each build six first positions and six second
positions. Both retain all 72 samples; no tracing is enabled. CPU/network
throttling, external resource behavior, three-repetition medians and every
regression allowance are unchanged. Separate owned loopback servers are cleaned
up by the runner. The existing development server is left alone.

This is one predeclared complete paired run, not repeated attempts until green.
Any failure requires evidence-led triage. Reports are preserved regardless of
outcome. The runner still evaluates each receipt against its accepted baseline;
the new paired comparison is additional evidence. No baseline is automatically
accepted. If the comparison passes, review the reference provenance and decision
audit before explicitly accepting the published-source calibration. The candidate
must then pass the unmodified `pnpm qa:check` gate.

The control is detached commit `b9fcafc3b23b9eea96d9d73eb8b1ef152f027a67` at
`/Users/aaronwright/.codex/worktrees/grid-release-reference/aaronwright-dot-ca`,
whose app/runtime matches published deployment `6abfdf405a2b121236f0bbbc`.
Only Playwright was upgraded to match the candidate's test browser. Earlier
[provenance and triage](2026-10-28-grid-release.md) and all failed reports remain.

[Lighthouse's official variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
supports serial measurement and repeated aggregates and describes browser and
network variability. The counterbalanced pairing is our experimental choice to
reduce time/order confounding; it is not a claim that Lighthouse prescribes this
exact protocol or that environmental effects have been proven as the sole cause.


## Result and targeted triage

The [candidate receipt](../../qa/results/2026-10-29T17-15-11-275Z.md) and
[published-source control](2026-10-29-paired-reference.md) are complete and fresh.
Candidate: 266 unit tests, 146 browser passes, 14 capability skips; control: 104
unit tests, 106 browser passes, 14 capability skips. Each has 72 timing samples,
zero journey errors and unchanged source/build fingerprints. Bootstrapper run
`6A6B813E-A8C4-4D00-956D-8EE742A68DD9`, log
`/Users/aaronwright/Library/Application Support/Bootstrapper/Logs/544D5DA7-B0EC-4C7D-A4DE-C4816E7CAB33.log`.
Both owned servers exited. The original development server is untouched.

Two of 96 metric comparisons fail, both cold-entry p95 frame gap:

| Profile | Reference repetitions (frames sampled; gaps >50 ms) | Candidate repetitions (frames sampled; gaps >50 ms) | Median / limit |
| --- | --- | --- | --- |
| small-laptop-slow | 66.6 (80; 7), 50.0 (109; 5), 50.0 (110; 4) | 83.4 (75; 5), 50.0 (89; 4), 83.3 (77; 5) | candidate 83.3 ms; reference 50.0 ms; limit 65.0 ms |
| phone-landscape-slow | 50.0 (109; 5), 50.1 (109; 6), 50.0 (106; 4) | 83.3 (77; 4), 50.1 (91; 5), 83.4 (71; 6) | candidate 83.3 ms; reference 50.0 ms; limit 65.0 ms |

The increase is 33.3 ms / 66.6%. All task-duration, longest-task and
longest-animation-frame comparisons pass. Laptop startup duration actually drops
from 4922.1 to 4642.2 ms; landscape drops from 4906.7 to 4640.0 ms. The candidate
has fewer sampled frames and a similar number of slow gaps, which makes the
whole-startup percentile sensitive to how many ordinary frames occur before the
ready condition. This observation does not waive the two failures.

Changed-code inspection confirms identical four font preloads, external icon CSS
URLs, legacy startup/ready logic, and task definitions. Shared changes are optional
list variants, added icon names/tokens and a scrubber extraction with old defaults;
the runtime dependency upgrades can still affect loading/scheduling. The prior
native Chrome profile distinguishes a multi-second pre-render interval from CPU
blocking. [Chrome's Long Animation Frames documentation](https://developer.chrome.com/docs/web-platform/long-animation-frames)
explains that frame duration and blocking duration differ; the existing rAF
percentile is a separate lab metric. Neither source supports dismissing a failed
budget based only on faster total duration.

Next bounded diagnostic: two cold-entry repetitions for both builds on laptop and
landscape (eight samples), alternating build order. Record individual rAF gaps,
paint, resource, font-readiness and long-frame timestamps without Chrome tracing.
This will locate the divergent intervals and determine whether added blocking or
a changed sampling window accounts for the two failures. No complete scan,
baseline acceptance or budget change follows automatically.


### Frame diagnostic

[Eight cold-entry captures](2026-10-29-frame-diagnostic.json) and their
[runner](2026-10-29-frame-diagnostic.mjs.txt) are retained. Bootstrapper run
`FC20EB28-4EEF-4B15-A048-A5CD6EF4838C` exited and cleaned up both servers. No browser
errors occurred. Laptop p95 samples are reference 83.3 / 50.0 ms versus candidate
66.7 / 50.1 ms; landscape is reference 50.0 / 50.0 ms versus candidate 33.3 / 83.4 ms.
These diagnostic samples cannot replace the complete receipt.

Slow intervals concentrate during script evaluation/hydration before portfolio
content appears. Both builds have roughly the same final 250 ms hydration frame.
The candidate's initial render begins around 2.67 seconds, versus 2.42 seconds
for the warmed reference, while content appears around 4.15 versus 4.10 seconds.
The percentile after content paint is approximately 16.7 ms for both builds, but
changing the gate to that window would exclude the CSS startup loader and is not
an acceptable unreviewed shortcut. No gate was changed.

The script/resource waterfall differs between the upgraded candidate and old
published runtime. To distinguish dependency effects from grid/shared-component
changes, the next bounded control uses published application source with the
candidate package/lock/workspace dependency files. Build it in a separate managed
worktree, then run three cold-entry repetitions on laptop and landscape for all
three builds (18 samples), rotating their order. This remains diagnostic only.


### Dependency isolation result and bundle experiment

The [18-sample dependency control](2026-10-29-dependency-diagnostic.json) has zero
browser errors. Median cold-entry p95 is 50 ms for both the original and upgraded
published app on both profiles. The complete candidate is 83.4 ms laptop and
83.3 ms landscape. The selected upgrades alone do not reproduce the difference.
All three sources/builds and samples remain recorded. Bootstrapper run
`567D6B74-3722-4BBE-A943-8D985A25666D` cleaned up all three servers; log
`/Users/aaronwright/Library/Application Support/Bootstrapper/Logs/FB4DDBBB-4A82-40E2-9F44-C9F9EC2E2811.log`.

The upgraded control sends 11 startup JavaScript files; integrating the grid
splits the same legacy dependency graph into 13. Candidate script evaluation and
first-render timing differ despite similar total payload and hydration CPU cost.
This points to bundle grouping as a specific optimization target, not a reason
to remove the upgrades or relax performance thresholds.

Next.js 16.4.2's installed official documentation
`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopackChunking.md`
documents `experimental.turbopackChunking.priorityRoutes`: prefer merging bundles
for common first-entry routes, trading some cross-route cache reuse for fewer
startup requests. `/work` is the production landing route, while the grid is
unlisted and separately entered. Test that explicit priority with the default
boost in the disposable dependency-control worktree, now repurposed with the
candidate sources. Inspect the output before any timing test. No changes to the
main app/configuration, accepted baseline or measurement budgets have been made.


### Concrete observation defect and correction

The bundle experiment is rejected: route priority and caps of ten/five did not
change the 13-script output; allowing larger merges reduced it to 12 but increased
startup to about 5.2 seconds. That is not a useful optimization. No experimental
bundle setting is adopted in the main checkout. Its [diagnostic](2026-10-29-bundle-diagnostic.json)
is retained, including both builds' twelve samples and zero errors.

The frame-level evidence reveals a concrete QA defect. The ready-state assertion
uses Playwright's locator retry backoff, which in installed 1.64.1 is
`[20, 50, 100, 100, 500]` and repeats 500 ms thereafter. Verified in the official
installed source `playwright-core/lib/coreBundle.js`, `Frame.expect` and
`retryWithProgressAndBackoff` (lines 25560 and 25279). This differs from the generic
`expect.poll` defaults; the locator implementation is the relevant evidence.

The frame diagnostic records a reference ready transition at 4250.4 ms but task
completion at 4982.8 ms, a 732.4 ms tail. Another reference becomes ready at
4049.8 ms and completes at about 4365 ms, a roughly 315 ms tail. Candidate examples
have roughly 410–465 ms tails. All have the same required 200 ms geometry-settlement
window. Those extra polling delays add different numbers of idle frames to the
same percentile, independent of the application's ready time or blocking work.

Correction: observe the *same* readiness attribute using
`page.waitForFunction(..., { polling: 'raf', timeout: 45000 })`, then retain all
existing visible-ready, loader-absent, chrome-opacity, menu-visible and settled
geometry assertions. No metric, limit, repetition count or functional completion
condition changes. This removes test-induced waiting; it does not discard slow
startup frames, hide the CSS loader, add idle samples or redefine completion.
The published source uses identical instrumentation. The QA configuration hash
therefore changes and old receipts cannot authorize the new protocol.

Before another complete run, perform twelve cold-entry diagnostic samples on the
two affected profiles, recording readiness timestamps and the unmodified metrics.
Retain the entire result. If it validates consistent observation and no new
blocking cost, run the complete paired release matrix once on the final sources.


The [first observer diagnostic](2026-10-29-ready-poll-diagnostic.json) confirms
that the long retry tail disappeared: reference/candidate readiness-to-completion
are now roughly 299–365 ms. Landscape medians match at 50/50.1 ms; laptop is
50.1/66.7 ms, still narrowly above the old relative allowance (65.1 ms). The
remaining approximately 100–165 ms beyond the required geometry settlement also
includes four sequential assertion protocol round trips. Those are verification
work, not application completion.

The final correction therefore observes *all* existing visible-ready conditions
on a frame, awaits the same geometry stability, captures the metrics, and then
runs all original functional assertions. A failed verification prevents the
sample from being accepted and blocks the release. Slow frames throughout startup
remain included. This measures the actual defined completion rather than test
assertion scheduling. The diagnostic repeats the two profiles using this final
protocol before any full release run.


The [final twelve-sample diagnostic](2026-10-29-ready-diagnostic.json) and
[runner](2026-10-29-ready-diagnostic.mjs.txt) confirm consistent completion:
ready-to-measured-end is 248–268 ms across both builds, including the unchanged
200 ms stable-geometry window. Every original functional assertion passes.
Laptops have reference/candidate p95 medians 66.7/83.3 ms (within the unchanged
86.7 ms limit). Landscape medians are 50.1/66.7 ms, still narrowly above 65.1 ms.
No diagnostic result is substituted into a release receipt or accepted baseline.

The complete final-source paired run now follows once, because the actual
measurement defect is fixed and the full visitor matrix must verify the final
QA sources. Preserve its result regardless of outcome. No further unchanged
full scan is planned. The [reference patch](2026-10-29-reference-toolchain.patch)
contains only the matched Playwright toolchain and identical QA observation /
verification code; its published application and runtime remain untouched.


The checked-in frame diagnostic JSON files are compact summaries containing every
sample, readiness marks, slow gaps and relevant resource/long-frame timings. Each
records its full raw artifact path under ignored `test-results/`; full browser
performance entries and per-frame arrays remain there rather than in Git.


## Complete corrected-observation result

[Final-source candidate](../../qa/results/2026-10-29T18-15-00-867Z.md) and
[matching reference](2026-10-29-corrected-reference.md) complete all checks and
72 samples per build with zero errors. Candidate: 266 units, 146 browser passes,
14 capability skips. Source `b43877022b9883d23d1e7d700f0bdfd85021bb6eefb9ff0d37fd195db1624eef`
is fresh. Bootstrapper run `432CCEDC-E5AA-4FAE-8C56-7D745D876055`, log
`/Users/aaronwright/Library/Application Support/Bootstrapper/Logs/59A094DD-E1FF-4A29-B2E9-AAA2A3E5B416.log`.

95 of 96 metric comparisons pass. The one remaining failure is laptop cold-entry
p95: reference 50.0 / 50.1 / 83.3 ms (83 / 81 / 79 sampled frames, 4 / 5 / 5 gaps
above 50 ms), candidate 66.7 / 100.0 / 66.7 ms (69 / 67 / 71 frames, five slow gaps
in each). Candidate median 66.7 ms exceeds the unchanged 65.13 ms limit by 1.57 ms.
The 33.1% increase over the 50.1 ms baseline reflects one display-frame interval;
it is still a failed contract, not an accepted exception. Startup duration is
4559.8 versus 4392.8 ms; longest-task medians are both 248 ms. All other profiles,
journeys and metrics pass. No accepted baseline was changed.

The changed-code and primary-source triage above still applies: adding the grid
changes production bundle grouping; dependency-only and shared CPU-work controls
do not explain an increased hydration cost. The experimental Turbopack settings
were rejected. One final bounded packaging experiment uses Next's documented
`next build --webpack` mode in the disposable candidate worktree, with unchanged
application source, dependencies and visitor protocol. It measures the two cold
profiles against the published reference (12 samples). This is a supported build
pipeline, not a measurement override. It will only be considered for release if
it improves actual startup and passes subsequent complete checks; no unchanged
full QA rerun is planned.
See [Next.js 16's supported Webpack build mode](https://nextjs.org/docs/app/guides/upgrading/version-16).


## Aaron's release decision

Aaron explicitly ended further legacy-performance optimization and instructed:
“We're working to replace that route anyway. Just ship it.” He clarified that
portfolio contents must remain unchanged and `/grid-version` should reach
production ASAP. This is a new, explicit authorization for this release; the
October 2 exception is not reused. The failed timing result and old baseline
remain recorded. No budgets or assertions are relaxed, no baseline is accepted,
and no experimental bundler setting is adopted. The normal committed Netlify
command remains `pnpm qa:check && pnpm build`. For this authorized operation only,
package locally using `pnpm build`, restore the configured gate, and publish that
package without rebuilding. Functional checks and the source fingerprint remain
required and passed. See the updated [decision audit](2026-10-28-decision-audit.md).
