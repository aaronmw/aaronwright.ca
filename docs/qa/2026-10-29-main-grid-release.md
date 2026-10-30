# Main grid portfolio release — October 29, 2026

## Intent and implementation decisions

Aaron approved replacing the old portfolio at `/work` with the grid experience,
including the pending Notes leading, link decoration and corner-animation fixes.
The prior restriction protecting the legacy production presentation is superseded
by that explicit replacement plan.

- One shared server entry in the persistent `/work` layout supplies the grid on
  the index and clean project routes.
  Native history continues to own in-page viewer transitions so the gallery stays
  mounted, with keyboard return focus and document titles updated. Full requests
  receive route-specific canonical metadata. Confidence: high.
- Public NextPhrase URLs remain `/work/nextphrase`; its internal project slug, ID,
  media identity and viewed-history storage are unchanged. Legacy project query
  links redirect directly to their canonical viewer, dropping obsolete viewer
  keys and preserving repeated unrelated values. Unknown projects and unknown
  media paths return 404; obsolete query slide selections fall back to the current
  single cover, preserving the existing grid compatibility behavior. Confidence: high.
- Existing six-project SEO text and artwork remain authoritative. The four new
  projects use their current title/summary and the existing branded text-only
  share-card template. Confidence: high.
- Cleanup follows the retired import graph. Shared primitives, legacy project
  data needed by editors/redirect validation, all editing tools and every public
  asset remain. Eight obsolete dependencies and old-only runtime/styles/tests are
  removed. The old font/theme wrapper no longer surrounds the grid. Confidence: high.
- The performance product contract changes deliberately from carousels to grid
  journeys. Profiles, repetitions, measurement metrics and relative tolerances
  remain unchanged. A complete new grid receipt will establish the authorized
  baseline; historical carousel results remain recorded.

## Verification

- TypeScript: passed (`pnpm exec tsc --noEmit`).
- Unit tests: final release has 26 files, 236 tests passed.
- React Doctor: migration changed scope 97/100, no issues found; latest video controls 100/100.
- Production build passed. All 80 browser cases passed across Chromium desktop,
  WebKit desktop, WebKit iPhone portrait and landscape. All 72 measured journeys
  completed with no errors.
- Hosted draft and production: all metadata/redirect/asset checks and desktop, phone and reduced-motion interactions passed on deployment `6ae41a17d1400eff3d4393d2`.

## Deployment safeguards

Current published deployment, captured before release:
`6ae3c8c0fec465a29fbc12ef`.

The Netlify package must be uploaded from `.netlify/static`, together with the
adapter's functions/blobs. Draft verification precedes promotion of that exact
deployment. Keep the previous deployment as rollback and restore it immediately
on any functional release-check failure. No database is configured or changed.

## Decision audit

**Ready with noted risks.** The implementation choices above remain high
confidence after the complete production build and local browser matrix. The
persistent layout resolves an observed focus/remount defect, rather than adding
a focus-storage workaround. Retained shared owners avoid duplicate grid entry,
metadata copy and control treatments. Development-only gating covers both editors.

The remaining known limitation is cold loading on constrained connections: median
complete-grid readiness is 4.57s unthrottled and 24.15–24.26s at 1.6 Mbps/4× CPU.
Cold-load long-frame maxima are also recorded (about 3.1s in throttled medians),
while frame-gap p95 remains about 16.8ms and the worst sampled long task is 130ms.
The existing media/readiness behavior is preserved; no claim is made that this
release optimizes it. Hosted packaging and CDN behavior are checked before
promotion, then production is checked with immediate rollback on functional failure.

Pride gate: yes, I am proud of this implementation; yes, I would stand behind
the routing, cleanup, accessibility behavior and release safeguards in production,
with the cold-load limitation stated explicitly. Aaron's approved plan authorizes
continuing through the audit to commit and deployment without another pause.

## First browser pass and corrections

