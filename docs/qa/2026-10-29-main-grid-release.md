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
- Unit tests: 25 files, 224 tests passed.
- React Doctor, changed scope: 97/100, no issues found.
- Production build passed. All 80 browser cases passed across Chromium desktop,
  WebKit desktop, WebKit iPhone portrait and landscape. All 72 measured journeys
  completed with no errors.
- Hosted draft and production checks: pending.

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
