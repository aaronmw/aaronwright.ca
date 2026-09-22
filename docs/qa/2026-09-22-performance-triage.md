# Performance failure triage — September 22

This records the assessment before Aaron requested the menu/timing correction.
See [the follow-up audit](2026-09-22-release-audit.md) for that implementation,
validation, and baseline decision.

## Assessment

Some of the reported misses are plausible threshold noise. The appearance result
is a repeatable measured increase, but a user-facing regression attributable to
this release is not established. **Suspected measurement effect, medium confidence;
application contribution remains unresolved.** The release gate remains blocked.

Evidence: [first run](../../qa/results/2026-09-22T17-18-02-595Z.md),
[second run](../../qa/results/2026-09-22T17-24-49-062Z.md), and
[earlier trace investigation](2026-09-22-release-blocked.md). Both release runs use
the baseline's recorded environment and protocol. The sole change between their
application checkouts was a browser-test selector correction; application code
was unchanged. Only one historical three-repetition run matches the current
protocol/environment, and it is the accepted baseline itself. That is insufficient
history to establish this site's normal run-to-run distribution.

| Observation | Evidence | Interpretation |
| --- | --- | --- |
| Borderline long-frame failures | 50.1 or 50.4 ms against 50 ms; desktop cold-entry long frame 365.7 ms against 362.7 ms | Plausible ordinary variation; low confidence in a new regression from these values alone. |
| Laptop appearance p95 frame gap | Baseline: 67.3, 67.3, 84.3 ms. Current six repetitions: 108.3–116.5 ms; run medians 116.2 and 115.5 ms. Limit: 87.49 ms. | Current samples do not overlap the three baseline samples. The latest median is 28.0 ms / 32% above the limit and 48.2 ms / 72% above baseline. This is more than a marginal threshold crossing. |
| Laptop appearance frame counts | Baseline: 34–42 frames per task. Current: 16–25. | Our nearest-rank p95 is the worst frame at 16 samples, and second worst at 22–25. This is a sparse upper-tail statistic, not a stable estimate of typical interaction latency. |
| Laptop appearance completion time | Baseline median 748.5 ms; current run medians 610.3 and 715.3 ms | Whole-task duration improved while the upper-tail frame-gap measure worsened. These measure different aspects of the interaction. |
| Landscape-phone appearance p95 | Current repetitions span 59.2–125.0 ms; run medians 116.8 and 91.5 ms | Greater variability than the laptop result; not enough evidence for an exact normal-noise allowance. |
| Portrait-phone viewer long task | Baseline values all 0; current run medians 58 and 60 ms | Repeated threshold crossing. Zero means no qualifying long task was reported, not an actual zero-cost task; a percentage increase from zero is not meaningful. |

## Research and code attribution

[Google's Lighthouse variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
describes resource contention and browser scheduling as sources of variation that
DevTools throttling does not eliminate, and recommends repeated, aggregated
measurements. This supports comparing distributions, but supplies no normal
percentage for our custom interaction metrics. We already have two batches;
another undirected full run would add little causal evidence.

The [Long Tasks specification](https://www.w3.org/TR/longtasks-1/) reports tasks at
the approximately 50 ms boundary. Our `scripts/qa/measure.mjs` represents an empty
set as zero. This explains why a small change around that boundary can look like
a jump from zero to 50-plus milliseconds. It does not make every such task harmless.

The deployment includes a relevant scheduling change:
`components/portfolio/PortfolioThemeMenu.tsx` now applies the selected theme when
the exiting popover detaches, and `styles/globals.css` fades the scrim during exit.
The QA appearance task waits for the theme and menu states before calling
`settled()`. Consequently, the new sequence can change both the measurement window
and how its geometry polling overlaps the theme transition. This is a plausible
mechanism, not proof of additional application work.

`scripts/qa/tasks.mjs` reads all carousel tracks with `getBoundingClientRect()`
every animation frame, including offscreen descendants of the
`content-visibility: auto` project sections. [Chrome's guidance](https://web.dev/articles/content-visibility)
warns that DOM APIs forcing rendering can defeat skipped offscreen work. Existing
traces attributed about 47–48 ms of forced style/layout per sampled callback to
that helper. This is direct evidence of observer cost and a plausible contributor
to the result; it does not quantify the uninstrumented user experience.

The punctuation changes may affect text shaping/wrapping, but the traces do not
attribute the slowdown to them. The resume PDF/export helper has no observed
execution path in the appearance journey. Single traced comparisons against the
committed version found expensive layout in both versions; their overhead and
sample size prevent treating them as proof of equivalence or ordinary variation.

## Next diagnostic and disposition

Before modifying animation behavior or repeating full release QA, isolate the
geometry observer's contribution in matched base/current diagnostics. Preserve
the user-visible completion contract, use identical instrumentation for each
comparison, and record all runs. This can distinguish a real added cost from a
measurement-window/observer interaction. Do not claim a universal web-performance
norm, dilute p95 by adding idle frames, or recalibrate solely to obtain a pass.

The new triage requirement is in `AGENTS.md` and `TASKS.md`. No benchmark algorithm,
budget, baseline, or application behavior changed in this follow-up. Documentation
changes to those release inputs require fresh QA before a later publication.