Managed run `20C45F8C-3422-4E64-8696-97C99C0831A1`, receipt
`2026-10-30T00-14-53-648Z`, was stopped after functional failures were diagnosed.
Its incomplete 14 samples cannot establish a baseline or authorize release.

- Actual application defect: refreshing an opened project then closing via Back
  restored another page tree, remounting the gallery and losing return focus.
  The grid now belongs to the shared persistent layout; pages own only validation,
  redirects and metadata. A retained DOM marker after refresh guards this case.
  Focus/history and unknown-route checks passed against the existing development
  service after the correction.
- Reduced-motion tests now observe the intended decoded still poster instead of
  demanding video playback readiness from a paused, preload-none video.
- Notes trajectory observation waits for the exact landing boundary before
  asserting the pinned corner. The application sequence is unchanged by this
  test correction. Full travel, expansion and reverse-path assertions remain.
- The existing About portrait blend intentionally has two aligned composited
  layers during `revealing`; tests validate opacity and geometry for that phase,
  while all other phases still require single visual ownership.
- The keyboard focus test now activates Minimize with Enter. Safari's pointer
  click does not imply keyboard focus, and the existing pointer behavior remains.

Eight focused Chromium/WebKit checks passed for these observation corrections.
No performance threshold, repetition, viewport, task or budget was relaxed.

The second run was stopped before baseline acceptance when final release review
found the pre-existing standalone copy-editor route was still public. Both
editing tools are now development-only, as required by the plan. The copy editor
is preserved locally, and the release browser and hosted checks assert its
production 404. The second receipt remains recorded and cannot authorize release.

The third full browser run passed 76/80 cases. Remaining failures were observer
races, corrected without application changes: rapid Notes reversals now run in
one browser-frame observer at substantial intermediate polygon areas, and mobile
About verifies the correct composited canvas rather than assuming an IMG.
Seventeen focused checks then passed (nine repeated WebKit reversal cases and
eight reversal/About cases across all four browser profiles). The interrupted
third receipt is retained and is not eligible as a release baseline.

## Bounded cold-load investigation

One cache-disabled 1.6 Mbps/4× CPU diagnostic is saved at
`test-results/main-grid-release/cold-network.json`. It recorded first usable cell
at 15.1s and the complete grid at 23.7s, with HTML response start 8.7ms/end 229ms.
Existing posters and video buffers account for the large transfers; notably the
Gift Exchanges poster delivered 638 KB. The code and all public media assets are
unchanged from the staged grid. This meaningful slow-connection limitation is
recorded rather than attributed to the routing migration or hidden by a new
baseline. Optimizing the media/loading design is deferred beyond this replacement.
See TASKS.md for primary-source references and interpretation.

## Complete release receipt

Accepted the new grid baseline from `qa/results/2026-10-30T00-33-52-522Z.json`.
All checks and 72 samples are complete, error-free and match the frozen source.
`pnpm qa:check` passes after that explicit baseline acceptance. The receipt's
initial blocked status records its comparison to the obsolete carousel baseline;
no failing test was waived and no result was edited to obtain acceptance.

Source fingerprint: `eb2738528698fbdae88c2122b7bda8ce0a3b2a3608ccb1961131fc02378682a3`.
Managed final QA run: `E80F9DBF-E786-4F21-B2AB-55D5ACEB6627`.
The temporary QA server was cleaned up by its managed command.

## Hosted redirect correction and concurrent video work

Draft `6ae3e8b0d28e0b6d44d99df6` was uploaded from `.netlify/static` after
commit `15aa8a9`. All eleven canonical pages and share cards, four 404 cases,
sitemap, desktop/mobile interactions and static assets passed. Visual review
confirmed the current grid/Notes presentation and branded fallback artwork.
Redirect verification correctly blocked promotion: Netlify reattached obsolete
query keys when Next returned an empty-query redirect, producing a canonical-URL
loop. Production remained locked on `6ae3c8c0fec465a29fbc12ef`.

