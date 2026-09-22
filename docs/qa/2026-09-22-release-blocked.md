# September 22 release QA

Historical blocked assessment. The subsequent measurement correction and release
disposition are recorded in [the follow-up audit](2026-09-22-release-audit.md).

Aaron authorized deploying all current changes: smart punctuation, appearance-menu
exit sequencing, and the repaired resume with its export helper. Nothing was
committed, pushed, or published because the required performance gate failed.

## Verification

- React Doctor: 100/100 for changed files, no findings.
- Production build and TypeScript: passed in both release runs.
- Unit tests: 104 passed in both runs.
- Resume helper: Python syntax check passed. Prior PDF validation is recorded in
  [resume-export.md](../resume-export.md); no PDF content was changed in this task.
- [First run](../../qa/results/2026-09-22T17-18-02-595Z.md): 96 browser passes,
  two failures from one selector still using the old straight apostrophe, and the
  14 documented touch-profile skips. The selector now matches `Aaron’s Toolbox`.
  Its text-selection and wheel assertions are unchanged.
- [Second run](../../qa/results/2026-09-22T17-24-49-062Z.md): 98 browser passes,
  14 documented skips, and all measured journeys completed. Performance comparison
  still failed, so this is not a release receipt.

Repeated failures include throttled-laptop appearance p95 frame gaps (115.5 ms
against an 87.5 ms limit in the second run), landscape-phone appearance p95 frame
gaps (91.5 ms against 86.5 ms), and portrait-phone viewer long tasks (60 ms against
50 ms). The reports retain the additional failures and all raw measurements.
No tests, budgets, or baseline values were weakened or replaced.

## Focused diagnosis

An ignored diagnostic script reused the existing QA journeys and laptop profile
against the current production build, then against committed revision `e9d6b35`
in a temporary worktree with the same locked dependencies. Each run owned and
stopped its temporary loopback server on port 3032. The worktree was removed after
copying its diagnostic evidence out.

Trace and long-animation-frame data were recorded in the ignored
`test-results/release-profile/` directory. Later Playwright runs cleared that
temporary directory; the quantitative findings below are the retained summary.
Tracing adds overhead, so these single samples are explanatory evidence, not
replacement release measurements. Both versions spent substantial time opening
the appearance menu and recalculating layout. The current trace also attributed
roughly 47–48 ms of forced style/layout work per sampled callback to QA's
`settled()` helper, which reads every carousel track, including offscreen tracks
inside `content-visibility: auto` sections. The changed close-before-theme-apply
sequence changes when this observer overlaps the color transition. This warrants
further isolation; it does not establish that the failed gate is spurious.

## Decision audit

- **High confidence:** retain literal smart punctuation in authored copy and update
  the exact text selector. No runtime converter or changes to code/URL syntax are
  needed for the current copy correction.
- **High confidence:** keep the new appearance sequencing and its passing tests.
  Reverting it merely to seek a passing benchmark would lose the intended fix.
- **Medium confidence:** forced offscreen geometry reads contribute to the frame
  costs. The comparative traces support investigation but cannot separate all
  application work, observer overhead, and run variance.
- **High confidence:** block publication with the current performance evidence.
  Changing rendering or measurement semantics needs a documented, validated fix;
  replacing the baseline solely to pass would violate the release contract.
- **Pride gate:** the scoped copy correction and retained evidence are sound, but
  I would not stand behind publishing this release while its mandatory gate fails.

**Verdict: needs follow-up before finalizing.**

Follow-up: [research-backed performance triage](2026-09-22-performance-triage.md)
separates borderline threshold misses from repeatable measurements, documents
small-sample and observer effects, and identifies the relevant release-code path.
