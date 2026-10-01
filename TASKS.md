# Release QA tasks

This is the visitor-task contract for aaronwright.ca. Humans and agents use the
same outcomes. Executable journeys live in `scripts/qa/tasks.mjs`; fixed conditions
and regression tolerances live in `qa/config.json`. Keep task IDs aligned. Other
projects can use this format with their own tasks and implementation.

## Run and ship

1. Install locked dependencies and browsers if needed:
   `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium webkit`.
2. Run `pnpm qa:run`. This explicitly builds production, starts its own temporary
   loopback server on an **OS-assigned available port**, runs checks, writes results,
   and stops that server. It does not reuse or stop other servers or manage the
   ordinary dev server. The selected URL is logged and recorded in the JSON report.
   Keep the checkout unchanged and avoid other heavy work during measurement.
3. Review `qa/results/<timestamp>.md` and its JSON, including failed runs. Commit
   these small records alongside the tested changes. Screenshots and browser
   traces/logs stay in ignored `test-results/qa/<timestamp>/`.
   For performance failures, complete the quick triage below before another full
   run or a release-blocked handoff. A threshold crossing is an observation, not
   by itself proof that the release introduced a regression.
4. On the first complete run, review the measurements, then explicitly establish
   the starting baseline: `pnpm qa:baseline qa/results/<timestamp>.json`.
   The initial run is blocked until this is done; this is not a functional failure.
   Later baseline replacements use the same explicit command and need a reason in
   the commit description. Never accept a failing/incomplete run or update a
   baseline just to make a regression pass.
5. `pnpm qa:check` must pass before publishing. Netlify's repository build command
   runs it before building. It re-evaluates the **latest** run against the accepted
   baseline and current source fingerprint; older successful runs cannot hide a
   newer failure. Source, media, test, task, or configuration changes require a new
   run. Ordinary docs and report additions do not. Commit evidence before pushing.
   Direct publish commands that skip the configured build can bypass this gate;
   always run `pnpm qa:check` before those commands too.

There is no automatic commit, push, deployment, paid service, or LLM dependency.
Both preview and production Netlify builds use the gate. A passing receipt verifies
the local production build of these sources; hosting configuration and CDN behavior
still require post-deploy observation. Changes to build-time environment variables
require a new measured run with those same values.