The correction is a scoped edge response handler using the shared query-cleanup
helper. Next remains responsible for project/media validation and destination
selection; the handler strips only obsolete keys from same-origin `/work`
redirects, retaining status, repeated unrelated values and 404s. Ordinary requests
bypass the response wrapper. This was chosen over dummy query parameters or
copying project routing into a second resolver. Confidence: high in the pure
response logic (12 focused tests), pending actual CDN verification.

Aaron's completed request in “Add expanded video pause feedback”
(`01a18a46-9ebb-7fe2-8791-c1067ed2691b`) landed in this checkout before the fresh
QA build. It adds click-to-pause feedback and native non-looping end behavior.
Its TypeScript and changed-scope React Doctor checks passed (100/100). These
changes are included in the current release under the requested complete-tree
commit/deploy scope, with additional local and hosted behavior checks.

Run `2026-10-30T00-53-20-194Z` passed 236 unit tests and all 80 browser cases.
Its performance sequence exposed an obsolete prerequisite: the 4.17-second clip
now ends during the 3.18-second Notes journey. Two video-control checks waited
30 seconds for continued playback; screenshots show the final frame, full seek
bar and Play control. The managed run was stopped, preserving its incomplete
receipt. This is an intentional behavior change, not timing variation.

A bounded local diagnostic observed `ended: true`, `paused: true`,
`currentTime === duration === 4.170833`, and `loop: false`. Restarting only ended
clips before timing restored the same pause/seek/resume journey in 334ms. All six
journeys passed. The helper now performs that explicit prerequisite before
measurement; it cannot recover or conceal a failed measured action. See TASKS.md
for the changed-code and primary-source assessment. The protocol fingerprint
changes, so the next complete result needs explicit baseline review/acceptance;
old grid medians remain comparative context, with budgets untouched.

Four additional pause-feedback checks passed against the running development app:
Chromium and WebKit, each with normal and reduced motion. They verify a video
click pauses, the overlay reaches 85% opacity, replay clears it, `loop` remains
false, and reaching the end pauses with no overlay. Mobile screenshot review
confirmed the centered 5× solid glyph. Evidence is in
`test-results/main-grid-release/pause-feedback.json` and `pause-*.png`.

## Final local receipt and audit addendum

Managed run `771E1DCB-06C8-4527-8AFB-728A653B80C2` completed with 236 unit
tests, all 80 browser cases, and all 72 measured journeys passing with no errors.
The temporary server was cleaned up. Its receipt is
`qa/results/2026-10-30T01-01-36-132Z.json`, source fingerprint
`61e760316ff53c0d46f16fc2b8ed6f626df947d03beac74ee8b8ab6746c3cde1`.

A contextual comparison against the prior complete grid run used the unchanged
30% plus absolute noise budgets for every metric and all 24 journey/profile
medians. The environment matched and none exceeded a budget. Full comparison is
saved in `test-results/main-grid-release/prerequisite-comparison.json`. The
corrected prerequisite receipt was explicitly accepted as the baseline because
its helper fingerprint changed; no assertion, metric, profile, repetition or
budget was relaxed. `pnpm qa:check` now passes. Raw receipts remain unedited,
including their initial baseline-incompatibility status.

Audit verdict: **ready with noted risks** for commit and hosted-draft validation.
The redirect adapter is narrowly scoped to observed hosting behavior and shares
query semantics with the app; it does not duplicate route validation (high
confidence in logic, CDN verification still required before promotion). Native
non-looping video preserves Aaron's new end-of-playback request without extra
application timers (high confidence after browser checks). Restarting an ended
clip outside the measured journey preserves the intended starting condition;
measured actions are unchanged (high confidence, baseline comparison recorded).
The slow-network cold-load limitation remains deferred. No hidden functional
failure or budget exception is accepted. Pride gate: yes, proud of the result;
yes, willing to stand behind it in production after the mandatory hosted checks.
Aaron's approved plan authorizes continuing through this audit without a pause.

## Edge bundle compatibility correction

