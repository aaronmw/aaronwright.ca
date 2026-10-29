# Staged grid release verification — October 28, 2026

## Contract and preserved reference

Publish `/grid-version` on the existing site while `/` continues to redirect to
`/work`. The immutable published reference and rollback target is
`6abfdf405a2b121236f0bbbc`, published October 2. Its app source matches the
committed app source at `b9fcafc3b23b9eea96d9d73eb8b1ef152f027a67` (no app,
component, library, style, or public-asset changes since the October 2 release
commit). The published Informal Systems video was streamed and its SHA-256
matched the committed 6,182,592-byte original.

Legacy content, slugs, share cards, media and fonts are restored. The grid owns
its new biography, identifiers and video URLs. Shared list and seek controls keep
legacy defaults; grid presentation is explicit, including portal and transition
roots. The grid has ten authored projects and opens each project's single cover;
browser history is its navigation contract. It has no slide navigation or zoom.
The grid remains unlisted and noindex, publicly accessible without authentication.

## Retained attempts and actual defects

- [First attempt](../../qa/results/2026-10-28T22-45-30-925Z.md): browser launch
  failed because upgraded Playwright binaries were not installed. No performance
  samples were collected. One packing test grouped 24 geometry configurations
  under a single five-second timeout; splitting by viewport preserves the full
  matrix, all assertions, and the same per-test timeout.
- [Second attempt](../../qa/results/2026-10-28T22-47-40-450Z.md): production build
  and 261 unit checks passed. Browser matrix: 132 passed, 14 failed, 14 declared
  capability skips. All existing-portfolio and eight published-reference
  comparison scenarios passed. All 72 performance samples were collected.
- The new grid checks exposed a real WebKit React maximum-update-depth error:
  `getSnapshot` serialized a video's continuously advancing `currentTime` on
  every React read. The new event-backed store caches snapshots between media
  events, handles late video mounting, and removes its subscriptions. Focused
  unit checks cover stable reads, event updates and cleanup.
- Keyboard return focus was blurred unconditionally and cold direct-link exits
  could restore focus while the tile was still inert. The grid now preserves
  keyboard focus and waits for inert removal before restoration. The route test
  also waits until its opening target becomes interactive before sending Enter.
- Segmented background loops briefly pause while seeking. The playback check
  now observes every distinct project's video playing with loaded frames,
  muted and inline, within the existing bounded observation window. It does not
  require all nine independent seek cycles to align at one instant. The same
  assertion applies after viewer close; all nine must pause while the viewer is
  open. No existing portfolio assertion was weakened.
- [Third attempt](../../qa/results/2026-10-28T23-11-02-983Z.md): 265 unit checks
  passed and the previous focus/history/WebKit React errors were resolved. The
  remaining failure was the Informal grid loop on WebKit. A bounded inspection
  measured `duration = 21.905216666666668` in WebKit versus `21.905217` in
  Chromium, while the saved endpoint is `21.905217`. Strict validation rejected
  the sub-microsecond difference. Runtime segment resolution now clamps an
  endpoint overshoot of at most one microsecond to the actual duration, without
  mutating saved data. Unit checks retain rejection of genuinely invalid ranges,
  including a segment starting at or beyond the duration. The failed run was
  stopped through Bootstrapper; its incomplete receipt is retained and cannot
  authorize release (143 browser passes, three video failures, 14 declared skips,
  four samples before interruption). The specific WebKit video check then passed
  against the existing development server without restarting it. This is focused
  diagnostic evidence, not the production receipt. The complete production
  candidate comparison follows this actual fix.

Paired desktop and phone screenshots cover `/work`, About, Informal Systems and
NextPhrase, in light and dark appearances. Automated comparisons check text,
routes, backgrounds, typography and list geometry. Inspected desktop/phone pairs
match in content, layout and media framing; image-loading progress borders can
differ between local and remote assets.
Bulk screenshots, browser reports, and build output remain in ignored
`test-results/qa/<run>/` directories. Browser checks also test client navigation
between the grid and the legacy portfolio for persistent styling leakage.

## Performance environment triage and bounded reference

The accepted historical receipt used Chromium 151.0.7922.34 and macOS kernel
25.6.0. The installed release toolchain uses Chromium 156.0.8078.4 and kernel
27.0.0. CPU (Apple M1 Pro, ten cores) and Node 22.23.2 are unchanged. The gate
correctly refuses this environment mismatch; old and new samples cannot establish
a regression or ordinary variation. No baseline, metric, budget or prior release
exception has been applied to make this release pass.

