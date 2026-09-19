# Release QA tasks

This is the visitor-task contract for aaronwright.ca. Humans and agents use the
same outcomes. Executable journeys live in `scripts/qa/tasks.mjs`; fixed conditions
and regression tolerances live in `qa/config.json`. Keep task IDs aligned. Other
projects can use this format with their own tasks and implementation.

## Run and ship

1. Install locked dependencies and browsers if needed:
   `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium webkit`.
2. Run `pnpm qa:run`. This explicitly builds production, starts its own temporary
   loopback server on **3032**, runs checks, writes results, and stops that server.
   It refuses to use an occupied port; it does not manage the ordinary dev server.
   Keep the checkout unchanged and avoid other heavy work during measurement.
3. Review `qa/results/<timestamp>.md` and its JSON, including failed runs. Commit
   these small records alongside the tested changes. Screenshots and browser
   traces/logs stay in ignored `test-results/qa/<timestamp>/`.
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

The public browser matrix contains 26 scenarios across four profiles. Seven
scenarios require mouse drags or wheel input and are explicitly skipped on each
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
- Image preload progress uses only the FiveByFive: one randomly ordered square per
  4% of successfully decoded images, with no visible loading text. Background
  loading uses one worker; active media can load immediately. Videos load on demand
  on every device. Previously visited video may retain its source and buffer.

## Required tasks

| ID                  | Visitor action                                          | Required outcome                                                                                                |
| ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| cold-entry          | Open `/work` with an empty browser cache.               | Loading curtain finishes; the project menu is usable.                                                           |
| choose-project      | Choose Aaron's Toolbox from the menu.                   | Correct route and section marker, settled vertical track, ready media contained in the viewport.                |
| horizontal-gesture  | Wheel horizontally or swipe left through the media.     | Normalizer becomes active; the selected project stays Aaron's Toolbox; the new image loads and fits.            |
| image-viewer        | Open Normalizer, go to the previous image, then close.  | Viewer opens, navigates to Overview, closes, and restores the project with the correct route and visible media. |
| vertical-navigation | Wheel/swipe vertically to NextPhrase, then return home. | Only the project changes; route and section marker agree; Back to top returns to the menu.                      |
| appearance          | Open Appearance and select Light.                       | Menu remains usable, closes on selection, and the Light preference is applied and stored.                       |

Each task waits for UI state and settled track geometry. A changed URL alone is
insufficient. JavaScript exceptions, console errors, and same-origin HTTP errors
fail a measured journey. Failures record profile, repetition, task, error and
screenshot. After a task fails, the runner restores the next task's starting route
outside the measurement window so unrelated tasks can still run. Recovery never
turns a failed run into eligible baseline or release evidence.

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
