# Viewer transition evidence — October 7, 2026

Historical verification record: these measurements preceded Aaron’s removal of
the floating experiment. That route, its exclusive code and test cases are now
removed. The grid retains the verified viewer implementation; the counts below
describe the original run, not a new verification of the removal.

Scope: diagnose opening/closing jank and maintain one visible selected-media
representation through source → transition → viewer → source handoffs. Both
experiment routes use the same transition implementation. Work is uncommitted
and unpublished; this is development evidence, not a release-QA receipt.

## Observed causes

- The grid source lost hover/focus when the gallery made its main inert. About
  changed from a fitted 225 px square to a 1252 px crop beneath the expanding
  copy. Closing targeted that crop; restoring focus then started a second fit
  animation. The original source also remained visible under the copy.
- Three warm Toolbox opens each produced a 108–110 ms main-thread long task;
  click dispatch occupied 107.1–109.1 ms. The click path synchronously encoded a
  full video frame with `canvas.toDataURL`. Layout (~4 ms/open) and paint
  (~3.5–5.1 ms/open) did not dominate these recorded stalls.
- Clearing video sources as soon as `open` became false replaced/reset the
  native video before the closing effect could capture it. A baseline sample
  went from readyState 4 to 0, cleared currentSrc, and reset currentTime within
  8.3 ms.
- Keyboard navigation during close could cancel its completion even though the
  visible navigation buttons were disabled.

## Implementation decisions

| Decision | Reason and alternative | Confidence |
| --- | --- | --- |
| Freeze source geometry before inert; retain layout while hiding the whole source | Prevents hover/focus from changing the handoff origin. Hiding only the media left card backgrounds/outlines duplicated. Removing the tile would change layout. | High |
| Swap ready source/overlay/viewer visuals synchronously | Decoded images or copied canvas pixels take ownership before the old representation is hidden. Crossfading copies creates the overlap Aaron rejected. | High |
| Draw video to canvas directly; encode the native poster asynchronously | Removes synchronous image encoding from activation while retaining a poster for native video. Existing full-resolution media remains available in the viewer. | High |
| Keep the selected native video and its sources through close | Allows capture of the displayed frame and avoids a reset before the transition begins. Source cleanup occurs when the viewer unmounts. | High |
| Restore fitted/sharp focus explicitly until blur | Pointer-triggered focus restoration does not consistently match `:focus-visible`. An explicit returned-focus state keeps the measured close destination stable without changing ordinary pointer focus behavior or forcing a keyboard focus ring. | High |
| Transform only the first cover on close; fade other slides | A later slide may have a different aspect ratio/content from the source cover. Stretching it into that source would create a false visual match. | High |
| Reduced motion uses a ready, atomic handoff | Avoids spatial motion and a blank interval while preparing media. | High |
| Keep existing lightbox and bounded native video preparation | Reuses zoom, fullscreen/native video controls, history and accessibility behavior. Video preparation waits for metadata and a presented frame, bounded by timeouts; decode failures retain native fallback/error behavior. | Medium |

The source return for video copies the closing frame into the background's held
canvas. Playback continues at the viewer time when it falls inside the background
excerpt; otherwise the existing excerpt controller resumes its configured range.
Floating blur is carried into the opening overlay and resolves toward the viewer.
No new runtime dependency or persistent process was added.

## Evidence provenance and limits

The before sample used warm assets, Chromium, a 1440 × 900 viewport, and three
About/Toolbox open-close repetitions plus a mid-hover activation. Performance
tracing and frame-by-frame geometry observation ran separately. The initial
geometry observer selected the wrong overlay element; its overlay/overlap fields
are invalid and are not used as evidence. Its source-size and video-lifecycle
observations are valid.

A subsequent Playwright run cleared its default `test-results` output directory,
which also contained the raw baseline traces. Baseline values above were recovered
from actual tool output; raw baseline traces cannot be re-inspected. The profiling
harness was reconstructed from the original workload and later test output was
redirected outside the evidence directory. Retained after traces and a recovered
baseline summary document this limitation explicitly.

## Verification

