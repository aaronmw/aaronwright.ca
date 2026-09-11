# Portfolio navigation performance audit

Measured September 10, 2026 in the user's existing Chrome tab at `https://aaronwright-dot-ca.localhost/work/loopio`.

Image expansion is the largest observed bottleneck. Navigation also performs substantial synchronous React work, and closing the viewer produces a second stall when browser history changes.

## Measurements

| Interaction | Runs | Input-to-next-paint range | Median | Longest observed frame interval |
| --- | ---: | ---: | ---: | ---: |
| Horizontal navigation buttons | 3 | 240–336 ms | 312 ms | 250 ms |
| Vertical project navigation buttons | 3 | 360–624 ms | 384 ms | 250 ms |
| Expand image by double-click | 3 | 864–936 ms | 912 ms | 701 ms |
| Close expanded image, button or Escape | 3 | 56–232 ms | 120 ms | 417 ms |

Closing's input latency understates the problem: a later task, triggered after the closing animation, lasted 180–404 ms. It began approximately 447–544 ms after the initial input in the three trials.

Idle rendering had a 16.7 ms median frame interval, 17.4 ms p95, and no intervals over 25 ms in a 1.5-second baseline.

Additional input paths:

- Horizontal mouse drag successfully advanced FreshBooks. The release triggered a 173 ms long task, including about 160 ms in the carousel's mouse-up handler. Most other frame intervals stayed near 16.7 ms.
- Vertical wheel navigation successfully advanced Loopio to FreshBooks. It produced 209 ms and 326 ms tasks, with a 350 ms maximum frame interval. Wheel input does not supply the same interaction timing metric used in the table.
- Right-arrow keyboard navigation successfully advanced FreshBooks. The buffered Event Timing entry measured 240 ms to paint, with 175.4 ms processing and 5.4 ms input delay.
- A synthesized horizontal wheel gesture did not change slides. Its smooth idle-like measurements are excluded from successful navigation results; this trial does not establish whether a physical trackpad gesture works.

## Priorities

### 1. Reduce synchronous work before image expansion

The double-click handler occupied 447–574 ms. Within it, Chrome attributed 67–105 ms to forced style/layout. The initial transition animation-frame callback added 17–76 ms, including another 14–26 ms of forced style/layout. Both repeated opening and opening a different cached image reproduced the stall.

The profiled opening sampled about 305 ms in `renderRootSync` and 139.6 ms in `commitRoot`; these are inclusive samples, so they must not be added to nested component measurements. Lightbox setup, zoom sensors, GSAP matrix reads, and React development instrumentation appeared in the profile.

Inspect [viewer mounting](/Users/aaronwright/Projects/aaronwright-dot-ca/components/portfolio/presentation/PortfolioViewer.tsx), [opening transitions](/Users/aaronwright/Projects/aaronwright-dot-ca/components/portfolio/presentation/usePortfolioViewerTransition.ts:161), and [media geometry reads](/Users/aaronwright/Projects/aaronwright-dot-ca/components/portfolio/presentation/usePortfolioViewerTransition.ts:95). Candidate improvements are isolating the viewer update from the underlying portfolio tree, reducing work during viewer mount, and consolidating geometry reads before style writes. The profile supports investigating these paths; no optimization or resulting speedup was tested.

### 2. Limit navigation updates to the components that changed

Horizontal click handlers took 179–237 ms; vertical click handlers took 179–258 ms. Forced layout inside most of those handlers was only 2–8 ms, so layout is not the dominant cause of the initial navigation stall.

The horizontal CPU profile sampled about 139 ms in `renderRootSync`. It included the project index, the browser's project mapping, project carousels, screenshot components, and controls. The offscreen start-screen project index also appeared in the close profile. This is evidence of work reaching beyond the currently changing image, although sampling alone cannot count component renders or prove every inactive project rerendered.