Commit `88582d7` includes the shared redirect handler, video feedback and completed
QA evidence. Netlify's production Next build and QA gate passed, but its Deno edge
bundler rejected the extensionless relative import of `routing`. No corrected
draft was published from that failed package.

The import now names `routing.ts`, with TypeScript's `allowImportingTsExtensions`
enabled under the existing `noEmit` configuration. This is resolver compatibility,
not a runtime behavior change. TypeScript and all 12 edge-handler tests pass. The
exact installed Netlify Deno bundler now produces the 11,073-byte edge bundle.
The full release run is repeated because the repository requires a receipt that
matches these source/config changes; the accepted video-prerequisite baseline
and all performance budgets remain unchanged.

The complete compatibility-correction receipt `2026-10-30T01-13-32-962Z` passed
236 unit tests, 80 browser cases and 72 error-free journeys. One frame-gap budget
failed on the laptop close animation (49.9ms versus a 43.3ms limit). TASKS.md
records the full numeric context, identical browser-chunk evidence, primary
references and a bounded one-run confirmation decision. No baseline or budget
change is authorized by that observation, and the blocked receipt is retained.

## Bounded confirmation outcome

The single predeclared confirmation is
`qa/results/2026-10-30T01-25-53-330Z.json`, source fingerprint
`2f187ca3b0aac740df318ef5fb7d142e2076d2b7e094b6c7d62b78515abf575d`.
Bootstrapper run `DA796830-C09C-4910-B7E3-64BB6757E28E` completed and cleaned up
its temporary server. All 236 unit tests, all 80 browser cases and all 72 journeys
completed with no functional errors. One of 96 budget comparisons remains blocked:
laptop close-viewer p95 samples 50.1/33.3/50.0ms, median 50.0ms versus the 43.3ms
limit (baseline 33.3ms). Sample counts are 36/35/36 and gaps over 50ms are 2/1/1.
The close-duration median is 700.7ms versus 700.2ms baseline (+0.5ms/0.07%).
Longest-task and longest-frame medians are 52ms and 76.4ms; all other budgets pass.

No further repeat scan, assertion change or baseline replacement is planned.
The unchanged-browser-code and short percentile-window evidence supports treating
this isolated result as low practical impact, but the mandatory gate still blocks
release. Audit verdict: **needs follow-up before finalizing the release**. The
implementation and evidence can be committed for review; publishing requires an
explicit one-release exception or a subsequent authorized change to the contract.
Pride gate: yes for the implementation; yes for functional production confidence
subject to the still-required corrected-draft and production checks. No claim is
made that the performance gate passed or that the corrected draft was deployed.

## Explicit exception approval and additional video changes

Aaron answered “Allow this isolated exception” to the request for a one-release
exception covering the isolated approximately 50ms versus 43.3ms laptop
close-viewer frame-gap result, while keeping all performance budgets unchanged.
He then explicitly requested shipping the new current changes too: 20vh foreground
circle-play/pause feedback and click-to-toggle playback. Their implementation chat
completed TypeScript and React Doctor (100/100); this release adds the interactions
to existing browser coverage and verifies fresh source evidence before packaging.

The exception is scoped to this release and that single profile/task/metric.
Every completeness, source-freshness and functional check, every other budget,
and hosted draft/production verification still applies. The repository QA scripts,
accepted baseline and budgets stay unchanged. If needed, packaging uses a temporary
build-command override only after a separate check confirms that the current
complete receipt has no failures beyond the authorized approximately 50ms result.
The original Netlify configuration is restored before upload, and the source
fingerprint is checked again. No lasting gate bypass is introduced.

The updated click-toggle/end-of-playback browser case passed against the running
development app in Chromium, WebKit desktop, iPhone portrait and landscape.
TypeScript passed again. Hosted smoke coverage now also checks both 20vh glyphs
and repeats the interactions with reduced motion.