- New transition suite: 22 passing checks across Chromium desktop, WebKit desktop,
  and WebKit iPhone portrait; two desktop exclusions for the touch-only blur case.
  A requestAnimationFrame observer checks selected source/overlay/viewer paint
  eligibility each frame, including ancestor opacity/visibility. Image/video
  opening during an unfinished fit, mouse close away from source, Escape/Back,
  interrupted close/reopen, navigation blocking, stable return geometry,
  returned-focus cleanup, touch blur and reduced-motion handoff pass.
- 41 existing composition, routing and video-controller unit tests pass.
- TypeScript and production build pass (42 generated routes).

- Existing focused viewer/video suite: 29 passes and one existing portrait
  autoplay-denial exclusion across the same engines/profiles. These cover
  navigation, zoom/reset, Back/Forward, deep links, background pause/resume,
  reduced-motion video, and autoplay fallback. Total: 51 browser passes and
  three capability exclusions.
- React Doctor changed-file scan: 100/100. One narrowly documented false-positive
  suppression remains at the async transition effect: every post-await state
  write checks the mounted/generation guard, effect cleanup invalidates the
  generation on history changes, and layout cleanup invalidates pending work on
  unmount. The checker does not follow those helper/ref guards. Interruption
  coverage passed; no project-wide rule was disabled.

## Performance follow-up

The matched warm Chromium rerun recorded no long tasks and no rAF gaps above
50 ms in all 14 measured open/close windows. Toolbox click dispatch fell from
107.1–109.1 ms to 5.5–6.2 ms. Its maximum opening-frame gaps fell from
66.7/100.2/99.5 ms to 33.3–33.5 ms. The after trace directly shows the reduced
click-handler cost; the before values come from recovered actual tool output.

Host conditions differed: sampled load average was 14.9 after versus 6.8 before,
and reported free memory was 29% versus 40%. Small frame timing differences
cannot be attributed confidently to the change. These runs support removal of
the repeatable encoding stall, not a universal smoothness/performance guarantee.
A separate geometry pass avoids adding DOM-reading overhead to the trace run.
Across 1,455 sampled frames in 14 windows, it observed exactly one ready visual
with zero overlaps and zero blank-owner frames. About stayed exactly 225 px after
return; Toolbox stayed 592.6 px with less than 0.016 px rounding variation. The
last overlay rectangle matched the first restored source rectangle. All three
video closes preserved readyState 4, current source and captured frame until
unmount; the earlier source/time reset did not recur.

Ignored local evidence: `test-results/qa/transition-jank/comparison.json`,
`before-summary-recovered.json`, `after.trace.json`, `after.trace-summary.json`,
`after.json`, and `after-geometry.json`. The reconstructed harnesses and an extra
copy remain under `/tmp/mosaic-transition-profile/`. Browser version equality
with the original baseline cannot be reverified because that raw field was lost.

## Decision audit and remaining review

The fix addresses the shared transition lifecycle rather than only the selected
portrait. Both layouts consume the same ownership, snapshot, cancellation and
focus-restoration paths. The returned-focus state is an intentional interaction
choice: the tile stays fitted/sharp while its restored focus remains, then
ordinary hover/focus rules resume on blur. A later slide fades on close because
it cannot truthfully morph into a different cover.

Remaining limits: the measurements use warm assets on the local development
server, not throttled production or a physical phone. Frame observers verify
DOM/CSS paint eligibility and geometry, not every compositor pixel. Native video
preparation is bounded; unavailable/failed media still uses the existing poster
or error UI. Pending readiness listeners can live until their short timeout after
cancellation, while token/mounted guards prevent stale state writes. Original
baseline traces were lost as documented above. No release QA was run, no baseline
was replaced, and the publication gate still applies.

Manual review: open a card while its hover fit is moving, open/close a playing
video, close with the pointer over the close control, and rapidly use Escape then
Forward. Expect one visible selected item, no source-card outline/background
beneath its transition copy, and no second fit animation after closing. Review
both routes and assess motion feel on the actual display/device.

Pride gate: yes, I am proud of the focused correction and would stand behind the
implementation, with the stated device/production validation limits. Production
release still requires Aaron's visual acceptance and the existing release-QA
contract. No shortcut is being treated as completed acceptance.

Verdict: **ready with noted risks** for review. Nothing is committed, pushed or
published.
