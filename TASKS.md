# Release QA tasks

This is the visitor-task contract for aaronwright.ca. Humans and agents use the
same outcomes. Executable journeys live in `scripts/qa/tasks.mjs`; fixed conditions
and regression tolerances live in `qa/config.json`. Keep task IDs aligned.

## Run and ship

1. Install locked dependencies and browsers if needed:
   `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium webkit`.
2. With process authorization, run `pnpm qa:run` through Bootstrapper's supported
   project-service workflow. It builds production, starts its own temporary
   loopback child server on an **OS-assigned available port**, runs checks, writes
   results, and stops that server. It does not reuse or stop unrelated servers or
   manage the ordinary dev server. The selected URL is logged and recorded in the
   report. Keep the checkout unchanged and avoid heavy work during measurement.
3. Review `qa/results/<timestamp>.md` and its JSON, including failed runs. Commit
   these small records alongside the tested changes. Screenshots and traces/logs
   stay in ignored `test-results/qa/<timestamp>/`. Complete the quick triage below
   before repeating a full scan or handing off a performance-blocked release.
4. After the first complete run of a new contract, review the measurements and
   explicitly establish the baseline with `pnpm qa:baseline qa/results/<timestamp>.json`.
   The run remains blocked until this is done; baseline incompatibility alone is
   not a functional failure. Never accept failing/incomplete evidence or replace
   a baseline merely to make a regression pass. Record the reason for replacement.
5. `pnpm qa:check` must pass before publishing, including direct Netlify publish
   commands. It re-evaluates the **latest** report against the accepted baseline
   and current source fingerprint; an older success cannot hide a newer failure.
   Source, media, tests, TASKS.md and configuration changes require a fresh run.
   Ordinary docs and report additions do not. Commit evidence before pushing.

There is no automatic commit, push, deployment, paid service, or LLM dependency.
Both preview and production Netlify builds use the gate. A passing receipt covers
the local production build; hosting and CDN behavior still need post-deploy
observation. Build-time environment changes require a new run with those values.

