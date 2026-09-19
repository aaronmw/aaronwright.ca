# Release decision audit — 2026-09-19

This audit updates the earlier [loader audit](2026-09-18-image-loader-decision-audit.md)
with the production-build verification and fixes made during the requested release.
The earlier audit is historical: background concurrency is now one and browser
verification has now been performed.

## Decisions

| Decision | Reason, alternative, and tradeoff | Confidence |
| --- | --- | --- |
| Keep the existing FiveByFive as the only visible progress indicator, with a stable random order and one square per 4% of decoded images. | Matches Aaron's requested treatment. Counts decoded images rather than bytes, so progress can be uneven. Failed images do not fill squares; the indicator retires when all attempts settle. Opening failures retain their existing recovery UI. | High |
| Use one background image worker and assign image sources through that queue or active-slide activation. | Network traces showed native lazy loading also fetched projects passed during vertical movement, competing with active video. An unoptimized Next Image did not enforce the intended queue. A native image retains the same frame, alt text, decoding, and fallback behavior; source assignment now owns request initiation. Active images retain immediate/high-priority loading. | High |
| Publish preload progress as nonurgent React updates. | Progress should not delay navigation. This preserves real completion counts without timing guesses or fabricated progress. | High |
| Keep videos on demand on every device; preserve already visited sources and positions. | Explicit user choice. Desktop width does not imply spare bandwidth. Pausing does not cancel data already being buffered. Known video dimensions avoid a metadata-driven first layout change. | High |
| Use a normal anchor for the résumé PDF. | The trace showed a Next route-prefetch request downloading the PDF during startup. The PDF is a file download, and the equivalent home contact link already uses an anchor. | High |
| Reencode the Toolbox preview at CRF 18 and move its metadata to the beginning. | The original was 1,059,950 bytes; the replacement is 295,785 bytes, about 72% smaller. Both retain 1920 × 1080, 30 fps, 91 frames, and 3.033 seconds. SSIM against the original was 0.999723 and representative frames were visually inspected. This is lossy compression, not a byte-identical remux. A fast-start-only remux was tried first but did not resolve bandwidth contention. | High |
| Constrain the wide description rail by available width and give stacked media a minimum share of height. | A landscape video had only a 10-pixel content width after fixed columns and padding. A short portrait viewport also reduced Loopio's portrait image to about 53 pixels wide. The shared wide rail now leaves half the usable width for media; stacked media gets up to 12rem minimum, capped at half the available height. Text remains scrollable. Desktop rail size and taller layouts retain their established proportions where space permits. | High |
| Enable CSS `content-visibility: auto` on project sections after startup completes. | Tracing showed offscreen sections participating in appearance-menu style/layout work. Applying containment after Embla initialization avoids hiding geometry during its initial measurements. Unsupported browsers render normally. This is progressive enhancement; it does not remove content from the accessibility tree. See [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility). | Medium |
| Keep carousel ends finite and retain the earlier drag, viewer-focus, and navigation-hit-area fixes. | Matches the explicitly confirmed behavior and repairs concrete failures. Fourteen remaining browser skips are seven mouse/wheel scenarios on each of two touch profiles; the measured journeys exercise actual Chromium touch events. | High |
| Aim horizontal QA swipes at the active media and vertical swipes at the section edge. | After correcting the landscape media size, the old fixed gesture point landed on the video seek control. Seeking there was correct behavior. The corrected task asserts it starts outside drag-locked controls and retains the same distance, duration, and navigation outcomes. The protocol fingerprint changes, requiring a reviewed baseline. | High |

## Verification scope and remaining limitations

- The focused responsive check passes in all four browser profiles. It now waits
  for loaded media before checking actual image/video dimensions, preventing a
  temporary placeholder rectangle from producing a false pass.
- Direct production-build inspection confirmed the loader has no visible text,
  preserves filled squares, reaches 25 squares, and fades after completion. It
  also confirmed no video request on the home screen and playback on activation,
  across desktop, small laptop, and WebKit portrait/landscape. The later short
  portrait layout fix was separately inspected at 393 × 659.
- React Doctor remains 90/100 with two reviewed maintainability warnings: the
  colocated FiveByFive shuffle export and ScreenshotMedia's existing complexity.
  Media activation was extracted into a small helper to avoid increasing the
  component's size warning; no diagnostic was suppressed for this release.
- Browser emulation and CPU/network throttling are not physical iPhone testing.
  The diagnostic frame gaps are not INP or a visual smoothness guarantee.
- Image loading is still slow on the constrained network. The relative baseline
  detects change; it is not an acceptable-experience target.
- Video dimensions are authored metadata and must be updated when replacing those
  assets. Previously activated videos can continue buffering while paused.
- No Supabase configuration or database migration applies to this project.
- Historical failed reports are retained. The initial 16:37 UTC run was
  interrupted after the browser checks to investigate video contention and has
  only ignored raw evidence, not a fabricated complete report.

## Final release evidence

The complete [final run](../../qa/results/2026-09-19T17-49-52-819Z.md)
matches source fingerprint
`5508c7bcce3cde962fe7fe6077d776b4474da081da76fa543ed35c7da0ad4b85`.
Production build and TypeScript succeeded, all **102 unit tests** passed, and the
browser matrix finished with **90 passed, 14 documented skips, zero failures and
zero flaky retries**. All **72 measured samples** completed with no task or runtime
errors. The environment matches the previous baseline. Whitespace checks pass.

The automatic comparison correctly blocks because the swipe target correction
changes the protocol fingerprint. To avoid concealing an unrelated regression,
the final medians were separately checked against every historical threshold,
without modifying the old baseline or either report. Only one exceeds its old
limit: desktop `choose-project` longest animation frame is **53.2 ms**, compared
with a **50 ms** limit and no long-frame entry in the old baseline. The median
task duration is effectively unchanged: 1,597 ms versus 1,592 ms.

| Slow profile | Startup, old → current | Video project opening, old → current | Next image, old → current |
| --- | --- | --- | --- |
| Small laptop | 9.48 s → 5.29 s | 1.59 s → 1.69 s | 22.89 s → 8.75 s |
| Phone portrait | 9.35 s → 4.78 s | 1.63 s → 1.62 s | 18.66 s → 8.50 s |
| Phone landscape | 9.46 s → 5.29 s | 1.52 s → 1.62 s | 22.77 s → 8.58 s |

The next-image task uses the corrected gesture target, so its historical comparison
is indicative, not a claim of an identical protocol. Startup, project selection,
viewer, and appearance actions are unchanged. Medians do not eliminate outliers:
the first slow-laptop repetition recorded a 240 ms main-thread task during project
selection, while the other two recorded none. All raw samples remain in the JSON.

The earlier six regressions were reduced to the single 3.2 ms threshold excess
above. No tolerance, assertion, required outcome, or skip policy was relaxed.
The accepted baseline replacement is for the corrected interaction protocol and
the explicitly requested image-only/on-demand-video loading contract, with that
remaining desktop-frame tradeoff disclosed. **Aaron authorized proceeding with
deployment after reviewing this remaining tradeoff.** The complete final run is
now the accepted baseline; the previous baseline remains in the historical
reports. The normal release check must still pass for the unchanged tested sources.

## Pride gate

I am proud of the requested loader and the concrete loading/layout fixes, and I
would stand behind the implementation in production with the disclosed
performance tradeoff. The full functional matrix passes, failed runs remain
visible, and baseline acceptance preserves the normal release gate.

**Verdict: ready with noted risks.** Aaron confirmed proceeding with deployment
after the baseline question. The baseline acceptance and this audit are committed
before pushing and publishing the release.
