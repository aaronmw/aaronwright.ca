# September 22 menu and QA correction

Aaron requested fixing the menu and/or adjusting expected timings after the
close-before-apply change. His earlier instruction to deploy all changes also
covers the smart punctuation and repaired resume/export helper.

## Changes and rationale

The appearance menu retains its lifecycle-based fix: selecting an option closes
the menu and fades the scrim before changing the theme. Its rows keep their order
and colors during exit. Focus restoration, current-option dismissal, persistence,
and reduced motion remain part of the browser contract.

The QA observer previously read every carousel track on every animation frame,
including descendants of skipped offscreen sections. It now observes the outer
track, in-view project tracks, and viewer. Section boxes still establish which
tracks are visible during navigation. The same 200 ms geometric-stability window
is retained. A regression check makes an offscreen descendant's geometry read
throw while requiring a visible 600 ms animation to reach its final position.

Appearance completion now awaits the actual CSS animations/transitions on the
visible theme surfaces, trigger, and scrim, then checks scrim opacity and focus.
Canceled transitions are re-enumerated so replacements must finish too. No idle
frames are appended to dilute the p95 statistic. The browser tests use a longer
theme transition to verify that the helper waits, plus the reduced-motion path.

These changes correct observer overhead and align completion with the intended
interaction. They do not quantify how much faster the uninstrumented application
became. Protocol version 2 intentionally invalidates version 1 timing comparisons;
CPU/network profiles, three repetitions, and every regression allowance remain
unchanged. Historical failed reports remain in the repository.

The [earlier triage](2026-09-22-performance-triage.md) records changed-code research
and measurement caveats. [Chrome's content-visibility guidance](https://web.dev/articles/content-visibility)
supports avoiding rendering-forcing descendant reads. Native
[getAnimations](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations)
and [Animation.finished](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished)
provide completion signals; cancellation must be distinguished from completion.

## Decision audit

| Decision | Reason and alternative | Confidence |
| --- | --- | --- |
| Retain close-before-apply menu behavior | Preserves the intended exit sequence. Reverting to immediate theme application would restore the visible reorder/flash. | High |
| Restrict geometry reads to relevant visible tracks | Preserves actual navigation settlement while avoiding forced offscreen work. Increasing timing budgets would leave the observer defect in place. | High |
| Await actual theme transitions | Completion follows the current interaction, including reduced motion and canceled/replaced transitions. Fixed sleeps or idle sampling would hide timing problems. | High |
| Establish a reviewed version 2 baseline | Both observation cost and the appearance completion boundary changed, so version 1 is not directly comparable. Keep all numeric regression allowances. | High for the protocol change; medium for the stability of a three-run baseline |

This remains a relative lab diagnostic, not an absolute user-experience guarantee.
Sparse p95 samples, host contention, and approximately 50 ms long-task reporting
thresholds can still cause borderline comparisons. Emulated phone tests do not
establish physical iPhone performance. Future failures require the documented
evidence/diff/research triage rather than automatic acceptance or repeated reruns.

## Verification and baseline review

Complete run: [2026-09-22T20-56-00-092Z](../../qa/results/2026-09-22T20-56-00-092Z.md),
source fingerprint `a04ef9794bb050b1368fb33cbe7ac5bddf74fea200359fc03da9ef20184970fc`.
Production build/TypeScript and 104 unit checks passed. The browser matrix passed
102 checks with the same 14 documented touch-profile exclusions. All 72 measured
journeys completed, with no JavaScript, console, HTTP, or task errors. The 12
targeted observer/menu checks also passed before the complete run. React Doctor
reported 100/100 for the release's changed React code in the earlier validation.

Appearance measurements under the corrected completion contract:

| Profile | Median duration | Median p95 frame gap | p95 values, all three repetitions | Frames per repetition | Median longest task |
| --- | ---: | ---: | --- | --- | ---: |
| Desktop | 453.1 ms | 9.4 ms | 9.4, 8.9, 9.4 ms | 51, 52, 53 | 0 ms |
| Throttled laptop | 743.4 ms | 84.1 ms | 116.9, 84.1, 74.2 ms | 33, 35, 34 | 120 ms |
| Throttled portrait phone | 779.4 ms | 82.5 ms | 58.5, 99.6, 82.5 ms | 41, 38, 35 | 107 ms |
| Throttled landscape phone | 728.8 ms | 66.7 ms | 66.7, 67.2, 66.6 ms | 36, 38, 35 | 100 ms |

These are plausible diagnostic timings for the sequential close/theme transition,
but the throttled long tasks and sparse upper-tail variation still exist. They
are not evidence of perfectly smooth animation. Many steady frame gaps in this
run are around 9 ms, versus roughly 17 ms in earlier reports; scheduling/display
cadence is another potential confound. Because the observer and completion window
also changed, a direct before/after speedup claim would not be justified.

The full report additionally retains cold-entry durations of about 4.5–5.1 seconds
and horizontal media journeys of about 8.6–8.8 seconds on the deliberately slow,
uncached network profiles. This recalibration does not declare those absolute
times ideal or remove them from future regression comparisons.

The only initial release blocker was the incompatible version 1 baseline. The
report is complete and its source fingerprint matches the checkout. Accepted this
complete version 2 run for the intentionally corrected measurement protocol and
close-before-apply behavior, with all existing tolerances unchanged. Its original
`blocked` status remains historical; `pnpm qa:check` re-evaluates the accepted
baseline rather than rewriting a recorded run. `pnpm qa:baseline` accepted it and
`pnpm qa:check` then passed for source `a04ef9794bb0`.

**Pride gate:** yes, proud of the scoped observer correction and lifecycle-based
menu fix; confident standing behind their tested behavior in production. Remaining
risks are lab-metric variability, throttled long tasks, and unverified physical
device behavior, not an unresolved functional failure.

**Verdict: ready with noted risks.** The reviewed baseline is accepted and the
release gate passes; continue the already-authorized deployment.
