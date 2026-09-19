# FiveByFive image loader decision audit

## Decisions

| Decision | Reason and alternative | Confidence |
| --- | --- | --- |
| Use the existing FiveByFive with a full-grid variant and one shuffled reveal order per mount. Fill `floor(25 × loaded / total)` cells. | Matches the requested 4% steps without reshuffling previously filled squares; preserves existing logo, navigation, and scrubber variants. | High |
| Show no visible loading text; retain progress semantics and descriptions for assistive technology. | Matches the requested visual treatment while keeping the indicator accessible. Existing startup error recovery remains available. | High |
| Measure successfully decoded image count, not downloaded bytes. | The existing readiness pipeline provides this signal. Byte-level reporting would require a different loading mechanism and would not represent decode readiness. Large images can make progress uneven. | High |
| Start image preloading during startup, then continue showing the same loader in the bottom-left gutter while the site is usable. | Waiting for every image would delay browsing. The opening scene retains its own readiness gate; background workers retain concurrency two. Browser scheduling and opening requests can exceed two simultaneous network requests. | Medium |
| Remove videos from speculative queues and omit their source until activation, on every device. | `preload="none"` alone is a browser hint. An explicitly opened video can load during startup; visited videos retain their source and position when paused. Already-started buffering is not forcibly cancelled. | High |
| Continue the image queue after an individual failure, without filling a square for that failure. Hide the background indicator once all attempts settle. | Avoids blocking browsing, falsely reporting successful loading, or leaving an idle loader permanently visible. Critical opening failures still show the existing recovery UI. | High |

## Verification and limitations

- All 101 unit tests passed, including random 4% thresholds, preservation of filled cells, absence of visible loader text, image-only queues, explicit video deep links, and inactive video markup without a source.
- Production build passed; final TypeScript and whitespace checks passed.
- React Doctor: 90/100, two maintainability warnings. The non-component shuffle export is intentional colocation with FiveByFive geometry (high confidence). ScreenshotMedia complexity is a valid maintenance observation; the added source guard preserves playback position and does not justify a broader refactor here (high confidence).
- No browser, responsive, network, playback, or performance verification was run for this change. Loader placement and fade timing still need visual review.
- `pnpm qa:check` correctly blocks release because the previous measured report no longer matches this checkout. The baseline was not replaced. A fresh authorized QA run is required before shipping.

## Pride gate

I am proud of the implementation within the verified scope. I would confidently stand behind the approach, but would not ship this checkout before visual review and refreshed measured QA, especially because preload timing changed.

**Verdict: needs follow-up before finalizing** — visual review and fresh release evidence remain. Changes are left uncommitted for review.
