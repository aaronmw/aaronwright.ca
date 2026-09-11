# Portfolio performance improvements

Implemented September 10, 2026. The existing Chrome tab and local development server were used throughout. The current animations, zoom controls, route format, and browser history integration remain in place.

## Final measurements

Five unprofiled runs per interaction, after warm-up, at 2293 × 1267 CSS pixels, DPR 1, dark theme, and normal motion. Each observation window extends 1.5 seconds after the triggering event. Input-to-paint uses Chrome Event Timing, grouped by interaction; frame intervals use requestAnimationFrame and are not compositor presentation timestamps.

| Interaction | Earlier median | Final median | Final range | Largest final frame interval |
| --- | ---: | ---: | ---: | ---: |
| Horizontal navigation | 312 ms | 128 ms | 88–264 ms | 367 ms |
| Vertical navigation | 384 ms | 128 ms | 112–136 ms | 84 ms |
| Expand image | 912 ms | 312 ms | 256–416 ms | 350 ms |
| Close image: initial response | 120 ms | 88 ms | 88–104 ms | 167 ms |

The main task after the closing animation fell from 180–404 ms to 85–116 ms; its final median was 107 ms. It still exists. One close also recorded a later 237 ms task approximately 1.3 seconds after input, without enough attribution to identify its cause. One horizontal trial had substantial surrounding main-thread activity and a 367 ms frame interval. Both outliers are retained in the results.

These are directional development comparisons, not production INP scores. The earlier audit had three runs per category, including one profiled run, while these five final timing runs exclude CPU profiling and coverage instrumentation. Navigation fixtures overlap but are not identical: final horizontal trials alternate the two available Loopio images, and final expansion trials use the FreshBooks invoice image. The earlier horizontal trials included one missing-media fallback. Browser extensions and other desktop activity were left unchanged; their variable overhead contributes to the spread.

Earlier audit: [portfolio-performance-audit-2026-09-10.md](/Users/aaronwright/Projects/aaronwright-dot-ca/artifacts/portfolio-performance-audit-2026-09-10.md).

### Individual final runs

| Interaction | Run | Input-to-paint | Maximum frame interval | Long tasks in the observation window |
| --- | ---: | ---: | ---: | --- |
| Horizontal | 1 | 264 | 367 | 170, 76, 185, 174 |
| Horizontal | 2 | 128 | 67 | 66 |
| Horizontal | 3 | 88 | 33 | none |
| Horizontal | 4 | 176 | 100 | 94 |
| Horizontal | 5 | 88 | 33 | none |
| Vertical | 1 | 128 | 83 | 93 |
| Vertical | 2 | 128 | 83 | 77 |
| Vertical | 3 | 112 | 67 | 66 |
| Vertical | 4 | 120 | 84 | 81 |
| Vertical | 5 | 136 | 84 | 93 |
| Expand | 1 | 312 | 284 | 247, 52, 51 |
| Expand | 2 | 256 | 200 | 173, 56, 50 |
| Expand | 3 | 400 | 334 | 320 |
| Expand | 4 | 280 | 234 | 203 |
| Expand | 5 | 416 | 350 | 308, 64, 56 |
| Close | 1 | 88 | 150 | 85 |
| Close | 2 | 88 | 133 | 107, 237 |
| Close | 3 | 88 | 167 | 116 |
| Close | 4 | 104 | 117 | 102 |
| Close | 5 | 104 | 117 | 107 |

All durations are milliseconds. A task starting within the window can finish beyond it; its full duration is listed, while the following animation-frame timestamp can fall outside the window.

## Changes and render evidence

- Cached project slide models separately from initial-route calculations, cached resolved narratives and viewer slides, and stabilized media registration/loading callbacks. Removed unused readiness-derived React updates while preserving asynchronous loading, retries, and errors.
- Added stable component boundaries for the start screen, project carousels, and unchanged project narratives. Project-specific slide callbacks are created within the project boundary instead of the parent mapping. All Embla containers remain mounted.
- Reduced viewer preload distance from two neighbours to one in each direction. The existing background loading queue remains intact.
- Captured transition geometry before style writes and made transform calculation use captured rectangles. Closing during an opening transform recovers the resting geometry; pending opening frames are cancelled. Closing controls and media now share a timeline for cleanup.
- Suppressed duplicate viewer notifications while retaining the first notification needed to reconcile a deep-linked modal URL. Skipped unchanged selection work during viewer navigation and pending-history close reconciliation. Next's history API integration remains intact.

Separate precise-coverage checks confirmed:

| Action | Project carousel executions | Screenshot media executions | Media registration calls |
| --- | ---: | ---: | ---: |
| Horizontal slide change | 1 | 2 | 0 |
| Vertical section change, including target-slide reset | 2 | 2 | 0 |
| Open viewer | 0 | 10 | 2 |
| Close viewer | 0 | 2 | 2 |

