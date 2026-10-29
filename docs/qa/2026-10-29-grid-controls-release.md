# Grid controls and project details release

## Scope and decision audit

**Verdict: ready with noted risks.** Aaron requested committing all current work
and deploying the updated grid while preserving the published portfolio. The
actual public route remains `/grid-version`; `/` still redirects to `/work`.
He authorized the release QA server/browser run, then instructed: “But don't get
caught up on performance differences unless they're significant.” This release
proceeds with the small timing misses below recorded, without changing the
accepted baseline, assertions, budgets, or permanent Netlify build gate.

| Decision | Reason and alternative | Confidence |
| --- | --- | --- |
| Keep grid fonts, viewer styles, project links, and viewed history in the mosaic scope. | Avoid changing the existing portfolio. Shared icon additions are opt-in and retain the old defaults; the new red token is additive. Duplicating shared icons would create another styling owner. | High |
| Use the canonical icon component for viewer play/pause and close; remove fixed 22px overrides. | Restores the same glyph metrics as Notes. Pause sits flush against the scrubber while Notes retains its existing separation. | High |
| Save viewed project IDs in a grid-specific browser storage key after the viewer opens. | Gives persistent local feedback without an account or backend; blocked storage falls back to this visit's state. No Supabase is configured. | High |
| Publish the current site bundle after verifying the unchanged portfolio routes. | Netlify deploys the site as one bundle, so route-specific source changes still require checks of shared behavior. All published-content/presentation comparisons pass. | High |
| Accept the small timing misses for this operation under Aaron's stated release priority. | One complete run and the matching-protocol reference show no task-duration budget failures; no repeated scan or optimization experiment is warranted for these margins. Causal attribution remains uncertain. | Medium for performance attribution; high for functional verification |

Am I proud of this implementation? **Yes:** the shared icon treatment is reused,
the grid boundary is preserved, and the test evidence is retained candidly.
Would I confidently stand behind it in production? **Yes, with the timing caveat
below.** This does not claim a passing standard QA gate or performance equivalence.

## Verification

- TypeScript passed; React Doctor's changed-scope scan reports 97/100 with no findings.
- The production build and all 266 unit tests passed.
- All 146 release browser checks passed; 14 existing device-capability skips.
  Published home, About, Informal Systems and NextPhrase content/presentation
  match the frozen published reference in desktop/mobile and light/dark cases.
- All 72 measured journeys completed with zero errors and unchanged source/build
  fingerprints. [Full receipt](../../qa/results/2026-10-29T22-13-07-686Z.md).
- Additional desktop (1440×900) and phone (390×844) browser checks confirmed
  zero gap between play/pause and the scrubber, identical Notes/pause icon slots
  and glyph sizing, play/pause behavior, the Loopio destination, and viewed badges
  persisting through reload. Both screenshots were inspected. Local evidence:
  `test-results/grid-controls-release/` (ignored).
- Bootstrapper QA run `E72A1AE8-E79A-49E7-8048-5C6992E128BE` finished and its
  temporary server exited. The existing `dev:lan` service was left untouched.
- Physical-device acceptance, storage-denied/cross-tab history races and the
  development-only editor are outside this release's browser checks.

## Bounded performance triage

`pnpm qa:check` rejects the incompatible September accepted baseline. Fresh
evidence is complete. Comparison against the recorded, complete
[corrected-protocol reference](2026-10-29-corrected-reference.json) uses the same
configuration, machine, OS, browser and Node version, but a different measurement
time. It passes 93 of 96 comparisons, including every task-duration comparison.

| Metric | Reference repetitions (ms) | Candidate repetitions (ms) | Candidate median / limit |
| --- | --- | --- | --- |
| Slow laptop cold-entry frame-gap p95 | 50.0, 50.1, 83.3 | 100.0, 66.7, 66.6 | 66.7 / 65.13 |
| Slow phone portrait viewer longest task | 0, 0, 0 | 50, 53, 51 | 51 / 50 |
| Slow phone portrait appearance frame-gap p95 | 49.9, 50.0, 50.0 | 66.7, 66.6, 66.7 | 66.7 / 65.0 |

