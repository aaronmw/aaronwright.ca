# Release QA setup decision audit

Verdict: **ready with noted risks** for the QA infrastructure. The site itself is
blocked from release. Changes remain uncommitted; no deployment was attempted.

| Decision | Reason and alternative | Confidence |
| --- | --- | --- |
| Keep unit/browser tests and add fixed measured tasks; use agents for exploration and triage. | Repeatable actions support comparisons. A live LLM gate would introduce variable paths, latency, and possible assertion changes. An autonomous LLM gate is not implemented. | High |
| Six tasks, four viewports, three serial measurements per profile. | Covers both carousel axes, media loading/viewer, return-home and appearance. It is a bounded initial contract, not coverage of every project, breakpoint, resize, scroll handoff, or video control. | Medium |
| Chromium performance plus the existing Chrome/WebKit functional matrix. | Chromium exposes the throttling and timing APIs used here. Emulation does not reproduce real-phone GPU, thermal, Safari, or browser-chrome behavior. | High |
| Median comparisons with 30% and absolute noise allowances. | Avoids letting one noisy repetition fail a release. These initial tolerances need calibration; they are not acceptable UX limits. A slow baseline could otherwise pass. | Medium |
| Explicit baseline acceptance; missing/failed data blocks release. | Prevents a regression from silently becoming the new standard. No baseline was accepted because this site has failing checks. The passing comparison path is covered by unit fixtures, not yet by a clean site release. | High |
| Check the latest source-bound report in the Netlify build command. | Prevents ordinary builds using stale/partial evidence, including after staging additions/deletions. It also gates previews. Direct publishing can bypass repository commands; project instructions require the same check. This is a trusted-repository workflow, not tamper-proof attestation. | High |
| Test a locally built production server. | Avoids development-server compilation contaminating timings and ties the run to the checkout. A deployed-preview test would additionally cover Netlify adapters/CDN and hosting environment. Those remain outside this initial gate. | High |
| Preserve existing assertions and record their failures. | Several contracts disagree with current layouts and clamped navigation. Other failures involve gestures and an obstructed portrait home control. Intent must be established before changing those assertions or application behavior. | High |

## Verification

- Production build, TypeScript, and 96 unit tests passed.
- The full public browser matrix ran: 54 passed, 24 failed, 26 device skips.
- All 72 measured task attempts ran: 63 completed, 9 failed; remaining tasks
  recovered after a failure without clearing it or authorizing a release.
- Source fingerprint matches the final checkout. Tests verify that staging
  additions/deletions preserves it, while content changes alter it.
- Guard tests reject missing/duplicate/invalid samples, changed conditions, missing
  baselines, diagnostic runs, failed browser checks, and sustained regressions.
- CLI checks rejected both incomplete baseline acceptance and release without a
  valid baseline. No baseline file was created.
- Temporary server cleanup and whitespace checks passed. Framework-generated
  declaration changes were restored; no application code was changed.

## Pride gate

Am I proud of this implementation? **Yes**: it records reproducible evidence and
exposes failures instead of hiding them with retries or baseline updates.

Would I confidently stand behind it in production? **The blocking QA workflow,
with the limitations above; not a release of the site yet.** Reconcile the stale
contracts, investigate the gesture and home-control failures, address the slow
media experience, then obtain and review a complete passing baseline.

See [the findings](2026-09-18-initial-findings.md) and
[the recorded run](../../qa/results/2026-09-18T23-46-55-573Z.md) for evidence.
