# About Me first-open performance — October 24, 2026

## Scope and conditions

Aaron requested analysis of the open Chrome tab: reload `/grid-version`, open
About Me, and compare with later opens. No application source changes, dependency
changes, server management, production build, release QA, or deployment were made.
The existing development tab was used at 2293 × 1267 CSS pixels, DPR 1, foreground,
Chrome 155 on macOS. No CPU/network throttling was applied. Cache was left enabled:
“first open” means the first viewer mount after a normal reload, not an empty-cache
visit. Existing unrelated working-tree changes were left untouched.

Two untraced first/repeat pairs were measured, plus one separate first-open trace.
A temporary browser-only CSS diagnostic disabled the transition overlay's filter
for one additional pair. All observers and diagnostic CSS were cleared by reload;
their absence was checked afterward. The tab was returned to the grid.

## Measurements

Timing starts at the captured click event. A lightweight animation-frame observer
records the viewer's `data-mosaic-transition-state` milestones. “Open” is that
state change, not the completion of every subsequent text/portrait fade. Frame
gaps are rAF diagnostics, not a measured compositor frame rate.

| Sample | Click → animation start | Click → open state | Frame gaps >50 ms during opening | Long tasks ≥50 ms |
| --- | ---: | ---: | ---: | ---: |
| Baseline 1, first open | 325 ms | 824 ms | 7 | 0 |
| Baseline 1, repeat | 37 ms | 486 ms | 2 | 0 |
| Baseline 2, first open | 326 ms | 726 ms | 2 | 0 |
| Baseline 2, repeat | 36 ms | 486 ms | 2 | 0 |
| Separate traced first open | 335 ms | 817 ms | 7 | 0 |
| No-filter diagnostic, first open | 335 ms | 718 ms | 3 | 0 |
| No-filter diagnostic, repeat | 38 ms | 489 ms | 2 | 0 |

Maximum sampled frame gaps were approximately 67 ms across all samples. The
second baseline's first click occurred later after reload (~15 seconds versus
~4.6 seconds for baseline 1), following an initial automation attempt before the
entrance became interactive. That attempt produced no click entry and is not a
measured open. Do not attribute the difference in animation pacing solely to
cold versus warm assets. The start delay remained repeatable despite this timing
difference. Traced and untraced observations are reported separately.

## Attribution

**High confidence: the roughly 300 ms first-mount penalty comes from the lazy
viewer/Suspense path.** `ExperimentGallery.tsx` creates the viewer with
`next/dynamic`, `ssr: false`, and a loading fallback. The installed Next loadable
implementation wraps `React.lazy` in Suspense. The installed React development
renderer has `FALLBACK_THROTTLE_MS = 300` and schedules a delayed retry commit.

The trace contains a 280 ms timer installed 26.3 ms after click and a replacement
260 ms timer at 46.9 ms, both targeting approximately click +307 ms. The viewer's
mount work then runs around +309 ms, followed by opening at +335 ms. This agrees
with the source mechanism and repeated first/repeat difference. The application
already starts an ordinary module import on pointer entry/focus, but that does
not initialize the lazy component's first rendered state ahead of the click.

In the first baseline, viewer-related JS/CSS requests began about 20 ms before
click and took roughly 21–38 ms each. No new portrait or font requests appeared
in the click window. The trace shows about 12.2 ms total script evaluation, a
23.3 ms maximum main-thread task, 3.9 ms total layout, and 3.3 ms total paint.
The four queued image-decode worker operations total approximately 0.033 ms in
this cached sample. These measurements do not support image downloading/decoding
or a large synchronous Markdown render as the source of the 300 ms pause.
Trace categories overlap; the category totals must not be summed as total cost.

**Separate unresolved issue: uneven frame pacing.** Approximately 67 ms gaps
occurred during first and repeat transitions. The observed long animation frames
had no attributed long scripts and zero reported blocking duration. This does
not prove that the GPU is the cause or that the animation is smooth. Removing
the no-op transition filter did not produce a reliable improvement across the
single diagnostic pair; no filter change was retained. Browser/compositor/host
contention and instrumentation effects remain possible. These development-tab
samples are not production or physical-device acceptance evidence.

## Recommended next change

