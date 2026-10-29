# Decision audit: staged grid release

**Verdict: ready with noted risks.** Aaron explicitly instructed on October 29:
“We're working to replace that route anyway. Just ship it” and “So long as the
portfolio contents don't change, I don't really care how it performs. I want the
new /grid-version route on production ASAP.” This authorizes this release's
remaining legacy-performance exception and continuation through the review gate.
It does not waive portfolio content/URL/media preservation or functional checks.

## Meaningful decisions

| Decision | Reason and alternative | Confidence |
| --- | --- | --- |
| Restore published content, URLs, assets and share cards; place updated equivalents in the grid's model. | Preserves the existing portfolio while retaining the new work. Duplicating the entire legacy implementation would create another maintenance boundary. The original Informal video matches published bytes. | High |
| Keep shared components with legacy defaults and explicit grid presentation. Scope grid colors/list sizing to the page, viewer portal and transition overlays; load its About font only there. | Retains canonical primitives while preventing global styling leakage. Global overrides would change the existing portfolio. Cross-route browser checks and published-page comparisons pass. | High |
| Include the selected dependency upgrades in this one site build. | Matches the approved plan. Both portfolio versions share the runtime, so route isolation alone cannot prove the upgrades harmless. Functional coverage passes; timing validation remains unresolved. | High for functionality; medium for performance |
| Cache video timeline snapshots between native media events; preserve keyboard return focus after inert removal; normalize at most one microsecond of endpoint overshoot. | Fixes observed WebKit React update loops, cold-link focus loss and duration-rounding rejection. The alternatives—suppressing errors, arbitrary delays or shortening saved clips—would hide or specialize the problems. Unit checks and all four browser/device profiles pass. | High |
| Update stale grid assertions to the current ten-project, single-cover composition; observe each background video playing independently. | Preserves the authored grid already in the working tree. Simultaneous playback assertions incorrectly required nine independent segmented seek cycles to align. Existing portfolio assertions and performance budgets are retained. | High |
| Keep an independent published-source reference and retain every failed result. | Browser/OS changes required comparable measurements. Neither the candidate nor a selected slower run is accepted as a baseline. The final paired comparison passes 95 of 96 metrics. | High |
| Correct startup observation to detect the complete visible-ready state on animation frames, retain 200 ms geometry settlement, then capture metrics before assertion round trips. | Playwright's assertion retry backoff added variable idle samples. Every original functional assertion still runs and blocks a failing receipt. Both builds use identical instrumentation; budgets remain unchanged. | High |
| Ship with Aaron's newly authorized legacy-performance exception. | The only remaining comparison misses its existing limit by 1.57 ms (66.7 versus 65.13 ms). Aaron explicitly prioritizes shipping while preserving content. We stop optimization experiments and retain the normal repository QA gate; the local packaging operation alone uses `pnpm build`. | High for authority and functional safety; no claim of performance equivalence |


## Verification and remaining work

- TypeScript, 266 unit checks and all 146 release browser scenarios pass, with 14
  existing capability skips and no retries. React Doctor remains 92/100, with two
  unchanged maintainability warnings in development-only editor components.
- Published home, About, Informal Systems and NextPhrase comparisons pass across
  desktop/mobile and light/dark profiles. Inspected screenshots preserve content,
  layout and media framing. Loading-progress borders vary with network progress.
- The production build keeps `/` redirecting to `/work`, legacy NextPhrase at
  `/work/nextphrase`, and distinct old/new video URLs. Grid deep links, `/v2`
  queries, keyboard/history behavior, reduced motion, noindex, sitemap exclusion
  and absence of production editing controls pass.
- The final complete receipt is [2026-10-29T18-15-00-867Z](../../qa/results/2026-10-29T18-15-00-867Z.md), source fingerprint
  `b43877022b9883d23d1e7d700f0bdfd85021bb6eefb9ff0d37fd195db1624eef`.
  All 266 units and 146 browser cases pass, with 14 unchanged capability skips,
  72 timing samples and no journey/browser errors. The baseline is not replaced.
  `qa:check` remains blocked by the older measurement configuration; the matching
  published-source comparison has just the one laptop startup p95 miss above.
- The [calibration record](2026-10-29-paired-calibration.md) retains the failed
  evidence, corrected attribution and rejected bundle experiments. No experimental
  bundler setting or Webpack switch is included in the release. The original
  development server remains untouched; diagnostic servers have exited.
- Physical-phone behavior and development-editor browser suites remain outside
  the production receipt. Both requested browser engines and mobile orientations
  cover the visitor release contract.
- Verify and lock Netlify's current published deployment before pushing, commit
  the complete release/evidence, push main, package with the one-operation build
  exception, publish the verified build, and check live routes/media. Keep
  `6abfdf405a2b121236f0bbbc` as the rollback target.

## Pride gate

**Am I proud of this implementation?** Yes: the preservation boundary is explicit,
the browser failures were repaired at their causes, and failed evidence remains
visible.

**Would I confidently stand behind it in production?** Yes, for the approved
content-preserving staged release. The existing portfolio remains intact and
functional coverage passes. The small remaining lab-performance miss is explicitly
accepted by Aaron; it is not relabeled as a passing performance result.