QA retains the October 1 port-zero fix: `next start --hostname 127.0.0.1 --port 0`
lets the OS bind an available port atomically, then the runner reads its reported
address. See [Node's port-zero behavior](https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback).

## Grid cutover — October 29, 2026

The approved release replaces the carousel portfolio with the ten-project grid
at `/work`; `/` continues to redirect there. The old theme selector and carousel
are retired. The grid retains its dark appearance, current media, biography,
Notes typography and motion, shared presentation components, and development-only
editors. There is no database connection in this portfolio.

This is an intentional **version 3 task-contract change**. The former menu,
horizontal/vertical carousel, enlarged-image and appearance journeys do not
represent the shipped interface. Their browser suites and published-portfolio
isolation comparison are retired. Historical receipts remain evidence of their
original contracts; they cannot serve as the grid's performance baseline.

Establish a fresh baseline only after the complete grid browser suite, unit
checks and all 72 performance samples pass and their measurements are reviewed.
The existing `qa/baseline.json` stays untouched until that explicit acceptance.
All four profiles, three repetitions, measured metrics and 30%/absolute relative
budgets below remain unchanged. A new interface is the reason for the new task
fingerprint; it is not an exception for a failed or incomplete run.

The production browser matrix runs `mosaic.spec.ts`, `mosaicTransition.spec.ts`,
`mosaicRoutes.spec.ts`, and `mosaicRelease.spec.ts` in Chromium desktop, WebKit
desktop, and WebKit iPhone portrait/landscape. These cover packing and focus,
single-owner image/video transitions, native history and direct links, redirects,
metadata, Notes choreography and reversals, playback, About, and absence of editor
controls. Pointer-hover assertions run only where the device supports hover;
keyboard and touch-capable interactions retain coverage on every profile.
Development adjustment/video-editor and copy-editor tests remain available via
`pnpm test:e2e` against a development build, outside the production gate.
The standalone `/copy-editor` route returns 404 in production; the production
grid check covers that boundary too.

## Routes and visitor behavior

- `/work` is the canonical, indexable grid. Its ten project pages are
  `/work/about-me`, `/work/loopio`, `/work/freshbooks`, `/work/cycles-dot-money`,
  `/work/informal-systems`, `/work/aarons-toolbox`, `/work/nextphrase`,
  `/work/age-dot-fund`, `/work/radio-app`, and `/work/gift-exchanges`.
  NextPhrase keeps the internal `nextphrase-dot-app` identity while publishing
  `/work/nextphrase`. Canonical metadata and sitemap contain the public paths.
- `/grid-version` and `/v2` permanently redirect to `/work` or the requested
  project. Recognized legacy media/detail paths redirect to their project.
  Unknown projects and unknown media paths return 404. The obsolete query
  `slide` falls back to the project's one media item, as before.
- Redirects discard `project`, `slide`, `modal`, and `zoom`, while preserving
  unrelated query parameters, including repeated keys.
- Opening and closing a project uses native history without remounting the grid.
  Back, Forward, refresh, and direct links preserve the intended viewer state.
  Browser titles follow the selected project. Closing restores the triggering
  tile's keyboard focus. Escape closes; arrow keys do not navigate media.
- Each project has one media item. There is no image navigation or zoom.
  Inline, muted videos pause behind the viewer and resume on return. The viewer
  supports pause/resume and seeking. Clicking its video toggles playback and
  flashes a large matching pause/play icon; reaching the end pauses without a
  flash or loop.
  Reduced motion retains still posters and
  initially paused viewer video.
- Notes starts as one stroke-sized square at its control, travels rigidly to the
  panel's bottom-left, then unfolds the other three corners clockwise. Closing
  retraces that sequence. Rapid reversals must preserve the current timeline and
  settle to the final request without leaving stale inert content.
- Notes retains a 1.625 line-height. Inline prose links have no resting underline;
  hover and keyboard focus reveal it. About uses its current biography/portrait
  layout and shares the viewer's close/focus lifecycle.
- All ten packed project targets remain inside each matrix viewport, with usable
  hit targets and no page overflow. Development controls are absent in production.

## Conditions

| Profile              | Viewport   | Input | CPU slowdown | Network                                      |
| -------------------- | ---------- | ----- | ------------ | -------------------------------------------- |
| desktop              | 1440 × 900 | mouse | 1×           | unthrottled                                  |
| small-laptop-slow    | 1280 × 720 | mouse | 4×           | 1.6 Mbps down / 0.75 Mbps up, 150 ms latency |
| phone-portrait-slow  | 390 × 844  | touch | 4×           | same slow network                            |
| phone-landscape-slow | 844 × 390  | touch | 4×           | same slow network                            |

Performance journeys run serially in Chromium, three repetitions per profile,
each in a fresh context with disabled browser cache, blocked service workers,
normal motion, and dark system appearance. Phone tasks activate controls with
actual touch input, including the video seek bar. Emulation does not cover a
physical phone's GPU, thermal state, browser chrome, or ergonomics.

## Required tasks

| ID             | Visitor action                            | Required outcome                                                                                                                              |
| -------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| cold-entry     | Open `/work` with an empty cache.         | Fonts are ready; all ten packed cells have arrived, their media is ready, surfaces are visible, and controls are interactive.                 |
| open-project   | Open Loopio.                              | `/work/loopio`, completed viewer transition, ready media, and visible project Notes.                                                          |
| toggle-notes   | Hide then show Notes.                     | Both motion sequences finish; final Notes content is visible and interactive.                                                                 |
| video-controls | Pause, seek to the midpoint, then resume. | Actual media state agrees with controls; seeking completes near the requested position and playback resumes.                                  |
| close-viewer   | Close Loopio.                             | Viewer is removed, `/work` is restored, the grid is ready, and Loopio is usable again. Keyboard-open focus restoration is covered separately. |
| open-about     | Open About.                               | `/work/about-me`, completed transition, decoded portrait, and visible biography.                                                              |

Readiness is explicit UI state sampled on animation frames. It does not use
network-idle: nine background videos intentionally loop. Viewer readiness requires
its open phase, ready media and completed Notes animation. Notes readiness checks
requested expansion, settled collapse, visibility and accessible state together.

Each task then observes fixed grid/viewer/panel geometry for 200 ms. The observer
ignores video frames, playback time, segmented crop changes and infinite timelines;
those must not prevent settlement. Viewer and Notes motion expose completion
state, while restored focus-media geometry remains observable. Cold-entry uses
animation-frame readiness instead of locator retry backoff to delimit timing.
Functional assertions after the sample still block the receipt if they fail.

JavaScript exceptions, console errors, and same-origin HTTP errors fail a measured
journey. Failures retain profile, repetition, task, error and screenshot. If the
prior task leaves the wrong route, recovery loads the next starting route outside
the measurement window and waits for its appropriate grid or viewer readiness.
Recovery never makes a failed run eligible for release or baseline acceptance.

`pnpm qa:run --tasks-only` omits the browser suite for bounded diagnostics. It
always records a **blocked diagnostic** report and cannot establish a baseline or
authorize release. Follow it with a complete run before shipping.

`pnpm qa:run --reference /path/to/reference-checkout` retains the paired mode:
build and verify both checkouts, then alternate reference/candidate order for
each complete six-task journey. Both receive every profile and repetition, one
context at a time, and both fingerprints/build IDs are rechecked. They must use
the same task/configuration code and Playwright version. A pre-grid portfolio
cannot be a matching reference for these grid tasks. This mode records evidence;
it neither accepts a baseline nor bypasses `qa:check`.

## Measurements and comparison

- **Task duration:** browser clock from task start through asserted completion,
  including loading and motion settling. Includes automation overhead; this is a
  repeatable journey diagnostic, not INP or a Core Web Vitals score.
- **Longest main-thread task:** largest Long Tasks API duration during the task.
- **Longest animation frame:** largest Long Animation Frames API duration.
- **p95 animation-frame gap:** requestAnimationFrame interval diagnostic. Raw
  records include sampled frame count and gaps over 50 ms. This cannot measure
  GPU-rendered frame rate or prove that animation looks smooth.

Compare the median of three repetitions per task/profile. A regression must exceed
both 30% and an absolute noise allowance: 300 ms for duration, 50 ms for longest
task/frame, and 10 ms for p95 frame gap. These are relative change-detection
tolerances, **not acceptable-user-experience targets**. A slow baseline can pass
relative comparison. Review initial results and tighten budgets when justified.

Missing metrics/repetitions fail closed. Comparisons require the same OS, CPU,
core count, Node and Chromium versions, task implementation and profile settings.
Changes require an explicitly reviewed matching baseline. Throttling is relative
to the host; use a physical phone for device-specific behavior.

## Agent-assisted performance-failure triage

Complete this before diagnosing a regression, repeating a full scan, or handing
off a blocked release. Start with existing evidence and keep investigation
proportional to the miss; do not turn a borderline result into an open-ended task.

1. **Put the number in context.** Record metric, profile, baseline, allowed limit,
   median, absolute/percentage differences, individual repetitions and relevant
   frame counts. Compare matching protocols/environments only. Different-source
   history is context, not a noise distribution. Zero long-task/frame values mean
   no qualifying event was observed, not no work. A percentile with few frames
   may effectively be a maximum.
2. **Inspect changed code and measurement.** Identify plausible work, scheduling,
   layout reads, loading or completion-boundary changes affecting the interaction.
   Consider observer overhead. No obvious diff does not prove noise; a plausible
   mechanism does not prove causation. Record evidence for and against each.
3. **Do focused primary-source research.** Consult browser/specification or tool
   documentation about variability, thresholds, throttling and the suspected
   mechanism. Usually one or two sources suffice. Explain relevance; do not
   import Lighthouse scores or field INP limits as this suite's pass/fail rule.
   Research does not provide a universal normal-fluctuation percentage.
4. **Classify and bound the next step.** State likely ordinary variation,
   suspected application regression, suspected measurement/environment effect,
   or inconclusive, with confidence and remaining uncertainty. If needed, choose
   one diagnostic or a predeclared set of matched runs with identical conditions.
   Alternate order where practical, retain every run, and never rerun until green.

Save the assessment in `docs/qa/` with report links. State what the evidence suggests,
plausible changed-code causes, primary sources and release disposition. A confirmed
measurement bug needs a documented correction and validation before establishing
its new baseline. This research step never waives the release gate or budgets.

Useful references: [Lighthouse variability](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md),
[Long Tasks specification](https://www.w3.org/TR/longtasks-1/), and
[Chrome content-visibility guidance](https://web.dev/articles/content-visibility).
Use the source appropriate to the finding rather than treating these as a checklist.

## Historical evidence and exploratory checks

Current cutover verification and release disposition are recorded in
[the main grid release record](docs/qa/2026-10-29-main-grid-release.md).

Earlier protocol evidence remains in
[October 1 video triage](docs/qa/2026-10-01-video-release-triage.md),
[October 2 release triage](docs/qa/2026-10-02-release-triage.md),
[October 28 staged-grid release](docs/qa/2026-10-28-grid-release.md), and
[October 29 paired calibration](docs/qa/2026-10-29-paired-calibration.md).
The October 2 one-release exception is not reused. The October 29 startup observer
fix is retained conceptually: functional readiness sampled on animation frames
avoids retry-backoff idle frames diluting startup p95. Version 1/2 timing samples
remain historical; they do not calibrate the new grid interaction contract.

Exploration supplements the fixed suite: breakpoint edges, short windows, rapid
Notes reversals, close/reopen history, text scroll handoff, resize mid-transition,
reduced motion and video restart. Record viewport, input, observed behavior and
reproduction in `docs/qa/` with evidence. Add the smallest deterministic check for
a repeatable defect. Do not auto-heal assertions, skip failures, change budgets or
replace a baseline to get green. Record intentional contract changes and reasons.

### Grid cold-load investigation for the replacement

The initial grid measurements exposed a meaningful existing slow-network cost:
about 24 seconds for all ten animated cells to become usable with cache disabled,
1.6 Mbps bandwidth and 4× CPU throttling. A single bounded network diagnostic
recorded first usable cell at 15.1s and all cells at 23.7s; the HTML response began
at 8.7ms and finished at 229ms. Large existing posters and concurrent video frame
loads dominate transfer (Gift Exchanges poster alone delivered about 638 KB).
The media assets, grid entrance policy and video readiness controllers are
unchanged by the route replacement. This is a limitation of the current grid
experience, not evidence of a newly introduced routing regression. Desktop cold
entry was about 4.6s. Media optimization is deferred to preserve this release's
existing content/interaction baseline; do not conceal these cold-load values.

[Chrome's network reference](https://developer.chrome.com/docs/devtools/network/reference#throttling)
describes throttling and cache-disabled first-visit measurement, while the
[video loading reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video#preload)
explains that preload is a hint and playback requires downloading media. The
source keeps normal-motion cells hidden until a decoded frame is ready, and uses
posters for reduced motion/autoplay fallback. The diagnostic and release results
are recorded in [the release evidence](docs/qa/2026-10-29-main-grid-release.md).
This investigation does not change profiles, budgets, readiness criteria or assets.

### Hosted redirect boundary

The first replacement draft exposed Netlify's automatic query propagation when a
server redirect has no destination query. It reattached obsolete viewer keys and
could loop on the canonical project URL. A scoped edge response adapter now cleans
only those keys after Next validates and resolves the redirect. It does not
resolve projects, alter 404s, add dummy parameters, or wrap ordinary grid requests.
The hosted draft must verify both parameter-only links and links with repeated
unrelated values; local Next alone cannot reproduce this CDN behavior. See
[Netlify's response modification API](https://docs.netlify.com/build/edge-functions/api/#modify-a-response).

### Non-looping video prerequisite correction

Aaron's concurrent expanded-video change intentionally stops playback at the end.
Run `2026-10-30T00-53-20-194Z` passed all 80 browser cases, then timed out twice
waiting for the video to still be playing after the Notes journey. The recorded
screenshots show the final frame, full scrubber and Play control. This is a stale
journey prerequisite, not a measured slowdown: the old loop kept the clip playing,
whereas `loop: false` allows the short clip to finish during Notes. The run was
stopped and retained as ineligible evidence.

[MDN's ended-event reference](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/ended_event)
confirms that reaching the end stops playback and that looping suppresses this
event. Preparation now restarts only an ended video, before measurement; pause,
seek, resume, readiness assertions, profiles, repetitions and budgets stay intact.
Click feedback and silent stopping are checked independently on the hosted draft.
This helper change invalidates the protocol fingerprint. Review the next complete
receipt against the preceding grid medians for context before accepting the
corrected prerequisite baseline; never waive a functional failure or change a budget.

### Bounded close-animation frame-gap triage

Receipt `2026-10-30T01-13-32-962Z` has 236 unit passes, 80 browser passes and all
72 journeys with no errors. One of 96 comparisons fails: laptop close-viewer p95
is 49.9ms versus 33.3ms baseline, a 16.6ms/49.8% difference and 6.6ms over its
43.3ms limit. Repetitions are 33.3/50.0/49.9ms with 36/36/37 frames, versus
33.4/33.3/33.3ms with 36/34/36 frames. Each repetition in both runs has exactly
one gap over 50ms. Close-duration medians are 715.8 versus 700.2ms (+15.6ms/2.2%);
longest-task medians are 51 versus 50ms, and longest-frame medians 83 versus72.2ms.
All other budgets pass.

The only application/config changes since the accepted run are the edge import's
explicit `.ts` extension and its no-emit TypeScript permission. All 24 shared
browser JS/CSS chunks are byte-identical between the preceding Netlify package
and current QA build; only three manifest paths carry different build IDs.
The current 36-frame nearest-rank p95 is the second-worst interval, making it
sensitive to one refresh interval. [MDN's rAF reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
explains refresh-coupled sampling; [Chrome's variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
describes browser nondeterminism even without code changes. Neither waives budgets.

Classification: likely ordinary scheduling/sample variation, medium-high
confidence; no evidence of an added browser workload. One predeclared confirmation
run will use the unchanged app, profiles, measurements and accepted baseline.
Retain both results. Do not repeatedly scan, replace the baseline or relax the
budget to get green. A repeated failure remains blocked for an explicit decision.
