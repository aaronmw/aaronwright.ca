# Optimized-video release performance triage

## Observation

The [October 1 optimized-video run](../../qa/results/2026-10-01T23-50-11-175Z.md)
passed 104 unit tests, 106 browser checks, and every measured journey, but failed
two relative regression budgets for `phone-landscape-slow/image-viewer`:

| Metric | Baseline median | Allowed limit | Current repetitions | Current median | Change from baseline |
| --- | ---: | ---: | --- | ---: | ---: |
| Longest task | 75 ms | 125 ms | 153, 74, 170 ms | 153 ms | +78 ms / +104% |
| Longest animation frame | 91.4 ms | 141.4 ms | 174.4, 90.5, 171.7 ms | 171.7 ms | +80.3 ms / +87.9% |

Task duration median was 2190.5 ms versus 2097 ms (+93.5 ms / +4.5%). Each
repetition sampled 217–224 frames, so the p95 frame gap is not effectively a
single maximum. Baseline, failed run, and the [preceding passing run](../../qa/results/2026-10-01T23-39-52-044Z.md)
have matching environment and protocol fingerprints. The prior run is contextual
evidence from different source, not a measured noise distribution. These budgets
are local regression tolerances, not field INP or universal UX thresholds.

## Changed-code and observer inspection

Relative to the preceding passing release, application code is unchanged. The
only runtime change is recompression of Informal Systems' MP4; the other changes
are documentation and a browser test that finishes before measured journeys
start. The failing journey opens Aaron's Toolbox's Normalizer, switches to its
Overview, and closes the viewer. The media loader excludes inactive videos from
preloading; the new browser test confirms no video request on the menu. A request
log in the bounded diagnostic will check this during the actual measured journey.

The measurement code is unchanged: buffered Long Tasks and Long Animation Frames
observers collect durations, with requestAnimationFrame collecting frame gaps.
The same existing `settled` helper reads visible track geometry and may cause
layout work. No changed-code mechanism currently explains a new viewer slowdown;
that is evidence against attribution to this change, not proof of random noise.
The full preceding browser suite is slightly longer because it now verifies four
additional video journeys; effects on host state have not been established.

## Primary-source research

[Chrome's Lighthouse variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
identifies resource contention and browser nondeterminism as causes of variation
that DevTools throttling cannot eliminate. It supports controlled repeated
measurement, not a universal acceptable fluctuation percentage.
[Chrome's Long Animation Frames documentation](https://developer.chrome.com/docs/web-platform/long-animation-frames)
explains the 50 ms reporting threshold and script/style/layout attribution.
Duration-only observations cannot identify which work caused this spike; detailed
attribution should be recorded separately from release timings.

## Classification and bounded next step

**Inconclusive, with a suspected host/measurement effect; medium confidence.**
The application viewer and its assets are unchanged relative to the passing run,
but two of three current samples exceeded budgets. Release remains blocked.

Run one diagnostic batch against the existing optimized production build: three
fresh-context landscape journeys with exactly the current profile, task sequence,
and metric instrumentation, followed by one separate attribution run. Record all
results and video requests; do not mix the attribution run into timing medians.
If that batch fails to reproduce the excess and confirms that Informal Systems
is never downloaded, perform one complete release run. If the budget excess
persists, investigate the identified viewer work rather than repeatedly scanning.
No budgets, baseline, or task outcomes will be changed to obtain a pass.

## Bounded diagnostic result

The three untraced repeats measured longest tasks **123, 93, 69 ms** (median
**93 ms**, below 125 ms) and longest frames **138.3, 117.1, 83.2 ms** (median
**117.1 ms**, below 141.4 ms). Durations were 2079.4, 2018.0, 2090.9 ms.
All journeys completed without JavaScript, console, or HTTP errors. The request
log contained only Aaron's Toolbox and NextPhrase video URLs; Informal Systems
was never requested. Raw diagnostic evidence is retained in ignored
`test-results/qa/2026-10-01-video-diagnostic.json`.

The separate attribution run observed a 134.2 ms frame, including 100.2 ms in an
existing document click handler with 47.2 ms of forced style/layout, and a 6.7 ms
animation-frame callback with 2.3 ms of forced style/layout. These are entry-point
attributions, not proof of which nested application operation dominates. Its
timing is excluded from the three-repeat median. The click/layout work merits
attention if a future controlled investigation shows a persistent excess, but
the optimized Informal asset has no observed path into this journey.

A read-only host snapshot found an unrelated Chrome renderer using roughly 38%
CPU; macOS reported no thermal/performance warnings. This snapshot was taken after
the failure and cannot establish contention during it. No unrelated process was
stopped or modified.

The bounded batch did not reproduce the budget excess. **Likely variation in
existing viewer work or host scheduling, medium confidence; causal attribution
remains unproven.** Proceed with the single predeclared complete release run;
only its own passing receipt can authorize publishing.

## Complete release outcome and decision audit

The predeclared [complete follow-up](../../qa/results/2026-10-01T23-59-30-859Z.md)
passed: 104 unit tests, 106 browser checks, 14 unchanged capability skips, and all
72 performance samples. The landscape viewer's longest-task samples were 54, 95,
66 ms, with a 66 ms median. All configured comparisons passed without changing
budgets, baseline, instrumentation, or application code during investigation.

| Decision | Rationale and alternative | Confidence |
| --- | --- | --- |
| Reuse the shared deferred video player | Inactive videos already have no fetchable source; the new four-profile browser check verifies actual requests, playback, and pausing. A second loading implementation would duplicate working behavior. | High |
| H.264 MP4, original resolution, 30 fps, CRF 24, fast start | Preserves text detail and the complete recording while reducing transfer size 90.8%. Lowering resolution would sacrifice text detail; adding multiple codecs is unnecessary for this 7.55 MB asset. Full-file decoding and representative-frame inspection passed. | High |
| Keep the measured QA contract | The bounded diagnostic and one full follow-up provide new evidence without masking the failed receipt or accepting a replacement baseline. The earlier spike's exact cause remains unproven. | High for release evidence; medium for likely variability attribution |

No application-specific workaround or deferred implementation remains. A physical
iPhone and every possible connection speed were not tested; phone browser
emulation does not prove hardware performance. A previously visited video may
retain its source/buffer while paused, as the shared player intentionally permits.
Post-deploy verification will confirm the hosted asset and playback.

**Am I proud of this implementation? Yes.** It satisfies the request through the
existing shared owner, materially reduces bytes, and verifies the network
behavior. **Would I confidently stand behind it in production? Yes**, within the
recorded browser and performance evidence. **Verdict: ready to finalize.**
