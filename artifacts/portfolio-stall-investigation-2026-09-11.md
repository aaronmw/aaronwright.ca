# Portfolio stall investigation

Investigated September 11, 2026, after committing the completed portfolio work as `f6ac0b8` (`Refine portfolio styling and improve navigation performance`). No application code was changed during this investigation.

## Findings

The remaining pauses have at least two different causes. Viewer setup and teardown still execute meaningful synchronous work. Separately, Chrome sometimes spends a long wall-clock interval inside a renderer task while using very little main-thread CPU. Treating every long task as expensive portfolio JavaScript would misdiagnose those second pauses.

### Intermittent browser-side waits

Separate Chrome timeline recordings captured these events on the portfolio renderer's main thread:

| Interaction | Task begins after input | Task wall time | Main-thread CPU time | Attribution |
| --- | ---: | ---: | ---: | --- |
| Expand image | 391 ms | 117.789 ms | 9.154 ms | Approximately 109 ms between the animation callbacks and the style update; no corresponding long JavaScript callback |
| Expand image, second trace | 514 ms | 99.229 ms | 7.245 ms | Approximately 85 ms between `BeginMainFrame` and `UpdateLifecycle`; the callbacks together took less than 0.3 ms |
| Vertical navigation | 220 ms | 114 ms | 7 ms | Chrome's compositor `Commit` accounts for 107.003 ms wall time and 3.367 ms CPU |

Here `Commit` is Chrome's rendering/compositor event, not React's `commitRoot`. CPU values come from trace `tdur`, not from JavaScript sampling or requestAnimationFrame intervals.

These are confirmed blocked/descheduled intervals rather than continuous execution of a long application callback. The trace does **not** distinguish precisely between scheduler contention, synchronization with other browser threads, GPU/compositor waiting, or another cause of the wait. It does not establish that every earlier outlier had the same cause. Tracing also adds overhead; these diagnostic runs are excluded from the timing samples below.

The previous 367 ms horizontal frame gap and the 237 ms task 1.3 seconds after closing did not recur at those sizes. Smaller late tasks did recur: 85 ms at +1.19 seconds and 108 ms at +2.39 seconds after vertical navigation, and 83 ms at +3.59 seconds after expansion. Those particular unprofiled tasks do not have sufficient attribution to assign a cause.

### Repeatable viewer teardown

Closing still produces a task around 411–434 ms after input, after the animation has largely completed. The four unprofiled trials recorded principal teardown tasks of 102, 101, 87, and 77 ms. A warm-up recorded 118 ms at +447 ms.

In the first three trials, the Long Animation Frame observer attributed the principal task to Next's `onPopState`. In the fourth, React's scheduler performed the main 77 ms task before a separate, much smaller `onPopState` callback. This matters: the work is not simply a slow routing function. The pending React update, Lightbox unmount, and history traversal can be processed together or separately depending on scheduling.

A separate close CPU profile, restricted to +400–650 ms, showed approximately:

- 42 ms sampled inclusive time in React rendering and 86 ms in committing.
- 40 ms within the React DevTools extension's commit handling, including 37 ms in `measureUnchangedSuspenseNodesRecursively`.
- 28 ms in native `focus`, called from Lightbox's portal cleanup through React Aria's focus wrapper.

These sampled inclusive times overlap and must not be added. They are diagnostic sampled durations, not the trace's thread CPU measurements above.

Installed Lightbox code confirms that its portal restores the previously focused element during cleanup. The portfolio then attempts to focus the image source and focuses the main keyboard surface in a requestAnimationFrame callback. Focus therefore has multiple owners. This is a concrete app-side follow-up candidate, but this investigation did not establish how much a single-owner implementation would save. Any change must preserve keyboard access, focus restoration, and scroll position.

Next's installed history code dispatches its supported traversal action on `popstate`. Bypassing that integration or replacing Back with a URL rewrite would change behavior and is not justified by these results.

### Viewer opening

Three warmed, unprofiled expansion trials reported 248–320 ms input-to-paint. The initial mount tasks lasted 181–246 ms. A separate profile still showed Lightbox setup, development-mode React work, garbage collection, and React DevTools measurements. For example, sampled Lightbox `detectRTL` time was approximately 23 ms, while React DevTools' unchanged-Suspense measurement used approximately 38 ms. The transition callback itself was generally much smaller in the unprofiled trials: 6–10 ms.

Further project memoization is unlikely to address all of this: the previous audit already verified that unchanged project carousels do not execute when the viewer opens or closes. A cleaner environment comparison is needed before deciding whether viewer lifecycle changes are worth their complexity.

## Unprofiled timing samples

Existing Chrome tab, existing local Next development server, 2293 × 1323 CSS pixels, DPR 1, dark appearance, normal motion. No viewport, extension, server, or persistent browser-setting changes. The viewport was 56 px taller than the previous audit, so this is an attribution exercise rather than a controlled before/after comparison.

The probe observed four seconds after the triggering event. Event Timing durations below are the maximum reported interaction duration for that action. Frame intervals come from requestAnimationFrame, not compositor presentation timestamps. Long-task records were filtered by their start times; Long Animation Frame records were filtered by overlap with the input window. The probe captured script source, invoker, execution time, and forced layout time. No visibility changes occurred in the action windows.

| Action | Input-to-paint samples | Median | Largest observed frame interval |
| --- | --- | ---: | ---: |
| Horizontal, alternating the first two Loopio slides | 72, 80, 104, 80, 120, 96 ms | 88 ms | 51 ms |
| Vertical, FreshBooks / Informal Systems / Loopio | 104, 168, 168 ms | 168 ms | 116 ms |
| Expand FreshBooks invoice image | 320, 288, 248 ms | 288 ms | 250 ms |
| Close viewer | 96, 88, 128, 176 ms | 112 ms | 117 ms |

An initial four-second idle control recorded no long tasks or frame intervals above 30 ms. Warm-ups, CPU profiles, and timeline recordings are excluded from this table. The fourth close trial followed a completed trace session, so it is less directly comparable to the first three. This is a small exploratory sample, not a production INP assessment.

Resource records in the measured action windows were favicon requests; no project-media download appeared in those records. This does not prove that all network or background activity was absent.

## Recommended next step

Compare the same interactions in a production build and with React DevTools excluded from the test browser, changing one condition at a time. That would quantify the development/extension contribution before another viewer refactor. No server or extension was changed in this investigation.

If material teardown work remains, investigate a single focus-restoration owner first, with explicit keyboard and Back/Forward verification. Consider changing viewer mount lifetime only if production measurements still show costly setup; keeping the viewer mounted would trade opening latency for retained DOM, listeners, and memory. No unsupported history workaround or animation removal is recommended.

## Cleanup

Temporary observers were removed, CPU profiling and Performance collection were disabled, and all timeline recordings completed without event truncation. The original Aaron's Toolbox section was restored with the viewer closed. The final warning/error log check returned no entries. The investigation adds only this report; the unrelated extracted source-image bundle remains untracked.