The frame-gap increases are about one display interval (16.6–16.7 ms, roughly
33%); their budget exceedances are 1.57–1.7 ms. Laptop startup duration is
4545.3 versus 4392.8 ms (+152.5 ms, 3.5%). The appearance percentile uses only
23–27 frames in the candidate and 25–30 in the reference. A recorded zero for a
long task means no qualifying observation, not zero main-thread work; the viewer
samples sit at the 50 ms reporting threshold.

Changed-code inspection found no edits to legacy viewer, appearance handlers,
startup measurement, dependencies, or old media. Added shared icon names and a
default-off inline variant can affect generated bundles, so their absence from
the legacy execution path does not prove zero performance effect. The earlier
[calibration record](2026-10-29-paired-calibration.md) documents the same laptop
p95 issue and sensitivity to the sampling window. No new cause is established.

[Chrome's long-task guidance](https://web.dev/articles/optimize-long-tasks)
documents the 50 ms threshold. [Lighthouse's variability guidance](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)
supports caution about attribution across runs; it supplies no universal noise
allowance for this custom test. The release judgment is that these small absolute
misses do not warrant holding this grid update under Aaron's instruction. The
failed comparisons remain failures; no baseline is replaced to make them pass.

## Publication procedure

Preserve current deployment `6ae398aaa0f24f13780b6163` as the rollback reference.
Lock automatic publication while pushing the verified commit, package through
Netlify with the one-operation `pnpm build` exception, restore the configured
`pnpm qa:check && pnpm build` command, and explicitly publish the package.
Verify the live grid and legacy routes afterward. The normal build gate remains
committed and will continue to reject the incompatible baseline until a separate
calibration decision resolves it.

## Publication outcome and packaging correction

Application/evidence commit `a21a6ad48e769c912f1dd1d0e9bf5929dc00cf9f` was pushed.
Netlify's production-context packaging succeeded, and the original build command
was restored byte-for-byte. The code still matches the complete QA fingerprint.

The first manual upload used the configured `.next` directory with `--no-build`.
That is not the runtime adapter's packaged static root: the server's HTML
referenced `/_next/static/...`, while those files were uploaded under `/static`.
Deployment `6ae3c7ace2876c6b06039d88` consequently returned 404s for scripts/fonts
and left `/work` loading. The post-deploy check caught this. The previous deploy
was immediately restored and its production `/work` readiness verified. This was
an upload-command error, not a source or performance regression.

Correct command: `netlify deploy --no-build --dir .netlify/static`. The corrected
bundle was uploaded as a draft, with the existing Netlify function/blob artifacts,
then tested before promotion. The draft passed the root redirect, portfolio
readiness, ten-project grid, noindex, new icons, flush pause/scrubber geometry,
project link, playback and viewed-badge checks without page or HTTP errors.
Both desktop published-portfolio isolation tests passed on that hosted artifact
(dark and light, all four representative routes). It was then promoted unchanged.

Final deployment: `6ae3c8c0fec465a29fbc12ef`.
[Immutable deploy](https://6ae3c8c0fec465a29fbc12ef--aaronwright.netlify.app/grid-version),
[deploy log](https://app.netlify.com/projects/aaronwright/deploys/6ae3c8c0fec465a29fbc12ef).
The same live smoke checks passed on `https://aaronwright.ca` after promotion:
`/` redirects to `/work`, the old portfolio reaches ready, and the updated grid
works without page or HTTP errors. Local deployment evidence is in ignored
`test-results/grid-controls-release/` and `test-results/deploy-isolation/`.

The temporary publication lock was removed; no service/configuration changes
remain. The automatic Git-triggered build failed at the deliberately unchanged
QA gate; the verified manual deployment is the published release. Future manual
uploads must use the adapter's packaged static root and validate a draft before
promotion. Final audit verdict remains **ready with noted performance risks**;
the packaging failure is resolved and the failed deployment remains as evidence.
