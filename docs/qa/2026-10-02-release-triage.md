# October 2 release triage

The [first complete run](../../qa/results/2026-10-02T16-16-36-105Z.md)
passed 104 unit tests and completed all 72 measured journeys without application
errors. The browser matrix had 104 passes, two failures, and the existing 14
capability skips. Release remains blocked.

## Quick performance evidence

The protocol/configuration and recorded environment match the accepted baseline:
macOS 25.6.0, Apple M1 Pro, 10 cores, Chromium 151.0.7922.34, Node 22.23.2.
The table contains every crossed limit, in milliseconds; samples are in run order.
These are relative regression budgets, not independently established UX targets.
Zero means no qualifying entry was observed, not that the browser did no work.

| Profile/task | Metric | Baseline median | Allowed limit | Repetitions | Current median | Absolute/percentage increase | Frames sampled |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| desktop/choose-project | maxLongFrameMs | 0.0 | 50.0 | 60.9, 61.7, 0.0 | 60.9 | +60.9 / undefined from zero | 186, 188, 187 |
| small-laptop-slow/cold-entry | maxLongTaskMs | 281.0 | 365.3 | 374.0, 400.0, 439.0 | 400.0 | +119.0 / +42.3% | 172, 169, 150 |
| small-laptop-slow/cold-entry | frameGapP95Ms | 34.1 | 44.3 | 41.8, 57.5, 83.7 | 57.5 | +23.4 / +68.6% | 172, 169, 150 |
| small-laptop-slow/image-viewer | maxLongTaskMs | 67.0 | 117.0 | 109.0, 180.0, 166.0 | 166.0 | +99.0 / +147.8% | 220, 217, 215 |
| small-laptop-slow/image-viewer | maxLongFrameMs | 83.4 | 133.4 | 131.9, 180.7, 190.3 | 180.7 | +97.3 / +116.7% | 220, 217, 215 |
| small-laptop-slow/vertical-navigation | maxLongTaskMs | 0.0 | 50.0 | 17975.0, 0.0, 59.0 | 59.0 | +59.0 / undefined from zero | 271, 262, 256 |
| small-laptop-slow/appearance | frameGapP95Ms | 84.1 | 109.3 | 124.2, 137.3, 133.0 | 133.0 | +48.9 / +58.1% | 29, 29, 30 |
| phone-portrait-slow/cold-entry | maxLongTaskMs | 158.0 | 208.0 | 399.0, 327.0, 278.0 | 327.0 | +169.0 / +107.0% | 146, 141, 154 |
| phone-portrait-slow/image-viewer | maxLongTaskMs | 61.0 | 111.0 | 164.0, 139.0, 158.0 | 158.0 | +97.0 / +159.0% | 224, 257, 217 |
| phone-portrait-slow/image-viewer | maxLongFrameMs | 76.7 | 126.7 | 180.9, 163.0, 156.7 | 163.0 | +86.3 / +112.5% | 224, 257, 217 |
| phone-portrait-slow/appearance | frameGapP95Ms | 82.5 | 107.3 | 133.5, 116.7, 109.0 | 116.7 | +34.2 / +41.5% | 31, 35, 35 |
| phone-landscape-slow/cold-entry | maxLongTaskMs | 277.0 | 360.1 | 425.0, 457.0, 403.0 | 425.0 | +148.0 / +53.4% | 162, 148, 166 |
| phone-landscape-slow/choose-project | maxLongFrameMs | 0.0 | 50.0 | 0.0, 52.5, 58.2 | 52.5 | +52.5 / undefined from zero | 213, 185, 215 |
| phone-landscape-slow/image-viewer | maxLongTaskMs | 75.0 | 125.0 | 159.0, 180.0, 335.0 | 180.0 | +105.0 / +140.0% | 221, 212, 222 |
| phone-landscape-slow/image-viewer | maxLongFrameMs | 91.4 | 141.4 | 158.2, 178.8, 343.1 | 178.8 | +87.4 / +95.6% | 221, 212, 222 |
| phone-landscape-slow/appearance | frameGapP95Ms | 66.7 | 86.7 | 133.3, 124.3, 125.6 | 125.6 | +58.9 / +88.3% | 35, 33, 36 |

Appearance has relatively few frames per repetition; its p95 can therefore be
close to the largest sampled gap. The small-laptop vertical-navigation outlier
was a 17,975 ms task, but the three-run median was 59 ms. Neither may be silently
removed. Different-source historical passes are context, not a noise distribution.

## Changed-code and observation triage

The shared scrollbar changed from a decorative div/thumb to native vertical
range inputs. It still reads viewport geometry and writes thumb height during
indicator updates. The added native controls and their style/layout work are a
plausible application path into startup, viewer, and theme rendering; no
attribution evidence yet confirms that path. The shared icon sizing and new
Prev/Next slots alter header geometry. The media-surface extraction retains
separate animation layers; rounded borders now resize to retain frame thickness.
The updated Informal Systems video remains deferred and is not the asset used
by the measured viewer journey. All four browser profiles passed its loading test.

The measurement implementation, task boundaries, throttling, and budgets are
unchanged. Existing settling still reads visible tracks; duration-only metrics
cannot distinguish application work, observer work, and host scheduling.

Two read-only host snapshots after QA found roughly 96–98% CPU busy, load
averages above 100, and heavy memory compression. A one-second process sample
showed an independent Node process using 286.7% CPU. No unrelated process was
stopped. These post-run observations support a possible environment contribution
but cannot establish contention at the time of any particular failing sample.
The Chromium browser failure occurred during page-fixture creation, before the
test navigated to the site, which is separate evidence of a test-host problem.