Evidence retention note: the standalone Playwright invocation used its default
output directory and cleared earlier ignored `test-results/` screenshots and
transient diagnostic files. Their committed receipts and audit observations
remain available. Current hosted screenshots/results are regenerated; copies of
the hosted smoke, scoped exception validator, one-release build wrapper and
promotion/rollback runner are now retained as `.txt` evidence beside this record.
Future standalone Playwright checks must use an explicit child output directory.

## Updated video release: normal gate passes

The fresh complete receipt is `qa/results/2026-10-30T04-04-32-886Z.json`, source
fingerprint `ee6df33c47d703be23ed9581f25ea5174709bc356fd7578205e6a87fd01106c4`.
Bootstrapper run `0E93A2A5-EF95-48AA-9B80-366D50646205` passed 236 unit tests,
all 80 browser cases including the new click-feedback/end behavior, and all
72 performance journeys. Every relative budget passes against the existing
`2026-10-30T01-01-36-132Z` baseline. No baseline, profile, metric or budget changed.
The approved exception was **not used**; ordinary `pnpm qa:check` passes.

Final implementation audit: **ready with noted risks** for hosted verification
and release. Click feedback uses the shared solid icons, the requested 20vh
foreground treatment, native playback state and a stale-promise guard; silent
ending and the existing footer controls remain intact (high confidence after
four-browser testing). CSS retains the reduced-motion variant. The Deno import
compatibility correction has a verified edge bundle and unchanged browser chunks.
The only known product limitation remains existing cold loading on constrained
connections. Pride gate: yes, proud of the implementation and willing to stand
behind it after the pending exact-draft and production checks. Aaron authorizes
continuing through this audit without another pause.

## Published release

Release source commit: `e77dcb8` (the following commit records documentation only).
The normal Netlify build ran `pnpm qa:check && pnpm build` successfully, including
Deno edge bundling. The approved performance exception and temporary build-command
override were **not used**. Repository build configuration remains unchanged.

Uploaded `.netlify/static` as draft `6ae41a17d1400eff3d4393d2`:
[immutable deployment](https://6ae41a17d1400eff3d4393d2--aaronwright.netlify.app),
[Netlify build/deploy record](https://app.netlify.com/projects/aaronwright/deploys/6ae41a17d1400eff3d4393d2).

Draft verification passed eleven canonical/indexable pages, ten permanent redirect
cases (including the formerly looping empty-query destinations), four expected
404s, eleven sitemap entries, all eleven PNG share cards and eighteen loaded
static assets per browser context. Desktop, phone and reduced-motion phone
interactions all passed: opening, title/URL changes, Notes, footer playback,
20vh click pause/play feedback, silent ending, closing with returned focus,
About and direct NextPhrase entry/closing with unrelated query preservation.
No page errors or failing same-origin asset responses occurred. Visual inspection
confirmed the new icons and reduced-motion grid presentation.

Promoted that exact deployment at `2026-10-30T04:19:52.671Z`, without rebuilding.
The same checks passed on [production](https://aaronwright.ca/work), including
absence of an HTTP `noindex` directive on every canonical page. The published
site ID was verified against the tested deployment after the smoke run. Compact
[draft evidence](2026-10-29-main-grid-draft.json),
[production evidence](2026-10-29-main-grid-production.json) and
[promotion record](2026-10-29-main-grid-promotion.json) are committed here.
Current screenshots and full logs remain under `test-results/main-grid-release/`.

Previous deployment `6ae3c8c0fec465a29fbc12ef` remains available as the rollback
target; rollback was not needed. The temporary publication lock was released for
promotion. Owned QA servers were cleaned up; Aaron's existing development service
was left alone. No database or new external application API was introduced.

Final audit: **ready with noted risks**. All intended functionality, hosting
behavior and production exclusion checks passed. The existing approximately
24-second complete-grid readiness in the 1.6Mbps/4×CPU cold-load profile remains
a documented product limitation. No performance budget was relaxed, no baseline
was changed after the intentional prerequisite correction, and no failed receipt
was erased. Pride gate: yes; I would stand behind this verified production release.