The October 1 port-selection change fixes a collision with Gift Exchanges' assigned
development port, 3032. QA now launches `next start --hostname 127.0.0.1 --port 0`
and reads the bound URL from that child process before starting checks. The OS
allocates the port when the server binds, avoiding a probe-and-release race.
Development routing, visitor tasks, throttling, budgets, and baseline stay unchanged.
See [Node's port-zero behavior](https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback).

The same release corrects the section-reset animation test's observation timing.
The [first complete October 1 run](qa/results/2026-10-01T23-32-21-154Z.md) passed
all performance comparisons, but WebKit desktop and portrait sampled only one or
two track positions after the click returned. The observer now runs on animation
frames inside the page starting before the click, while retaining the requirement
for more than two distinct positions, the correct final slide, and browser-history
restoration. This repairs observation of the existing animation contract; it does
not change application behavior, skip coverage, or relax performance budgets.

## Conditions

For debugging task definitions, `pnpm qa:run --tasks-only` omits the long browser
suite. It still records a **blocked diagnostic** run and cannot establish a
baseline or authorize release. Follow it with a complete run before shipping.

| Profile              | Viewport   | Input       | CPU slowdown | Network                                      |
| -------------------- | ---------- | ----------- | ------------ | -------------------------------------------- |
| desktop              | 1440 × 900 | mouse/wheel | 1×           | unthrottled                                  |
| small-laptop-slow    | 1280 × 720 | mouse/wheel | 4×           | 1.6 Mbps down / 0.75 Mbps up, 150 ms latency |
| phone-portrait-slow  | 390 × 844  | touch       | 4×           | same slow network                            |
| phone-landscape-slow | 844 × 390  | touch       | 4×           | same slow network                            |

Performance journeys run serially in Chromium, three repetitions per profile,
each with a fresh context, disabled browser cache, blocked service workers,
normal motion, and dark system appearance. Touch uses browser touch input events,
not mouse drags. Existing public-portfolio Playwright suites also run in Chrome and
WebKit desktop plus WebKit iPhone portrait/landscape, with their declared device
skips. The private copy editor is outside this visitor release gate; its existing
test remains available through `pnpm test:e2e`.

The public browser matrix contains 29 scenarios across four profiles, including
one check that QA waits for visible motion without reading offscreen carousel
descendants. Seven scenarios require mouse drags or wheel input and are explicitly skipped on each
touch profile (14 skips). Theme keyboard/focus/persistence, viewer lifecycle,
history, content, and responsive geometry checks run on all four profiles. These
are capability exclusions, not quarantined failures. The measured Chromium tasks
exercise actual touch events on both phone sizes; WebKit emulation does not cover
those swipe sequences or physical iPhone behavior.

## Navigation and layout contract

- Both carousel axes stop at their ends; they do not wrap. Aaron confirmed this
  behavior while reconciling the original wrapping assertions.
- Project metadata stays fixed while the slide narrative and media change.
- Wide layouts place narrative beside media; narrow layouts stack them. A touch
  device can use either arrangement depending on its viewport.
- About Me has two text panels (biography and working style/strengths), shown
  together when space permits. It has no image-viewer controls.
- The home logo must receive a normal click/tap. Decorative navigation rails must
  not intercept it. Viewer navigation must retain keyboard access, including Escape.
- The actual image or video, beyond its surrounding stage, must have a short edge
  of at least 80 CSS pixels in the four browser-matrix viewports. This catches
  landscape layouts where fixed text columns and padding consume the media area.
- The page waits for fonts, carousel initialization, and media visible on the
  initial route. The text menu needs no images; deep links wait only for their
  active media. A text-free FiveByFive shows six lit perimeter squares stepping
  clockwise during this wait, without rotating the grid. Reduced motion keeps
  those six squares static. Reveal has no added delay or entrance fade.
- The top and bottom frame rules start grey and fill with the accent red from
  left to right, together, as images decode. They remain fully red after success.
  Contact-dialog frame rules share that same live progress. Failed images retain
  their grey share and are described to assistive technology, without visible
  loading text. Background loading continues after the startup spinner disappears.
- Background image loading uses one worker; active media can load immediately.
  Videos load on demand on every device. Previously visited video may retain its
  source and buffer.

## Required tasks

| ID                  | Visitor action                                          | Required outcome                                                                                                |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| cold-entry          | Open `/work` with an empty browser cache.               | Fonts and carousel initialization finish; the project menu is usable while images load.                         |
| choose-project      | Choose Aaron's Toolbox from the menu.                   | Correct route and section marker, settled vertical track, ready media contained in the viewport.                |
| horizontal-gesture  | Wheel horizontally or swipe left through the media.     | Normalizer becomes active; the selected project stays Aaron's Toolbox; the new image loads and fits.            |
| image-viewer        | Open Normalizer, go to the previous image, then close.  | Viewer opens, navigates to Overview, closes, and restores the project with the correct route and visible media. |
| vertical-navigation | Wheel/swipe vertically to NextPhrase, then return home. | Only the project changes; route and section marker agree; Back to top returns to the menu.                      |
| appearance          | Open Appearance and select Light.                       | Menu and scrim close without reordering visible options; then Light is stored, visible theme transitions finish, and focus returns to the trigger. |

Cold-entry now observes page readiness, removal of the startup spinner, and visible
page content. First-screen readiness and background frame progress are an
intentional loading-contract change; the next measured release needs a reviewed
baseline with this task fingerprint.
Readiness checks target the visible page, excluding temporary hidden streaming
copies. Viewer deep links assert the requested viewer is opaque; ordinary entry
asserts opaque page chrome, which the viewer intentionally hides while open.

Each task waits for UI state and settled track geometry. A changed URL alone is
insufficient. JavaScript exceptions, console errors, and same-origin HTTP errors
fail a measured journey. Failures record profile, repetition, task, error and
screenshot. After a task fails, the runner restores the next task's starting route
outside the measurement window so unrelated tasks can still run. Recovery never
turns a failed run into eligible baseline or release evidence.

Protocol version 2 (September 22) corrects the geometry observer to read the outer
track, in-view project tracks, and viewer only. Section boxes remain observable
while scrolling, but offscreen descendants are not forced out of
`content-visibility: auto` on every frame. Visible tracks still must hold their
geometry for 200 ms; a browser regression check covers both actual motion and
forbidden offscreen reads. The appearance task now awaits the native animation
completion promises on the visible theme surfaces, trigger, and scrim, then
checks the clear scrim and restored focus. It does not poll carousel geometry or
add an arbitrary sampling delay during the color transition. Normal and reduced
motion are covered by the existing menu tests.

This intentionally changes the observation cost and appearance completion
boundary. Version 1 timing samples cannot serve as a comparable baseline. A new,
complete version 2 run must be reviewed and explicitly accepted; the existing
30%/absolute regression allowances are unchanged. This recalibration is for the
corrected protocol and the close-before-apply interaction, not an exemption for
the previous failed runs.

The vertical touch journey moves 60% of the outer viewport height. Using the
shorter inner media stage as the distance reference could end before the outer
snap midpoint and legitimately return to the same project when the gesture was
slow. This task checks a committed swipe, not the minimum flick velocity.

Horizontal gestures start inside the actual media. Vertical gestures start at
the section edge, clear of narrative scrolling and video seek controls. Both
assert that their starting point is outside the carousel drag-lock area. A fixed
point at 70% of the carousel height could land on the video seek bar after a
responsive layout correction; the resulting seek was not a carousel failure.
This target correction changes the protocol fingerprint and requires a reviewed
baseline. Prior reports remain historical evidence.

## Measurements and comparison

- **Task duration:** browser clock from task start through asserted completion,
  including loading and animation settling. Includes automation overhead; this is
  a repeatable journey diagnostic, not INP or a Core Web Vitals score.
- **Longest main-thread task:** largest Long Tasks API duration during the task.
- **Longest animation frame:** largest Long Animation Frames API duration.
- **p95 animation-frame gap:** requestAnimationFrame interval diagnostic. Raw
  records also include sampled frame count and gaps over 50 ms. This cannot measure
  GPU-rendered frame rate or prove an animation looks smooth.

Compare the median of three repetitions per task/profile. A regression must exceed
both 30% and an absolute noise allowance: 300 ms for duration, 50 ms for longest
task/frame, and 10 ms for p95 frame gap. These are initial change-detection
tolerances, **not acceptable-user-experience targets**. A consistently slow baseline
can pass relative comparison. Review initial results and tighten budgets as needed.

Missing metrics/repetitions fail closed. Comparisons require the same OS, CPU,
core count, Node and Chromium versions, task implementation, and profile settings.
After changing those, review a new baseline explicitly. Throttling is relative to
the host; it does not reproduce a phone's GPU, thermal state, Safari engine,
browser chrome, or touch ergonomics. Use a physical phone for those.

## Agent-assisted exploratory pass

### Quick performance-failure triage

Include this in the agent-assisted release scan whenever a performance limit is
exceeded. Start with existing evidence and keep the investigation proportional to
the miss; do not turn a borderline result into an open-ended optimization task.

1. **Put the number in context.** Report the metric, profile, baseline, allowed
   limit, measured median, and absolute/percentage differences. Show individual
   repetitions and relevant sample counts. Compare only matching protocols and
   environments; different-source history is context, not a noise distribution.
   Distinguish a relative regression budget from an independently supported user
   experience threshold. A zero long-task/long-frame value means no qualifying
   entry was observed, not that the browser did no work. Check whether a percentile
   with very few frames is effectively a maximum.
2. **Inspect the release diff and measurement code.** Look for a plausible path
   from changed code to the failing interaction: work added, scheduling changes,
   layout reads, animation timing, resource loading, or altered task boundaries.
   Identify specific files and mechanisms, with evidence for and against each.
   Inspect observer overhead too. No obvious relevant diff does not prove noise;
   finding a plausible mechanism does not prove causation.
3. **Do quick, targeted research.** Consult primary browser/specification or tool
   documentation about that metric's variability, recording threshold, throttling,
   and any suspected mechanism. Usually one or two focused searches suffice.
   Reuse still-applicable sources already checked in the task. Cite the supporting
   links and explain their relevance; do not import a Lighthouse score or field
   INP threshold as a pass/fail rule for this custom lab measurement. Research
   cannot supply a universal "normal fluctuation" percentage for this site.
4. **Classify and choose a bounded next step.** Record likely ordinary variation,
   suspected application regression, suspected measurement/environment effect,
   or inconclusive, with confidence and remaining uncertainty. Separate a
   repeatable measured increase from attribution to the release. If existing data
   cannot settle a consequential result, choose one targeted diagnostic or a
   small, predeclared set of matched base/current runs with identical conditions
   and instrumentation. Alternate their order when practical and retain all
   results. Do not mix traced and untraced timings or rerun until one passes.

Save the assessment under `docs/qa/` and link the relevant run reports. The handoff
must state what the evidence suggests and why, any plausible changed-code cause,
the research sources, and the release disposition. This is an agent research
step, not a network or LLM dependency of the deterministic QA commands. It does
not waive `pnpm qa:check`, change budgets, or authorize baseline replacement. If a
measurement bug is confirmed, document and validate the correction before
establishing a baseline for the corrected protocol.

Useful primary references: [Lighthouse's variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
for repeated measurement and resource contention, the [Long Tasks specification](https://www.w3.org/TR/longtasks-1/)
for its reporting threshold, and [Chrome's content-visibility guidance](https://web.dev/articles/content-visibility)
for DOM reads that force skipped rendering. Use the source appropriate to the
finding, rather than treating this list as a mandatory research checklist.

### Exploratory checks

An agent can read this file, run the fixed suite, inspect evidence, and then explore
beyond it: breakpoint edges, very short windows, rapid/reversed gestures, text
scroll handoff, viewer zoom/history, resize mid-transition, reduced motion, and
video restart. Describe the viewport, input, task, observed failure, and reproducible
steps. Record findings in `docs/qa/` with links to evidence.

Exploration is supplemental; it is not currently an automated LLM release gate.
Do not include agent thinking time in performance measurements. When an agent finds
a repeatable defect, add the smallest deterministic check and update this contract
if needed. Do not auto-heal assertions, skip failures, change budgets, or replace a
baseline to obtain a green release. Intentional behavior changes should update the
contract and test together, with the reason recorded.