Remove first-render Suspense from the interactive opening path: have a resolved
viewer component ready before interaction, or use an explicit cached module
loader whose ready component renders directly. Keep heavy viewer code split if
possible, and preserve the existing source/transition/viewer handoff. Merely
starting another hover import may not remove the first `React.lazy` suspension.

Verify the change with the same first/repeat protocol before pursuing broader
animation rewrites. A separate bounded compositor investigation is warranted if
the motion still feels rough after the repeatable startup pause is removed.

## Evidence and references

The recorded figures above were extracted from live PerformanceObserver results
and a Chrome DevTools trace. Raw trace data was analyzed in memory; it was not
saved to the repository. Only this focused summary is retained.

- Local source: `components/mosaic/ExperimentGallery.tsx`,
  `components/mosaic/MosaicTile.tsx`,
  `components/mosaic/useMosaicViewerTransition.ts`, and
  `components/mosaic/mediaSnapshot.ts`.
- Installed implementation: `node_modules/next/dist/shared/lib/lazy-dynamic/loadable.js`
  and `node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js`
  (retry scheduling near line 18206; throttle constant near line 30047).
- [React work-loop source](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js)
  provides the upstream fallback-throttling mechanism; the installed code above
  is the version-specific evidence for this tab.
- [Chrome Long Animation Frames documentation](https://developer.chrome.com/docs/web-platform/long-animation-frames)
  explains the metric fields and why the absence of a long task alone does not
  establish smooth rendering.

This is an exploratory diagnosis, not a release-QA receipt or a changed baseline.

## Implemented follow-up and remeasurement

Aaron then authorized fixing the startup delay and remeasuring it. The shared
viewer now uses `MosaicViewerLoader.tsx`: a cached dynamic import retains code
splitting, and the resolved component renders directly without a Suspense retry.
`ExperimentGallery` begins loading it after hydration, during the grid entrance.
Tile pointer/focus preloads use the same cache. The modal is still mounted only
when a project is opened; media preparation and transition ownership are unchanged.

Three new first/repeat pairs were measured in the same Chrome tab, with the same
viewport, enabled cache, unthrottled conditions, click milestones, and frame
observer. Each pair started with a normal reload; these were untraced samples.

| Sample after change | Click → animation start | Click → open state | Frame gaps >50 ms during opening | Long tasks ≥50 ms |
| --- | ---: | ---: | ---: | ---: |
| Pair 1, first open | 45 ms | 562 ms | 3 | 0 |
| Pair 1, repeat | 43 ms | 492 ms | 2 | 0 |
| Pair 2, first open | 41 ms | 491 ms | 2 | 0 |
| Pair 2, repeat | 38 ms | 489 ms | 2 | 0 |
| Pair 3, first open | 37 ms | 488 ms | 2 | 0 |
| Pair 3, repeat | 34 ms | 485 ms | 2 | 0 |

The first animation now starts in 37–45 ms versus 325–326 ms in the original
untraced samples, eliminating roughly 280 ms of startup delay. First-open total
time to the open state fell from 726–824 ms to 488–562 ms. Repeat timings remain
similar. This verifies the targeted first-mount improvement in the development
tab. The roughly 67 ms maximum frame gaps remain and are not claimed as fixed.
The first clicks occurred at approximately 9.0, 4.4, and 4.4 seconds after reload.

### Verification and scope

- TypeScript passes; the three changed implementation files were formatted.
- React Doctor changed-file scan remains 92/100 with the existing
  `MosaicLoopEditor` complexity warning. No rule/configuration was suppressed.
- Reloading the About deep link reaches the About viewer's open state.
- Closing it returns to an interactive grid with no focused project or held source.
- FreshBooks opens through the same loader; its active video reaches readyState 4
  and plays. Browser Back closes it with no remaining transition layer or held
  source, and restores an interactive grid with no focused project.
- All temporary profiling observers were removed by the subsequent deep-link
  reload. No server was started or stopped; no dependency was added.
- Existing browser suites contain obsolete project-count expectations and were
  not run or rewritten for this focused verification. The explicit live-browser
  checks above are the functional evidence, not a claim of suite coverage.

### Decision audit

| Decision | Reason / principal alternative | Confidence |
| --- | --- | --- |
| Render the resolved module directly | Removes the measured first-render Suspense delay while preserving a separate bundle; a static import would pull the entire viewer into the initial bundle. | High |
| Begin preparation during the grid entrance | Gives the loader time before cells become interactive; hover-only loading leaves little lead time on quick clicks and none on touch. This moves network/evaluation work earlier for visitors who never open a project. | High for this interaction; earlier-load cost on throttled devices unmeasured |
| Share the loader across all project cells | The delay belongs to the shared viewer, not About content. FreshBooks was checked as a representative video project. | High |
| Cache successful imports and guard async state updates | Reuses the ready component and avoids writing state after the loader unmounts. A failed speculative import resets its promise so an actual open can retry; a requested failure reaches the existing route error boundary. | High from code review; failure paths not fault-injected |
| Preserve the animation implementation | The targeted startup penalty is verified removed. Broader compositor work would need separate evidence. | High |

I am proud of this focused fix and would stand behind its loading/lifecycle
approach in production. That judgment does not replace the project's release QA
or production/device performance validation. Remaining gaps: fault-injected import
failures, slow-network startup cost, production builds, and the separate frame
pacing issue. Verdict: **ready with noted risks** for local review. Changes remain
uncommitted and unpublished.

## Frame-gap investigation and fix

Aaron requested continued investigation of the remaining gaps. The same tab,
viewport, development server, enabled HTTP cache, and unthrottled foreground
conditions were retained. The new rAF probe samples 1.1 seconds after each click,
including the opening and its follow-up fades. Accessibility snapshots were
collected after the sampling window, not during the animation.

### Evidence and bounded diagnostics

- A settled About viewer had no gaps over 50 ms in a 1.2-second sample; its
  maximum was 32.8 ms. Closing also ran without the repeated 67 ms gaps.
- Opening without accessibility polling still produced two gaps of 66.3 and
  66.5 ms near the end of the expansion. This ruled out that polling as the
  immediate cause.
- A new baseline trace shows an actual scheduling change: at click +337 ms,
  `ExternalBeginFrameSourceMac::SetPreferredInterval` sets its VSync subsampling
  factor to 4. `Scheduler::BeginFrame` then reports a 66,696 μs interval instead
  of 16,674 μs. The animation completion callback is delayed until +490 ms.
  The final image decode takes only 1.1 ms, after the gaps; it is not their cause.
- Browser-only hiding of paused background videos removed the gaps (maximum
  17.6 ms). Setting those paused videos to playbackRate 1 did not: gaps remained
  at 65.9–67.5 ms. Holding their current pixels on the existing canvases, while
  hiding the video elements, removed them again (maximum 18.7 ms).
- This supports a video-layer/compositor scheduling interaction, rather than a
  heavy animation callback. Chromium's
  [macOS frame-source implementation](https://github.com/chromium/chromium/blob/main/components/viz/service/frame_sinks/external_begin_frame_source_mac.cc)
  confirms that the recorded subsampling factor skips VSyncs to implement a
  lower preferred cadence. It does not by itself identify which internal
  heuristic selected that cadence; the video attribution comes from the live
  isolation tests above.

The shared video controller now copies a visible frame once when the application
pauses it, using its existing held-frame canvas. The canvas retains the current
fade opacity, background, composition and clipping. The video is hidden until
the first valid decoded frame after resume, without changing its source,
playhead, segment, or authored speed. Failed copies retain the visible paused
video rather than replacing it with stale cached pixels or a poster. No new
frame loop, dependency, canvas element, or permanent compositor hint was added.

### Intermediate findings retained

The canvas change alone removed the recurring end-of-animation gaps in three
first/repeat pairs. Maximum gaps were 18.8/18.5, 33.4/18.7, and 18.8/33.4 ms;
click-to-open times were 444/438, 465/448, and 436/450 ms. The first pair did not
record long tasks. The second first-open and third repeat did record 62 ms and
55 ms click tasks respectively, so the investigation continued.

Instrumented copies of all eight paused videos took about 2–3 ms total in the
sampled interactions. A separate focused-portrait test found an unnecessary
1600 × 1600 canvas-to-WebP poster conversion taking **25.5 ms synchronously**.
`MosaicViewer` requested that conversion for every captured origin even though
only video slides consumed its URL. It now requests an encoded poster only for
a video origin. About keeps its direct canvas transition and hovered-pose blend.
The matched focused-portrait check made zero poster conversions afterward;
its click-to-open time changed from 449 to 442 ms, with no long task in either
focused sample. This removes proven wasted work; the entire earlier 55/62 ms
tasks were not individually attributed to encoding.

A separate trace after the canvas change had **only 16,674 μs frame intervals**
through the opening window, with no switch to the 4× interval. Its maximum rAF
gap was 33.3 ms and click-to-open time was 436 ms. Traced/instrumented diagnostic
samples are not pooled with the final untraced measurements below.

### Final measurements with both changes

Each pair begins with a normal reload. First clicks occurred at 4.15–4.21 seconds
after navigation, as soon as the entrance allowed interaction. Temporary
prototype overrides were absent; only rAF/long-task observers were installed.

| Final sample | Click → animation start | Click → open state | Maximum rAF gap across 1.1 s | Gaps >50 ms | Long tasks ≥50 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Pair 1, first | 56 ms | 439 ms | 18.3 ms | 0 | 0 |
| Pair 1, repeat | 43 ms | 445 ms | 18.6 ms | 0 | 0 |
| Pair 2, first | 49 ms | 440 ms | 18.5 ms | 0 | 0 |
| Pair 2, repeat | 43 ms | 445 ms | 18.6 ms | 0 | 0 |
| Pair 3, first | 49 ms | 437 ms | 18.8 ms | 0 | 0 |
| Pair 3, repeat | 37 ms | 437 ms | 18.8 ms | 0 | 0 |

The three measured closes had maximum gaps of 18.5–18.7 ms and no long tasks.
Compared with the preceding loader-only fix (488–562 ms first opens and
485–492 ms repeats), final opening takes 437–445 ms and the recurring ~67 ms
gaps are absent. The animation duration/easing and layout were not shortened or
changed to achieve this result. These are observed development-tab results,
not a guarantee of frame pacing on every device or an empty-cache visit.

### Verification and decision audit

- 32 existing/focused playback and tempo tests pass, including two added checks:
  paused-frame fade/speed/playhead preservation through decoded-frame resume,
  and copy-failure fallback without stale pixels. TypeScript and formatting pass.
- React Doctor's changed-file scan is unchanged at 92/100 with the existing
  `MosaicLoopEditor` complexity warning. No diagnostic suppression was added.
- About renders correctly after opening. All eight grid videos are paused and
  held while it is open, then return to visible, playing videos after close.
- FreshBooks opens with its video playing at readyState 4; browser Back restores
  all eight grid videos. No held canvases, hidden project source, transition
  overlay, or focused project remains after the close completes.
- The browser error log was empty. A final grid reload removed all temporary
  observers, prototype instrumentation and diagnostic CSS; their absence was
  checked. Existing unrelated edits were preserved. No server was managed and
  no dependency, commit, or deployment was added.

| Decision | Reason / alternative | Confidence |
| --- | --- | --- |
| Reuse held-frame canvases for application pauses | Removes the measured video-layer cadence issue while preserving visible pixels. Simply hiding videos changes the transition; changing paused playback rates did not work. One copy per pause adds a small measured cost and uses existing canvas allocation. | High for this Chrome/macOS reproduction |
| Reveal live video only after a valid decoded frame | Uses the existing seek/handoff lifecycle, preserving authored fades and avoiding stale-frame flashes. | High; controller tests and all eight live resumes checked |
| Keep the video if a pause snapshot fails | Preserves content instead of displaying a stale canvas. The cadence optimization can be unavailable in this failure case. | High; failure path tested |
| Encode posters only for video origins | Removes measured, unused portrait encoding while retaining native video posters. | High; zero About encodes and FreshBooks playback verified |

Pride gate: I am proud of this focused implementation and would stand behind the
shared lifecycle and failure handling in production. The measured cadence fix
is verified in the requested Chrome development tab. Production builds, Safari,
mobile devices, and empty-cache performance remain unmeasured; release QA is
still required before publication. Verdict: **ready with noted risks** for
local review. Changes remain uncommitted and unpublished.
