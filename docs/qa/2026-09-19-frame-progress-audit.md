# Startup and background progress decision audit

## Decisions

| Decision | Reason and main alternative | Confidence |
| --- | --- | --- |
| Gate reveal on fonts, settled carousel layout, and the initial route's visible media. | The menu needs no images. A deep link needs its active image or video, not earlier projects' images. Waiting for the entire portfolio would delay usable text. Layout gets two frames after font/media readiness; there is no minimum spinner duration or entrance fade. | High |
| Show six lit perimeter squares stepping clockwise in the existing FiveByFive. | CSS opacity steps simulate motion without rotating the grid or scheduling React updates. A full circuit takes 1.2 seconds. Reduced motion shows the same six-square shape statically. Startup is indeterminate; image completion is a separate signal. | High |
| Share one frame-progress component and context across the page and contact dialog. | Both pairs of bars have the same semantic role. Context also reaches the portaled dialog without threading progress through memoized menu components. Independently styled bars could diverge. | High |
| Fill by successfully decoded image count. | This reuses measured image readiness. Byte progress would need a different loading mechanism and would not include decode readiness. Large files can make progress uneven; failures leave their share grey and expose an accessible status. | High |
| Keep videos on demand on every device. | A video deep link counts as an explicit request. Other videos are excluded from the background queue; previously visited video may retain its source and buffer. | High |

## Verification and limits

- All 104 unit tests passed, including menu/deep-link preload scope, matching
  frame fills, failure reporting, and the text-free startup shape.
- Production build and TypeScript checks passed. React Doctor reported no issues
  in changed code (97/100).
- Generated CSS was checked for local animation-duration resolution and the
  six-of-sixteen-step keyframes. All sixteen phases preserve a contiguous,
  clockwise-moving six-square shape.
- Release run [2026-09-20T04-52-03-839Z](../../qa/results/2026-09-20T04-52-03-839Z.md)
  passed all 104 unit tests, 90 browser tests, and 72 measured task samples without
  errors. The existing 14 mouse/wheel exclusions on touch profiles remain.
- The first release attempt was interrupted after discovering two readiness-check
  mistakes: a temporary hidden streaming copy matched the page selector, and
  viewer deep links correctly made the underlying chrome transparent. Checks now
  target the visible page and assert opacity of the requested surface (viewer or
  page). No visitor outcome, budget, or capability coverage was removed.
- The new baseline was reviewed and accepted because the startup contract and
  executable readiness protocol intentionally changed. Both the interrupted and
  complete run remain recorded. `pnpm qa:check` passes for source
  `d11d25e9ae33169ee4b7aeff5d63afb133369611d1005480b3635b4ded10f164`.
- These checks cover emulated browsers and throttling. Physical-device behavior
  and subjective spinner appearance remain outside the automated evidence.

## Baseline review

The machine, browser, and Node environment match the prior baseline. Budgets and
measurement implementation are unchanged. Informal comparison with the previous
protocol shows faster median cold entry in every profile:

| Profile | Previous | Current |
| --- | ---: | ---: |
| Desktop | 1463 ms | 877 ms |
| Slow laptop | 5288 ms | 4847 ms |
| Phone portrait | 4782 ms | 4337 ms |
| Phone landscape | 5288 ms | 4855 ms |

Two observations required review before accepting this changed protocol:

- Startup p95 frame gaps increased on desktop (10.3 to 41.7 ms) and phone portrait
  (16.8 to 33.1 ms). The observation window now ends before the removed fade:
  desktop samples fall from roughly 125–128 to 54–55 frames and portrait from
  218–228 to 151–157. Desktop gaps above 50 ms fall from one per run to zero in
  two of three runs; portrait remains four per run. Median longest frames remain
  about 279 ms on desktop and decline from 2224 to 2205 ms on portrait. This
  supports a changed sample distribution, not evidence of added long stalls.
- Slow-laptop viewer median longest task is 53 ms versus a prior median of zero,
  exceeding the old informal comparison allowance by 3 ms. Zero means no task
  crossed the Long Tasks API's 50 ms reporting threshold. The previous individual
  samples were 0/58/0 ms and current samples 53/51/55 ms. Median total duration is
  1981 versus 2000 ms, longest frame 65.8 versus 67.1 ms, p95 frame gap stays
  10.3 ms, and each run still has one gap above 50 ms. The evidence supports
  near-threshold variability; this is recorded rather than hidden by a budget
  change. Confidence in that interpretation: medium.

The baseline replacement is for the intentional loading/protocol change, with
these observations reviewed explicitly. It is not a claim that startup is free
of main-thread stalls or that slow-network image navigation is now fast.

## Pride and verdict

I am proud of this implementation: readiness, indeterminate startup feedback,
and background progress each have a clear purpose and share existing primitives.
I would stand behind the design in production, with the remaining emulation and visual-review limitations above. This changes loading feedback and startup
scope; it does not reduce image sizes or guarantee a faster slow-network download.

**Verdict: ready with noted risks.** The measured release gate passes; the user has
requested commit and deployment after reviewing the implementation audit.