The bounded comparison uses the committed published app in the managed
`grid-release-reference` worktree, with only Playwright upgraded to 1.64.1.
Its lockfile preserves the original application dependency resolutions, including
Next 16.3.1, React 19.2.8, React Aria 1.20.0 and Next's PostCSS 8.5.23.
The obsolete root `overrides` field is removed because pnpm 11 ignores it;
workspace overrides and runtime resolution are unchanged. The measured task
code, profiles, repetitions and allowances are identical. This reference is
measured once, then the candidate is measured with the same browser and host.
Both full reports are retained; reference acceptance requires Aaron's review.

Bootstrapper manages the reference through a temporary `qa:reference` package
script forwarding to the worktree's existing `qa:run`. The temporary entry is
removed once the managed child starts. Each QA runner owns its OS-assigned
loopback server and cleans it up. The existing development server is untouched.
No other build or test runs concurrently with performance sampling.

Relevant primary sources:

- [Playwright browser versions](https://playwright.dev/docs/browsers) require
  matching installed binaries for each Playwright version.
- [Playwright executable-path guidance](https://playwright.dev/docs/api/class-browsertype)
  cautions against substituting a mismatched browser executable; doing so is not
  a valid way to retain the old environment fingerprint.
- [React external stores](https://react.dev/reference/react/useSyncExternalStore)
  require unchanged snapshots to be cached between store updates, supporting the
  video-state correction rather than suppressing React's error.
- [Long animation frames](https://developer.chrome.com/docs/web-platform/long-animation-frames)
  are reported above 50 ms. A zero observation is not zero browser work, and these
  lab metrics are not an INP score or a universal experience threshold.

Release remains blocked until a complete candidate passes against an explicitly
reviewed comparable reference, `pnpm qa:check` is fresh, and the decision audit is
reviewed. Netlify publishing must be locked before pushing main so an automatic
build cannot publish before the controlled release.

### Completed reference and preliminary comparison

[Reference run](../../qa/results/2026-10-28T23-03-52-572Z.md): original published
app, all unit checks and 106 browser scenarios passed, 14 declared capability
skips, all 72 timing samples, no journey errors. Its source hash is fresh in the
reference worktree. It is complete and eligible for review, but is not accepted
as the baseline. The [exact test-toolchain patch](2026-10-28-reference-toolchain.patch)
records its only source differences from HEAD.

Comparing the earlier, functionally failing candidate against this reference
reveals these preliminary performance misses:

| Profile / task / metric | Reference median (repetitions) | Candidate median (repetitions) | Limit | Change |
| --- | --- | --- | --- | --- |
| Small laptop / horizontal gesture / longest animation frame | 0 ms (59.2, 0, 0) | 50.3 ms (50.5, 0, 50.3) | 50 ms | +50.3 ms; percentage undefined from zero |
| Phone portrait / cold entry / p95 frame gap | 66.7 ms (66.7, 100, 66.6) | 100 ms (100, 100, 83.4) | 86.7 ms | +33.3 ms, +49.9% |
| Phone landscape / cold entry / p95 frame gap | 50 ms (66.6, 50, 50) | 83.3 ms (83.4, 83.3, 50.1) | 65 ms | +33.3 ms, +66.6% |

The gesture miss is 0.3 ms above its limit, around the Long Animation Frames
reporting threshold; the reference also has one 59.2 ms observation. This suggests
threshold sensitivity, not proof of harmless noise (medium confidence). The cold
entry gaps warrant more attention. The first portrait samples contain 81 reference
and 80 candidate animation frames, with five gaps over 50 ms in each. The p95
selects approximately the fifth-largest gap, not a broad steady-state frame rate.
The reference itself records a 100 ms portrait repetition. These observations do
not explain away the elevated candidate medians.

Changed-code inspection: the legacy gesture handling, startup orchestration,
geometry observer and measured task boundaries are unchanged. The global CSS
grows to support the new shared variants, and upgraded Next, React, React Aria
and CSS tooling can change startup/rendering cost. The extracted scrubber preserves
its default markup and does not subscribe to buffer events in the legacy app.
Grid code and its font are route-local; the new focus and video-store fixes do not
run on `/work`. These are plausible startup contributors, not demonstrated causes.
The recording code uses the same continuous rAF sampler and native observers in
both runs; no observer change accounts for the difference.

The Playwright and Long Animation Frames primary sources above support matching
the browser and interpreting thresholded measurements. They supply no universal
safe fluctuation allowance. Classification: cold entry is inconclusive, with a
possible dependency/CSS startup effect (medium confidence). The predeclared next
step is the single complete candidate run after the actual grid defects are fixed,
following the reference in order. Retain every result. If matched timing misses
persist, investigate that specific path before another full run; do not repeat
until green or raise the budgets.

### Complete candidate: functional pass, performance blocked

[Candidate run](../../qa/results/2026-10-28T23-17-33-371Z.md) is fresh and complete:
266 unit checks, 146 browser passes, 14 unchanged capability skips, no browser
failures or retries, and all 72 timing samples without journey errors. TypeScript
and diff checks pass. React Doctor remains 92/100; its two unchanged warnings
concern the development editor's component size and complexity.

The gate still rejects the historical environment mismatch. Comparing against
the new published-source reference additionally reveals 13 timing misses:

| Profile / task / metric | Reference median (repetitions) | Candidate median (repetitions) | Limit | Absolute / relative increase |
| --- | --- | --- | --- | --- |
| small-laptop-slow / cold-entry / maxLongTaskMs | 263.0 (273.0, 263.0, 255.0) | 402.0 (399.0, 463.0, 402.0) | 341.9 | +139.0 ms / 52.9% |
| small-laptop-slow / cold-entry / frameGapP95Ms | 66.6 (66.7, 50.1, 66.6) | 100.0 (100.0, 116.7, 100.0) | 86.6 | +33.4 ms / 50.2% |
| small-laptop-slow / choose-project / maxLongTaskMs | 0.0 (0.0, 0.0, 0.0) | 57.0 (57.0, 58.0, 55.0) | 50.0 | +57.0 ms / undefined |
| small-laptop-slow / horizontal-gesture / maxLongFrameMs | 0.0 (59.2, 0.0, 0.0) | 68.9 (65.3, 74.1, 68.9) | 50.0 | +68.9 ms / undefined |
| small-laptop-slow / appearance / maxLongFrameMs | 101.8 (101.6, 108.4, 101.8) | 156.2 (195.3, 154.0, 156.2) | 151.8 | +54.4 ms / 53.4% |
| small-laptop-slow / appearance / frameGapP95Ms | 83.3 (83.3, 83.3, 66.6) | 116.6 (100.1, 116.6, 133.3) | 108.3 | +33.3 ms / 40.0% |
| phone-portrait-slow / cold-entry / maxLongTaskMs | 179.0 (179.0, 183.0, 175.0) | 267.0 (267.0, 255.0, 274.0) | 232.7 | +88.0 ms / 49.2% |
| phone-portrait-slow / cold-entry / frameGapP95Ms | 66.7 (66.7, 100.0, 66.6) | 100.0 (83.4, 116.8, 100.0) | 86.7 | +33.3 ms / 49.9% |
| phone-portrait-slow / appearance / frameGapP95Ms | 83.3 (83.3, 83.3, 66.7) | 116.7 (116.7, 116.7, 83.3) | 108.3 | +33.4 ms / 40.1% |
| phone-landscape-slow / cold-entry / maxLongTaskMs | 281.0 (278.0, 292.0, 281.0) | 387.0 (387.0, 393.0, 387.0) | 365.3 | +106.0 ms / 37.7% |
| phone-landscape-slow / cold-entry / frameGapP95Ms | 50.0 (66.6, 50.0, 50.0) | 66.7 (66.6, 66.7, 66.7) | 65.0 | +16.7 ms / 33.4% |
| phone-landscape-slow / choose-project / frameGapP95Ms | 16.8 (16.8, 16.8, 16.8) | 33.3 (16.8, 33.3, 33.3) | 26.8 | +16.5 ms / 98.2% |
| phone-landscape-slow / appearance / frameGapP95Ms | 83.3 (83.4, 83.3, 66.7) | 116.7 (116.6, 116.7, 133.3) | 108.3 | +33.4 ms / 40.1% |

Cold-entry samples contain 88–96 laptop, 92–95 portrait and 90–94 landscape
frames. Appearance samples contain 24–30 frames, so p95 is approximately the
second-largest gap and is sensitive to one or two delayed frames. This does not
waive any limit. No task-duration median exceeds its budget.

At 17:24:49 during candidate sampling, host load was 6.29 (versus 2.15 at the
initial idle check), with 49.75% CPU idle. Alongside the owned QA renderer at
99.1% CPU, WindowServer was 73.1%, Chrome GPU 52.7%, Chrome renderer 27.8%,
Figma renderer 21.5%, and Codex renderer 18.7%. No user process was stopped.
This is evidence of competing work, not proof that all misses are environmental.

The legacy startup, gesture and theme implementations remain unchanged. The
built /work entry assets grow only from 139,992 to 140,136 CSS bytes and from
1,453,109 to 1,459,256 JavaScript bytes (11 to 13 scripts); gzip totals grow by
147 CSS bytes and 5,194 JS bytes. This argues against a large grid payload leaking
onto /work, while dependency execution/scheduling remains a plausible cause.
The earlier candidate had only three matched timing misses; changes since then
fix grid-only behavior, so host effects deserve a controlled comparison.

[Lighthouse's resource-contention guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
confirms that other apps and DevTools throttling can affect lab results, and
recommends repeated, isolated measurements. It provides no acceptable noise
percentage for this site's custom metrics. Classification: suspected environment
effect with possible dependency regression, medium confidence.

Bounded next step: one alternating A/B diagnostic using the already-built
published reference and candidate, identical Chromium/profile/task code, fresh
contexts with cache disabled, three repetitions per build for laptop and portrait
cold entry and appearance. Order is reference/candidate, candidate/reference,
reference/candidate within each profile. Unselected journeys are omitted equally
for both builds, so these are diagnostic samples, not release receipts and not
direct replacements for full-journey appearance baselines. Retain all results;
no baseline acceptance, budget change, or further full scan follows automatically.

### Alternating diagnostic result and quiet rerun

The [24-sample diagnostic](2026-10-28-matched-diagnostic.json) completed without
errors. Its [runner](2026-10-28-matched-diagnostic.mjs.txt) and both build IDs are
retained. Values below are duration / longest task / longest animation frame /
p95 frame gap, in milliseconds (medians of three repetitions):

| Profile / task | Published reference | Candidate |
| --- | --- | --- |
| small-laptop-slow / cold-entry | 5677.2 / 425.0 / 2245.7 / 116.6 | 5576.9 / 399.0 / 2512.5 / 100.0 |
| small-laptop-slow / appearance | 912.5 / 175.0 / 226.0 / 83.3 | 826.1 / 138.0 / 180.0 / 66.6 |
| phone-portrait-slow / cold-entry | 5144.0 / 250.0 / 2242.1 / 100.0 | 5360.2 / 253.0 / 2531.3 / 100.0 |
| phone-portrait-slow / appearance | 789.8 / 116.0 / 135.7 / 83.4 | 859.8 / 113.0 / 132.5 / 100.1 |

The unchanged published app also slowed substantially from its earlier full run.
The alternating comparison establishes run-to-run drift in the unchanged app;
it does not identify the cause of that drift or replace a release
receipt. No code optimization, baseline acceptance or budget change follows from
this diagnostic. Aaron explicitly confirmed he can leave the Mac idle for about
ten minutes. Predeclared next step: one complete candidate QA run under that
quiet condition, compared to the original published-source reference. Preserve
both failed candidate reports and the new result regardless of outcome.

### Quiet-period result and release disposition

[Final run](../../qa/results/2026-10-28T23-32-02-297Z.md) repeats the functional
pass: 266 units, 146 browser passes, 14 unchanged capability skips, zero browser
failures/retries and 72 samples without journey errors. Its source fingerprint
`e26f8acbec09f27de1c95c8ad3589b37886a9441e27febba5705116d382343a7` matches the current checkout.

The existing accepted baseline remains unchanged. Actual `pnpm qa:check`
rejects its old browser/OS environment. Explicit comparison with the unaccepted
published-source reference additionally fails these 16 unchanged limits:

| Profile / task / metric | Reference median (repetitions; frame counts) | Candidate median (repetitions; frame counts) | Limit | Absolute / relative increase |
| --- | --- | --- | --- | --- |
| desktop / cold-entry / maxLongFrameMs | 246.3 (412.0 [34 frames], 246.3 [31 frames], 241.8 [32 frames]) | 343.1 (333.5 [34 frames], 343.1 [32 frames], 343.9 [33 frames]) | 320.2 | +96.8 ms / 39.3% |
| small-laptop-slow / cold-entry / maxLongTaskMs | 263.0 (273.0 [103 frames], 263.0 [104 frames], 255.0 [107 frames]) | 388.0 (356.0 [89 frames], 402.0 [90 frames], 388.0 [94 frames]) | 341.9 | +125.0 ms / 47.5% |
| small-laptop-slow / cold-entry / frameGapP95Ms | 66.6 (66.7 [103 frames], 50.1 [104 frames], 66.6 [107 frames]) | 100.0 (49.9 [89 frames], 100.1 [90 frames], 100.0 [94 frames]) | 86.6 | +33.4 ms / 50.2% |
| small-laptop-slow / choose-project / frameGapP95Ms | 16.8 (16.8 [94 frames], 16.8 [93 frames], 16.8 [95 frames]) | 33.3 (16.8 [97 frames], 33.3 [96 frames], 33.3 [96 frames]) | 26.8 | +16.5 ms / 98.2% |
| small-laptop-slow / horizontal-gesture / maxLongFrameMs | 0.0 (59.2 [533 frames], 0.0 [540 frames], 0.0 [544 frames]) | 64.5 (64.5 [481 frames], 84.9 [535 frames], 63.4 [537 frames]) | 50.0 | +64.5 ms / undefined |
| small-laptop-slow / image-viewer / frameGapP95Ms | 16.8 (16.8 [114 frames], 16.8 [116 frames], 16.8 [117 frames]) | 33.3 (33.3 [119 frames], 33.3 [117 frames], 16.8 [123 frames]) | 26.8 | +16.5 ms / 98.2% |
| small-laptop-slow / appearance / frameGapP95Ms | 83.3 (83.3 [25 frames], 83.3 [23 frames], 66.6 [23 frames]) | 116.7 (133.2 [24 frames], 116.7 [23 frames], 66.7 [23 frames]) | 108.3 | +33.4 ms / 40.1% |
| phone-portrait-slow / cold-entry / maxLongTaskMs | 179.0 (179.0 [81 frames], 183.0 [78 frames], 175.0 [80 frames]) | 250.0 (258.0 [93 frames], 231.0 [95 frames], 250.0 [92 frames]) | 232.7 | +71.0 ms / 39.7% |
| phone-portrait-slow / cold-entry / frameGapP95Ms | 66.7 (66.7 [81 frames], 100.0 [78 frames], 66.6 [80 frames]) | 116.6 (83.3 [93 frames], 116.6 [95 frames], 116.6 [92 frames]) | 86.7 | +49.9 ms / 74.8% |
| phone-portrait-slow / choose-project / maxLongFrameMs | 0.0 (57.8 [96 frames], 0.0 [98 frames], 0.0 [97 frames]) | 56.5 (0.0 [98 frames], 56.6 [94 frames], 56.5 [96 frames]) | 50.0 | +56.5 ms / undefined |
| phone-portrait-slow / image-viewer / frameGapP95Ms | 16.8 (16.8 [120 frames], 16.8 [118 frames], 16.8 [121 frames]) | 33.3 (16.8 [121 frames], 33.3 [119 frames], 33.3 [117 frames]) | 26.8 | +16.5 ms / 98.2% |
| phone-portrait-slow / appearance / frameGapP95Ms | 83.3 (83.3 [28 frames], 83.3 [30 frames], 66.7 [29 frames]) | 116.6 (116.7 [28 frames], 100.0 [27 frames], 116.6 [26 frames]) | 108.3 | +33.3 ms / 40.0% |
| phone-landscape-slow / cold-entry / maxLongTaskMs | 281.0 (278.0 [106 frames], 292.0 [112 frames], 281.0 [107 frames]) | 436.0 (375.0 [89 frames], 477.0 [97 frames], 436.0 [96 frames]) | 365.3 | +155.0 ms / 55.2% |
| phone-landscape-slow / cold-entry / frameGapP95Ms | 50.0 (66.6 [106 frames], 50.0 [112 frames], 50.0 [107 frames]) | 100.0 (66.7 [89 frames], 100.0 [97 frames], 116.7 [96 frames]) | 65.0 | +50.0 ms / 100.0% |
| phone-landscape-slow / choose-project / maxLongFrameMs | 0.0 (0.0 [98 frames], 0.0 [98 frames], 0.0 [98 frames]) | 51.2 (52.9 [115 frames], 51.2 [93 frames], 50.2 [97 frames]) | 50.0 | +51.2 ms / undefined |
| phone-landscape-slow / appearance / frameGapP95Ms | 83.3 (83.4 [27 frames], 83.3 [28 frames], 66.7 [29 frames]) | 116.8 (133.3 [24 frames], 116.6 [28 frames], 116.8 [26 frames]) | 108.3 | +33.5 ms / 40.2% |

Aaron left the Mac idle as requested. Background activity remained substantial:
at 17:38:47, load was 8.57 and CPU idle 48.38%; alongside the owned QA renderer,
WindowServer used 61.9%, Chrome GPU 47.2%, Chrome renderer 29.2%, Figma renderer
17.1%, Spotlight updater 24.9%, and Bootstrapper 33.2%. These process percentages
are per-core observations, not shares of the entire ten-core machine. The quiet
period still produced different timings from the earlier reference. These CPU
observations do not prove saturation or that particular apps caused the slowdown.
Host effects, measurement effects and application/dependency effects remain open.

Release disposition: blocked. No baseline or budget changes, commits, pushes or
Netlify publications were made. All owned QA/diagnostic servers have exited; the
original development run remains unchanged. The reference worktree is retained
for later baseline review. Further work must identify the cost before another
full release run; asking Aaron to close apps is not a demonstrated prerequisite.

### Attribution correction and focused startup profile

Aaron reports that nothing CPU-heavy is running. At 20:06 on October 28, the Mac
was approximately 72% CPU idle, on AC power, with no recorded thermal or performance
warning. The earlier process CPU percentages represented fractions of individual
cores, not fractions of all ten cores. Describing Chrome/Figma as the cause, or
requiring them to close before investigation, exceeded the evidence. The earlier
matched diagnostic demonstrates drift in an unchanged build, not its cause.

The current bounded investigation captures one cold-entry CPU/rendering trace per
already-built version, on the existing small-laptop profile. It uses the same
task action and throttling configuration and records native long-frame script
attribution and resource timings. Trace overhead means these timings are diagnostic
only and cannot replace untraced release/baseline samples. No app closure, budget
change, baseline acceptance or full QA rerun is part of this diagnostic.

The [profile summary](2026-10-28-startup-profile.json) and
[runner](2026-10-28-startup-profile.mjs.txt) are retained. Both captures completed
without browser errors, using unchanged production build artifacts. Raw Chrome
traces remain in ignored `test-results/grid-startup-profile/`.

| Small-laptop cold entry, traced | Published reference | Candidate |
| --- | ---: | ---: |
| Total measured duration | 5518.2 ms | 5403.8 ms |
| Longest task | 362 ms | 353 ms |
| Longest animation frame | 2378.6 ms | 2506.1 ms |
| p95 frame gap | 100.1 ms | 83.3 ms |

The largest CPU task in both builds is a React scheduler MessagePort callback
during hydration, including 162.2 ms reference / 151.7 ms candidate of forced
style/layout. This sample does not show added candidate startup CPU cost.
The largest animation-frame observation is a different interval: it starts well
before first rendering and has only 23 ms reference / 3.9 ms candidate of reported
blocking duration. Both pages also load external Font Awesome CSS, taking about
2.0/2.2 seconds in these captures. This distinguishes wall-clock startup/rendering
delay from CPU saturation; the network timings alone do not establish causation.

The earlier **untraced** alternating control is especially relevant: the unchanged
published app's laptop cold-entry longest-task median rose from 263 to 425 ms,
while its candidate comparison was 399 ms. The source had not changed. Therefore
the older reference's failure to predict later measurements cannot itself prove
that the new application regressed. These findings do not clear all sixteen
release misses, validate every journey, or authorize a replacement baseline.

Updated disposition: functional checks remain passed; release QA remains blocked
by an unresolved reference/measurement comparison. CPU saturation and attribution
to Aaron's apps are unproven. App closure is not a prerequisite. Further calibration
must control reference/candidate run conditions and examine resource/rendering
timings; avoid another unchanged full scan until that method is established.
The candidate source fingerprint and existing receipt remain unchanged.
