# Fixed-light portfolio release — October 30, 2026

Aaron requested unconditional light mode and shipping the complete working tree,
then explicitly authorized release QA and deployment if it passed.

## Release scope

The complete release includes shared fixed-light surfaces and focus treatments,
white browser theme metadata and favicon, removal of the standalone copy editor,
intake and brochure pages, shared project/About action links, logo-to-About
navigation, clipped tile/visited-badge refinements, normal-speed idle video
playback and its development control, and the authored Gift Exchanges excerpt.
Inline development tools remain development-only.

Fixed-light rendering is owned by shared CSS tokens and `color-scheme: only light`;
there is no OS listener or persisted theme preference. This also opts out of
browser automatic dark recoloring, per [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme).
Authored media fades and brand-colored actions keep their intentional colors.
Loading states consume the same tokens and retain their existing geometry.

## Verification record

React Doctor changed-scope scan: 91/100, no introduced findings. Production build
and TypeScript compilation passed. The initial run
`2026-10-31T02-55-23-229Z` caught a stale export assertion expecting no Gift
Exchanges excerpt. It was stopped before performance measurement and is retained
as blocked evidence. The assertion now checks the authored 1.16–8.89 second range
and export preservation; all 28 composition tests pass. TASKS.md records this
intentional content-contract correction. No performance protocol, baseline or
budget was changed.

Bootstrapper owns release QA run `432DBE08-7682-4AD7-A43F-E154652AF2AF`.
Aaron's existing `dev:lan` service was left running and untouched. No database
is configured for this portfolio.

## Performance triage before confirmation

Receipt [2026-10-31T02-56-22-307Z](../../qa/results/2026-10-31T02-56-22-307Z.md)
passes 249 unit tests, all 80 browser cases and 72 journeys without errors, but
fails two of 96 metric comparisons. Environment and protocol hashes match the
accepted baseline `2026-10-30T01-01-36-132Z`.

- Desktop/open-project longest animation frame: baseline 0/0/0 ms, candidate
  52.9/0/52.2 ms, median 52.2 ms versus a 50 ms limit (+2.2 ms over limit).
  Percentage versus zero is undefined. Zero means no qualifying event, not zero
  work. Duration median changes 2112.9 to 2129.0 ms (+16.1 ms, 0.8%); p95 stays
  16.8 ms, long tasks stay zero, and rAF intervals over 50 ms stay zero.
  Candidate frame counts are 122/123/121; baseline 123/121/122.
- Laptop/close-viewer p95: baseline 33.4/33.3/33.3 ms, candidate 50/50/50 ms.
  Median rises 16.7 ms (50.2%) and exceeds the 43.3 ms limit by 6.7 ms.
  Candidate frame counts 34/37/36 versus 36/34/36; each sample in both runs has
  exactly one gap over 50 ms. Nearest-rank p95 is the second-worst interval in
  these short samples. Duration median rises 700.2 to 732.3 ms (+32.1 ms, 4.6%),
  longest-task median 50 to 54 ms, and longest-frame median 72.2 to 83.6 ms.

Changed-code review: fixed colors remove theme branching and do not introduce
measurement or transition scheduling. The normal-speed idle videos and Gift
Exchanges excerpt can change decode/seek scheduling when grid playback resumes;
this is a plausible workload cause, not demonstrated attribution. Tile masks,
sibling badge opacity transitions and shared action-link layout could change
paint/style work. About-only controls are absent during these failing journeys.
The measurement implementation and readiness boundaries are unchanged. The
existing observer and rAF sampling overhead remains part of both measurements.
The earlier October 29 same-chunk close-viewer miss shows a similar quantized p95
pattern, but different-source history is not a noise distribution or proof here.

[Chrome's LoAF documentation](https://developer.chrome.com/docs/web-platform/long-animation-frames)
explains the 50 ms reporting threshold and why several shorter tasks plus render
work may produce an entry without a long task. The desktop result is close to
that reporting boundary; it cannot establish a 52 ms increase in actual work.
[Chrome's variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
identifies browser nondeterminism and resource contention even without code
changes. Neither source supplies a universal acceptable noise percentage or
waives this project's budgets.

Classification: inconclusive, medium confidence. Threshold/sampling effects are
plausible, and changed video/paint workload remains a competing explanation.
Predeclared next step: exactly one complete confirmation run with unchanged
application, measurement code, profiles and baseline, retaining both receipts.
If it fails, stop release and report the unresolved performance evidence; do not
repeat until green, relax budgets or replace the baseline. A passing confirmation
must still be reviewed alongside this failure before finalization.

## Confirmation infrastructure interruption

Both focused development appearance cases passed against Aaron's existing server.
That separate Playwright invocation used its default output directory and cleared
`test-results/`, interrupting confirmation `2026-10-31T03-07-16-067Z` while the
QA runner wrote `unit.log`. Its build and 249 unit tests passed; no browser or
performance samples were taken. Tracked reports are retained, but the ignored
screenshots/logs previously under that directory were removed by the test tool.
Bootstrapper's independent logs retain the earlier execution output. This was an
agent orchestration error, not an application or performance failure. Restart the
single predeclared confirmation without concurrent test commands; future separate
test invocations must specify their own nested output directory.

## Confirmation and decision audit

The unchanged confirmation
[2026-10-31T03-08-06-026Z](../../qa/results/2026-10-31T03-08-06-026Z.md)
passes build/typecheck, 249 unit tests, all 80 browser cases, all 72 journeys and
all 96 performance comparisons. `pnpm qa:check` passes for source `9930e88ba404`.
Desktop/open-project LoAF samples are 0/0/0 ms; laptop close-viewer p95 samples
33.4/33.4/33.3 ms, median 33.4 ms. Laptop close duration median is 682.6 ms.
No application code, measurement, profiles or accepted baseline changed between
complete runs; TASKS.md gained the required triage record. The earlier misses did
not reproduce. This supports scheduling/measurement variation, but does not
identify its cause or prove absence of all performance risk. Both complete
receipts and the interrupted receipts remain tracked.

- **Fixed-light ownership (high confidence):** shared CSS tokens, `only light`
  metadata, and fixed favicon implement Aaron's request from first paint. System
  selection and persisted themes are intentionally unsupported. Browser checks
  cover light/dark OS settings and live changes in grid, viewer, Notes and About;
  focused development checks also pass. Loading geometry stays coupled to the
  same tokens. Media and brand actions retain intentional authored colors.
- **Complete-tree release (high confidence):** include the existing navigation,
  action-link, tile, video and authoring-page changes as requested. Deleted pages
  return 404; inline tooling stays development-only. Preserve export data/scripts.
  The Gift Exchanges test now asserts its authored range instead of silently
  omitting the segment assertion.
- **Performance disposition (medium confidence):** one predeclared confirmation
  passes unchanged budgets, while the first miss remains evidence. No repeated
  scan-until-green, baseline replacement or assertion relaxation was used. The
  existing approximately 24-second constrained cold load is deferred, as before.
- **Remaining validation:** hosted deployment/redirect/assets and visual smoke
  are pending. Physical-device ergonomics and subjective visual acceptance are
  not claimed by browser emulation. The output-directory orchestration error is
  documented above; recovered Bootstrapper logs are stored with affected runs.

Pride gate: yes, proud of the shared implementation and willing to stand behind
it in production with the noted cold-load limitation and pending hosted checks.
Verdict: **ready with noted risks**. Aaron's explicit authorization to run release
QA and deploy if it passes permits proceeding through the audit without a pause.