Inspect [selection and route updates](/Users/aaronwright/Projects/aaronwright-dot-ca/components/portfolio/runtime/usePortfolioNavigationController.ts:70) and [the portfolio project tree](/Users/aaronwright/Projects/aaronwright-dot-ca/components/portfolio/presentation/PortfolioBrowserView.tsx:459). Check prop/callback stability and compiler cache invalidations, then isolate unaffected project and index subtrees. React Compiler is already enabled; adding blanket memoization without inspecting invalidations would be premature.

### 3. Remove the second closing stall while preserving history behavior

All three closes produced an additional stall in Next's `onPopState` path. Its script duration was approximately 174–380 ms; the enclosing long tasks lasted 180–404 ms. In the close CPU profile, synchronous React rendering accounted for about 146 ms.

The app calls `window.history.back()` in [finishViewerClose](/Users/aaronwright/Projects/aaronwright-dot-ca/components/portfolio/runtime/usePortfolioViewerController.ts:153), then its location handler restores selection and updates the route. Inspect whether closing triggers redundant selection, route, or tree updates. Preserve the intended Back/Forward behavior when addressing this; replacing history navigation without checking that behavior is not a verified fix.

## Development overhead and limits

- Existing Chrome tab; viewport 2293 × 1267 CSS pixels, DPR 1, dark theme, reduced motion off, no artificial CPU or network throttling added.
- This was a Next.js development build with browser extensions active. One pass per main interaction category also used a 1 ms JavaScript sampling profiler.
- React DevTools' `measureHostInstance` consumed about 106 ms of sampled self time during opening, 72 ms during vertical navigation, and 25–26 ms in the horizontal/close profiles. JSX development helpers were also prominent. These costs are part of this session, not proof of equivalent production costs.
- A production build and an extension-free browser comparison were not run. No server was started or restarted, and no browser extension or persistent preference was changed.
- Input-to-next-paint is based on Chrome Event Timing entries, grouped by the relevant interaction and rounded by the browser. It is not a field INP score and does not measure animation completion. Frame intervals come from a temporary requestAnimationFrame probe, not compositor presentation timestamps.
- Three runs per main interaction are diagnostic, not a statistically stable benchmark. The 1.5-second observation windows target input and transition work, not loading or long-term memory growth.
- An early probe recorded input-handler arrival rather than the event timestamp. The keyboard handler could therefore run before the probe's window began. Its 240 ms value above was recovered independently from a buffered Event Timing entry. The keyboard sample's missing long-task attribution is not evidence that there was no long task. Several intermediate CDP metric deltas were also discarded after a capture-state inconsistency; they are not used in the table or conclusions.
- Both offscreen videos were paused during baseline and the final inspection. The warning/error log read returned no entries. Loopio's working-prototype slide displayed the missing-media fallback during one horizontal trial; the other horizontal trials used rendered images.

## Individual interaction results

| Trial | Input-to-paint | Main-thread long tasks | Maximum frame interval |
| --- | ---: | --- | ---: |
| Loopio next, first | 336 ms | 210 ms | 200 ms |
| Loopio next, profiled, missing-media fallback | 240 ms | 180 ms | 167 ms |
| Loopio previous, warm | 312 ms | 238 ms | 250 ms |
| Loopio → FreshBooks | 384 ms | 181, 112 ms | 183 ms |
| FreshBooks → Informal, profiled | 624 ms | 260, 180 ms | 250 ms |
| Informal → Loopio, warm | 360 ms | 184, 90 ms | 183 ms |
| Expand FreshBooks invoice, profiled | 936 ms | 592, 108, 62, 60, 129 ms | 701 ms |
| Close invoice, button | 232 ms | 74, 92, 404, 50 ms | 417 ms |
| Expand invoice, warm | 912 ms | 466, 109, 111, 55 ms | 550 ms |
| Close invoice, button, profiled | 120 ms | 211, 55 ms | 233 ms |
| Expand FreshBooks client exploration | 864 ms | 458, 94, 131, 83, 106 ms | 550 ms |
| Close client exploration, Escape | 56 ms | 50, 180 ms | 201 ms |

## Cleanup

The original Loopio overview is restored, expanded mode is closed, and the temporary observers, animation-frame probe, and audit object were removed. The CDP profiling domains enabled for this audit were disabled. Application source was not changed for the audit.