## Primary-source research

[Chrome's Lighthouse variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
explains that concurrent work and browser nondeterminism affect measurements and
are not eliminated by DevTools throttling. It supports controlling host load
before repeating measurements, not dismissing a particular increase as noise.
[Chrome's Long Animation Frames documentation](https://developer.chrome.com/docs/web-platform/long-animation-frames)
explains the 50 ms reporting threshold, style/layout timings, and script
attribution. Recorded maximum durations alone cannot establish a causal function;
attribution identifies entry points, not necessarily the expensive nested work.
Neither source supplies a universal acceptable fluctuation percentage for this
site or replaces its configured budgets with INP thresholds.

## Browser layout evidence and bounded next step

Landscape WebKit measured the Loopio narrative region at 23 px high, below the
existing greater-than-40-px assertion. The retained trace shows the slide controls
on an additional header row, leaving one visible narrative line. The new 30 px
standalone icon slots are larger than the former text arrows; compact header
slots and spacing need to preserve the text-control row's footprint. This is a
suspected application layout regression, with medium confidence until verified.

Performance attribution is **inconclusive**, with a suspected host contribution
and a plausible application contribution. Do not run another batch while the
machine remains saturated. Make the narrow shared-header correction, complete
non-browser checks, and then run one complete release QA once host load improves.
Retain both reports. If the corrected layout or performance limits still fail,
hold publication and investigate the remaining specific failures; do not rerun
until one passes or change the baseline, budgets, assertions, or instrumentation.

## User direction and focused verification

Aaron requested that additional performance measurements be skipped and reported
that the site feels fine in his browser. The release diff cannot establish the
stronger claim that performance is unaffected: native range controls add browser
work, icon slots changed header layout, and shaped viewer borders can resize
during animation. Their contribution to the failed timings remains unproven.
No additional performance batch was run and no accepted baseline was changed.

The shared icon component now provides label-sized square slots for text buttons.
The existing compact-header container query reduces navigation gaps to one
character. Standalone and keyboard icon sizing retain their existing slots; the
glyph canvas remains 75% of its configured size. This fixes the header footprint
at the shared owner instead of changing the landscape assertion or individual
project layout.

After the correction, TypeScript, the production build, and whitespace checks
passed. React Doctor remained at 93/100, with the same pre-existing complexity
warning in ScreenshotMedia. A focused run of the existing layout and browser
history tests passed all eight checks across Chromium desktop, WebKit desktop,
WebKit portrait, and WebKit landscape. It used one worker, no retries, and its
own OS-assigned loopback server, which was stopped on completion. Evidence is in
ignored `test-results/qa/2026-10-02-focused-functional/`; the [small committed
receipt](2026-10-02-focused-functional.json) records the source hash and confirms
that the checkout stayed unchanged during the run.
This focused diagnostic is not a complete release receipt.

## Decision audit

| Decision | Rationale and alternative | Confidence |
| --- | --- | --- |
| Keep one shared media surface with explicit clip kinds | Images and videos use the same framing owner. Recorded radii scale with the media; the frame token controls border thickness. Project-specific markup would duplicate the same treatment. | High |
| Retain the corrected 1544 × 1064 H.264 edit and deferred player | The complete 59.10-second file decodes and matches metadata. A separately implemented player or automatic background video loading would add unnecessary behavior. | High |
| Use native range controls for persistent scrollbars | Provides native pointer and keyboard behavior within the existing shared scroll owner. Existing geometry synchronization remains necessary; a bespoke drag controller would add logic. Performance equivalence to the decorative thumb is not established. | High for semantics; medium for runtime cost |
| Give text-navigation icons label-sized slots and compact spacing | The larger standalone slots wrapped the landscape header and squeezed narrative space. The correction applies to all shared project headers and passed representative checks in all four profiles. Keeping the larger slots would require a broader header/layout redesign. | High |
| Retain failed QA evidence and request a release exception | Host saturation is plausible but not proof of a harmless change. The user requested no more performance measurements; a release exception is more candid than weakening budgets or marking the failed report successful. | High |

The current tree has not had a complete passing release scan. The shared scrollbar
does not have a dedicated pointer-drag/keyboard test, and Firefox and physical
iPhone behavior were not checked. The emulated browser matrix does not establish
physical-device performance. The unrelated existing media-function complexity
warning remains; no cleanup was added to this release.

**Am I proud of this implementation? Yes**, including the shared-owner correction
and retained failure evidence. **Would I stand behind it in production? Yes for
the verified functionality, with the performance limitation explicitly accepted;
I would not claim performance equivalence.**
**Verdict: ready with noted risks**, conditional on Aaron's explicit approval of
the audit and a one-release exception to the blocked QA gate. Future releases
retain the existing complete QA requirement.

## Approved release exception

Aaron explicitly approved the audit and instructed that this release be shipped
with the one-release exception to the failed/stale QA receipt. The failed report
is retained. No further performance measurements, baseline replacements, relaxed
budgets, or changed assertions are authorized by this exception.

The local Netlify production build passed using `pnpm build` for this one
operation, then restored the repository's `pnpm qa:check && pnpm build` command
before commit and push. Deployment will publish the packaged local build with
`--no-build`.
The normal committed release gate remains in force for subsequent releases.