The start-screen/index and unchanged narrative components did not appear as executed in the final horizontal coverage result. The viewer's two registration calls correspond to its current image and available immediate neighbour at the first slide; closing unregisters those elements. ScreenshotMedia can execute multiple times during mounting as cached dimensions and lightbox state settle. Coverage is diagnostic and excluded from timing measurements. A hot reload and an input timeout invalidated intermediate coverage attempts; those attempts are not used above.

Separate CPU profiles still show Lightbox setup, GSAP matrix reads, focus work, and React DevTools overhead. In the final expansion profile, sampled inclusive renderRootSync time was approximately 92 ms versus 305 ms in the original audit; the transition's beginWhenReady callback was about 11 ms versus 75 ms. Closing's sampled renderRootSync time was about 44 ms versus 146 ms. These inclusive values overlap nested work and must not be summed. Profiling itself increased measured interaction times, which is why these runs are excluded from the timing table.

## Verification

Passed:

- TypeScript: `pnpm exec tsc --noEmit`.
- 28 unit tests across portfolio domain, viewer activation, Embla adapter, wheel axis locking, and page activity. Added normal and interrupted transition-geometry cases.
- `git diff --check`.
- Live Chrome: horizontal and vertical buttons; arrow-key navigation; horizontal dragging; vertical wheel navigation; repeated expansion/closing; Back closes and Forward reopens the viewer; viewer image navigation updates the underlying selection; closing returns to that image.
- Direct expanded-image links retain `?modal=image` after initialization. Added this regression case to the existing E2E file and executed the scenario through the connected browser. The command-line cross-browser E2E suite was not run.
- Zoom to 2×, panning without changing images, and reset to 1× on image navigation.
- Escape while the viewer was visibly in its `opening` phase: viewer removed, underlying chrome opacity restored to 1.
- Narrow viewport at 390 × 844: navigation and expansion/closing worked; the expanded frame stayed within the viewport with 30 px side insets.
- Reduced-motion expansion and Escape closing.
- Final browser warning/error log read returned no entries; both offscreen videos were paused.

Horizontal wheel input did not provide a reproducible slide change in this automation, matching the earlier audit limitation. No physical-trackpad result is claimed. The successful horizontal drag and keyboard paths were verified independently.

React Doctor reported 89/100 with 17 maintainability warnings: 16 warnings about explicit memoization with React Compiler enabled, and the existing ScreenshotMedia complexity warning. The memoization warnings are retained and not suppressed: explicit identities/boundaries were used for the measured render churn. They are maintainability tradeoffs, not a clean diagnostic pass; the scan did not report correctness or accessibility errors. No pre-implementation score was captured in this pass, so no before/after score claim is made.

## Decision audit

| Decision | Rationale and alternative | Confidence |
| --- | --- | --- |
| Stabilize data and add scoped render boundaries | Fixes observed propagation into unaffected projects and media refs. Relying entirely on compiler inference had allowed fresh data/callback identities and mapped children to invalidate caches. Explicit memoization adds dependency maintenance. | High |
| Keep all carousel containers mounted | Preserves Embla measurements and gesture behaviour. Virtualization would require a broader carousel rewrite. | High |
| Preload one viewer neighbour per side | Reduces mount work while keeping the next swipe destination available. Two neighbours consume more synchronous work; mounting only the current image risks a blank neighbour during a swipe. | Medium |
| Retain geometry-driven animation | Preserves the requested source-to-expanded motion and zoom integration. Measurements are batched instead of replacing the transition with a simpler fade. | High |
| Keep native/Next history integration | Preserves Back/Forward and direct links. Avoids changing the product's history contract merely to hide a delayed task. The remaining task is reduced, not eliminated. | High |
| Keep the first viewer notification | Live verification exposed its role in reconciling initial carousel routing. Subsequent duplicate notifications are ignored. | High |

Remaining limits: development-only timings, extension/desktop noise, residual Lightbox/focus/commit work, no cross-browser suite run, and the horizontal-wheel automation limitation. Missing media and supporting tooling remain outside this change.

Pride gate: yes, the implementation addresses the observed broad render churn and preserves the tested interaction behaviour. I would stand behind the scoped code change, with ordinary cross-browser release verification; I would not present these development measurements as a production performance guarantee.

Verdict: **ready with noted risks**. Changes remain available for review; nothing was committed or deployed.

## Cleanup

The existing tab is back at `/work/loopio`, expanded mode is closed, the viewport is back to 2293 × 1267, reduced-motion emulation is cleared, and temporary performance observers and profiling/coverage instrumentation are removed or disabled. No development server, preview server, browser extension, or persistent preference was started, stopped, or changed.
