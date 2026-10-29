# Grid mosaic experiment (originally `/v2`)

Current animation ownership is documented in [GSAP migration](#gsap-migration--october-26-2026).
The dated entries below retain implementation history; that migration supersedes
the earlier SMIL/WAAPI sequencing and blurb animation lock.

Uses the desktop/mobile composition rails originally reviewed in Figma file
`ftIzwQbtYACdhGzwyZDRcl`, frames `3300:35` and `3300:36`, now with image-ratio
cells and red remainder blocks (October 8 update below). The existing homepage
and `/work` routes are unchanged. The experiment is excluded from indexing.

## Controls and content

- `components/mosaic/Mosaic.module.css` owns the shared gap, peer opacity, and
  portrait/landscape grid. `--mosaic-gap` inherits the existing logo stroke width.
  Per-orientation `--mosaic-zoom` multiplies normal cover dimensions, initially
  using `DEFAULT_MOSAIC_ZOOM = 5` in `components/mosaic/composition.ts`.
- `lib/mosaic.ts` owns independent portrait/landscape focal points, target
  points, and zoom factors, plus optional shared video loop ranges. CSS clamps
  placement to preserve coverage.
  Aaron’s pasted schema 2 configuration supplies the current crop defaults.
- Project media follows the existing portfolio ordering. About uses the supplied
  1243 × 1243 portrait with the shared grayscale treatment. No project
  descriptions or captions are rendered.
- All four video tiles play their existing original videos simultaneously,
  muted and inline. Full-duration looping is the default. Lossless WebP posters
  (502,224 bytes combined) serve only as loading, reduced-motion, denied-play,
  and error fallbacks. Images and videos use the same CSS framing.
- Backgrounds pause while the document is hidden or the gallery is open,
  retaining their frame/time for resume. The gallery keeps full-length videos
  with native controls; background excerpt bounds never constrain it.
- The seven-tile authored arrangement has an equal-row, two-column fallback for
  a changed project count. New media needs dimensions in its source metadata or
  the dimension map; new first-slide videos also need a poster.

## Image-quality investigation — 2026-10-06

The screenshot tiles load original PNGs with `unoptimized` Next/Image, with
decoded dimensions matching their files. Chromium and WebKit showed no image
or ancestor blur filter, pixelated image rendering, or resting transform that
would explain softness. The viewer also uses the original images/videos.

The first quality pass corrected unnecessary poster degradation, keeping frame
timestamps and composition metadata. Informal was subsequently recovered from
an earlier sharper source, as detailed below:

| Poster          | Previous JPEG | Current lossless WebP              | Bytes   |
| --------------- | ------------- | ---------------------------------- | ------- |
| Toolbox, 0.5 s  | 1280×720      | 1920×1080 (native)                 | 149,330 |
| Informal, 5 s   | 1280×882      | 1544×1064 (aligned original frame) | 288,148 |
| NextPhrase, 6 s | 442×906       | 442×906 (native)                   | 64,746  |

Frames were decoded to PNG using ffmpeg, then encoded with the existing Next
dependency's Sharp using `webp({ lossless: true, effort: 6 })`. Raw RGB decoding
matched the extracted frame exactly in that first pass. The current combined
increase over the old posters is 319,929 bytes. The older poster files remain
available for already-open development
drafts holding the previous media URLs; new page loads use WebP. Copy an active
adjustment draft before refreshing, since refresh intentionally resets drafts.

At the initial 5× cover setting, the following were full-image resolution
requirements for approximately one source pixel per display pixel. These are
conditional targets for a sharp resting crop, **not** a request to replace every
asset. Native source compression or deliberately blurred artwork can still be
soft even when dimensions are sufficient.

| First media                                    | Current original | Desktop 1440×900, DPR 2 target | Portrait 390×844, DPR 3 target |
| ---------------------------------------------- | ---------------- | ------------------------------ | ------------------------------ |
| About `linkedin-cover.jpg`                     | 1104×276         | ≈10,600×2,650                  | ≈10,000×2,500                  |
| Loopio `dashboard.png`                         | 1332×2335        | ≈4,760×8,350                   | ≈2,840×4,980                   |
| FreshBooks `redesigned-creation-screen.png`    | 1220×1421        | ≈2,980×3,470                   | ≈3,160×3,680                   |
| Informal `walkthrough.mp4`                     | 1544×1064        | ≈7,290×5,030                   | ≈4,690×3,240                   |
| Toolbox `aarons-toolbox-community-preview.mp4` | 1920×1080        | ≈6,980×3,930                   | ≈5,330×3,000                   |
| NextPhrase `intro-video.webm`                  | 442×906          | ≈2,980×6,110                   | ≈3,090×6,330                   |

At DPR 1 the desktop targets are half those dimensions. At smaller zooms the
required dimensions decrease proportionally; no zoom or focal values were
changed in the quality fix. Aaron subsequently supplied the lower Informal
landscape zoom documented below. A higher-resolution NextPhrase capture is the clearest
source upgrade: its available `social-poster.png` is also only 442×906. For the
900px-high fitted video alone, roughly 880×1800 would cover desktop DPR 2.
About's JPEG deliberately contains blurred squares; the same-size PNG is a
different arrangement, so it was not substituted. Informal's corrected video
export already shows softness in text/graphics; see the exact-frame finding
below rather than attributing its fitted-state blur solely to zoom.

Loopio and FreshBooks need no replacement for the measured desktop hover-fit
cells (359×629 and 249×290 CSS pixels at DPR 2). The Loopio viewer is 513×900,
also within its native resolution at DPR 2. FreshBooks' 773×900 fitted viewer
would ideally have a roughly 1550×1800 original for DPR 2. Other higher-resolution
screenshots in the repo show different screens, not better versions of these
same cover images, so they were not substituted.

Verification: TypeScript passed; both Chromium and WebKit decoded the new
posters at native dimensions and opened/closed all six original-media viewers.
At that poster-only checkpoint no videos loaded on the resting mosaic. This
behavior was intentionally superseded by the requested live backgrounds.
Source pixels, frame timestamps,
framing, and adjustment configuration meaning were preserved. No AI upscaling,
sharpening, new dependency, or production deployment was used.

### Exact Informal frame follow-up

Aaron's 1087×749 attachment shows the video/poster (including its “Edit in
Contentful” header), not the separate `home-page.png`. The content region is
approximately 1046×721 physical screenshot pixels; the crop alone does not
establish the original browser's CSS viewport or DPR. Its pixels closely match
the then-current 1544×1064 lossless poster derived from `walkthrough.mp4`:
resized RGB RMSE ≈0.79/255, versus ≈2.47 for the older JPEG. This points to the
new poster, not a stale JPEG. Native-size heading crops visibly show the blur
inside the corrected video itself.

The relevant history contains a sharper source:

- `27c98b4:public/portfolio/informal-systems/walkthrough.mp4`: 1680×1158,
  60 fps, 70.47 s, 81,877,466 bytes; sharp native text.
- `648f1dd`: same dimensions/duration, compressed to 30 fps and 7,552,249 bytes.
- `da88c37`: replacement corrected iMovie edit, 1544×1064, 30 fps, 59.10 s,
  6,182,592 bytes; the softness is present in this stored export. The exact
  processing that caused it is not established by the repository.
- `public/portfolio/informal-systems/home-page.png`: sharp 1705×4849 standalone
  screenshot still present in the repo, but full-page framing differs from the
  selected video frame. It was not substituted.

Recovered the original recording's 5 s frame for the fallback poster. To match
the corrected video's existing view, resize that frame to width 1566, then
extract `{ left: 19, top: 2, width: 1544, height: 1064 }`; store lossless WebP as
`informal-systems-original-poster.webp`. Static heading/nav registration was
used to align the image. No upscaling, sharpening, focal, or zoom change was
applied. Minor animated-art differences remain because these are different
edits of the same recording. Native heading detail is substantially clearer at
the **same** final pixel dimensions. Browser comparison at hover-fit used
654.5×451.016 CSS pixels, DPR 2 (about 1309×902 display pixels).

The corrected video was deliberately retained for backgrounds and the full
viewer: replacing it with the older 70-second cut would undo an intentional
edit. No new screenshot is needed for the recovered poster. To improve live
playback, use a sharp export of the corrected 59.1-second edit from its original
recording/project; a larger export of the already-soft MP4 would not restore
detail.

## Development adjustment mode

1. Open `/v2` in the development preview and choose **Adjust project cells**.
2. Drag a cell to pan; hold **⌘** while scrolling over it to zoom (1×–20×
   cover). A focused cell also supports arrow keys and **+ / −**.
3. Resize the viewport to edit **Landscape** or **Portrait** independently.
   The square breakpoint belongs to Landscape. Resizing cancels a current drag.
4. Select a video cell to reveal **Loop start** and **Loop end**, in seconds
   with 0.1-step controls. Actual metadata duration appears above them. Valid
   ranges preview immediately; invalid input keeps the last valid range and
   shows an inline correction. **Use full video** removes the excerpt.
5. Choose **Done & copy** and paste the JSON into the project chat to apply it
   as source defaults. It contains `schemaVersion: 2` and complete `cells`,
   keyed by first-media ID. Each cell includes landscape/portrait
   `{ focal, target, zoom }`; videos may also include `loop: { start, end }`.
   Loop ranges apply to both orientations. Omitted `loop` means full duration.
   Targets stay fixed while adjustments change focal points and zoom. Existing
   crop-only values keep their meaning; no import UI or persistence was added.

Hover fitting, peer fading, and gallery opening pause while editing. Drafts
remain visible after exiting and survive re-entry in the current page session.
Refresh restores source defaults: no files, local storage, or server state are
written. Copy failures retain the draft and expose selectable JSON, retry, and
an explicit finish-without-copying action. Copy uses
[Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
directly within user activation; browser denial is handled by that fallback.

`MosaicDevelopment` owns the draft and export workflow;
`useMosaicAdjustmentGestures` owns captured pointer and scoped non-passive wheel
handlers. Geometry is read at gesture boundaries (and wheel/key input), not
continuously for normal rendering. The editor is conditionally loaded only in
development by `app/v2/page.tsx`.

Background range validation requires finite `0 <= start < end <= duration`.
Playback waits for metadata; invalid configured or failed seek ranges fall
back to the poster instead of silently playing the full clip. Native WebKit
can stall indefinitely while seeking a paused video, reproduced independently
on a blank page. Muted playback is queued after assigning the seek target;
a local held-frame canvas masks any stale decoded frame until a presented
frame is inside the requested range. The canvas copies at the seek handoff,
not on every frame, and does not encode an image during looping. A stalled
seek times out after eight active seconds without retry or reload churn; the
watchdog is suspended while hidden or viewing the gallery. Gallery expansion
snapshots whichever live or held frame is actually visible.
Segment ends use presented-frame callbacks with a bounded timer fallback.
Very short ranges are limited by native frame/seek precision; starts are
throttled to at most 10 per second, holding a boundary frame between repeats
instead of spinning a seek loop. Aaron’s latest schema 2 export sets Informal’s
shared background excerpt to 1–6 seconds (source duration verified with ffprobe:
59.100 seconds). Its landscape focal is `(0.7606876985275945,
0.12865610479141412)` at `2.5908862535031325×`; portrait remains unchanged.
Toolbox’s landscape focal is `(0.8376783392368743, 0.37840649240012547)`.
All other crops and omitted full-video ranges retain the supplied defaults.
The focused read/export suite passed all 27 cases after applying this export.

## Review

Primary review URL: <https://aaronwright-dot-ca.localhost/grid-version>.
The former `/v2` route redirects here with query parameters preserved. The grid
is the sole visual experiment; its gallery retains history and deep-link support.

Project: `aaronwright-dot-ca`. Worktree:
`/Users/aaronwright/.codex/worktrees/homepage-mosaic/aaronwright-dot-ca`.
Branch: `codex/homepage-mosaic`. Preview command: `pnpm dev`, bound to the
registered `127.0.0.1:3031`; listener PID `32397`, agent command session `96136`.
These identifiers describe this review session, not a permanent server.
Port 3031 and the former preview port 58868 were both free before startup;
no existing listener was stopped. The canonical host was already permitted by
`allowedDevOrigins`, so no application configuration or router changes were
needed. HTTPS verification passed without bypassing certificate validation;
latest Informal crop/loop defaults, all six image assets, video playback, and
secure HMR connection/messages were verified through the canonical hostname.
Existing old tabs were not navigated or refreshed; copy any in-memory adjustment
draft before leaving them because drafts are intentionally not persistent.

1. Hover or keyboard-focus each tile: framing smoothly reaches fit and peers
   fade. Assess the dramatic resting crop and transition feel.
2. Open a project; move through its images, zoom, pan, and reset to fit.
   Escape/close returns to the tile with keyboard focus restored.
3. Watch all three backgrounds, set a short excerpt on one, then open it. The
   gallery can play beyond that excerpt; backgrounds pause until it closes.
   Try browser Back and Forward. On touch, a single tap opens the viewer.
4. Review portrait and landscape composition, and pinch/pan on a physical phone.

## Verification — 2026-10-06

- Production build passed, including TypeScript and all 40 routes.
- Unit suite: 139 passing tests, including geometry, clamped pan/zoom, fixed
  targets, orientation independence, complete serialization, and gallery URLs.
  Three additional controller tests pass for stale-frame masking, bounded seek
  failure without churn, and pause/resume during a pending seek (142 total).
  The latest source-default/export validation separately passes all 27 cases.
- Playwright: 38 applicable cases passed across Chromium desktop, WebKit
  desktop, and WebKit iPhone portrait/landscape (including targeted reruns).
  These comprise all 20 original mosaic cases and 18 adjustment cases; two
  mobile real-mouse capture cases are intentionally skipped, with actual mouse
  capture verified in both desktop engines. The four viewport/crop cases passed
  again with Aaron’s latest defaults.
- New video coverage: 14 applicable cases passed across the same four profiles;
  six mobile detailed-timeline/export/denial cases are intentionally skipped
  because both desktop engines cover those workflows. Core playback, gallery,
  visibility simulation, and reduced-motion fallback run in all four profiles.
  Bounds remain strict for 0.4- and 0.1-second excerpts, with observation starting
  after actual settled playback rather than immediately after assigning a seek.
  Export failure/reset, default Informal excerpt preservation, autoplay denial,
  and full-length gallery playback pass.
- WebKit probes verified queued-seek recovery in three runs and zero exposed
  out-of-range frames in sampled 0.4- and 0.1-second loops. A held-frame gallery
  probe confirmed the viewer poster exactly matches the visible canvas, then
  Escape closes the gallery and restores focus.
- Coverage includes viewport bounds, minimum tile targets, gap changes, 5×
  cover geometry, intermediate hover framing, focus treatment/restoration,
  navigation, video request isolation, Back/Forward, and reduced motion.
- Adjustment coverage includes drag/capture, resize cancellation, pointer-
  anchored Meta+wheel, 1–20 zoom limits, keyboard input, unchanged ordinary
  wheel/clipboard shortcuts, editing isolation, complete orientation exports,
  session retention/refresh reset, clipboard success/failure/retry/manual
  selection, and gallery restoration after exit.
- Production verification in Chromium and WebKit found no editor controls or
  editor code in loaded scripts, no non-passive wheel handler, and no consumed
  Meta+wheel input. All three background videos played, and gallery opening/closing paused and
  resumed them. The owned temporary
  production listener was stopped afterward; the development preview remains.
- Additional Chromium touch input verified pinch enlargement, pan movement,
  and bounded image coverage. Targeted diagnostics covered interrupted
  transitions, resize, rapid Back/Forward, WebM playback, and zoom reset.
- React Doctor changed-file scan: 100/100, no findings.
- Desktop and mobile loop toolbar layout inspected visually; both show the
  selected video, duration, start/end inputs, and full-video reset without
  clipping. The earlier copy-failure layout was also inspected.
- Aaron's visual acceptance and physical-phone gesture review remain open.
  No production release QA or publishing was performed. Publishing still
  requires the repository's `pnpm qa:check` gate.

## Decision audit

| Decision                                              | Reason and alternative                                                                                                                                                                                                                                                                                     | Confidence |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| CSS grid and container-relative framing               | Keeps all seams and coverage under one shared owner without runtime resize measurement. Interpolating framing lengths provides the requested continuous zoom; a simple `object-fit` switch would jump.                                                                                                     | High       |
| Separate source focal points and orientation targets  | Lets composition change without confusing the point in the source with its destination. Coverage clamping can override an unreachable target.                                                                                                                                                              | High       |
| Simultaneous live background videos                   | Implements Aaron's explicit motion request. Existing sources remain attached across gallery/visibility pauses; poster-only behavior is reserved for reduced motion and playback failures. This intentionally adds video transfer/decoding cost.                                                            | High       |
| Existing lightbox with a focused transition hook      | Reuses established zoom, pinch, pan, and focus behavior. A custom geometry overlay supplies the tile expansion and handles interrupted transitions. A wholly custom viewer would duplicate those controls.                                                                                                 | High       |
| One browser history entry per gallery visit           | Back closes and Forward reopens the last selected slide. Slide changes replace that entry rather than adding many Back steps.                                                                                                                                                                              | High       |
| Existing About brand artwork and 5× crops             | Uses available authentic material and follows the requested crop strength. Raster detail and recognizable content are limited by the originals; the final composition remains a visual judgment for Aaron.                                                                                                 | Medium     |
| Explicit six-tile composition plus fallback           | Faithfully retains the reviewed layout. The fallback prevents holes when project count changes, but a different collection deserves new composition review.                                                                                                                                                | High       |
| Independent orientation configurations                | Implements the approved choice without overwriting the other orientation. Both initialize from their source defaults, so enabling the editor does not change the current appearance.                                                                                                                       | High       |
| Normalize from clamped cover geometry                 | Drag and zoom update source focal coordinates with fixed targets. This avoids jumps at clamped edges and keeps CSS the only rendering path; a transform-only editor would export a different positioning model.                                                                                            | High       |
| Development-only loader and active-only listeners     | Production checks confirm the editor code is not loaded and modified wheel remains untouched. Handlers attach only while editing and release capture on resize, blur, cancellation, or exit.                                                                                                               | High       |
| Session draft and explicit clipboard export           | Follows the approved no-persistence scope and makes every exported cell reviewable. Copy denial keeps a selectable complete draft; refreshing intentionally discards it.                                                                                                                                   | High       |
| Shared background excerpt, independent full viewer    | A loop belongs to a media ID, not an orientation. Schema 2 adds optional `loop` beside unchanged crop data. Full gallery videos remain unrestricted.                                                                                                                                                       | High       |
| Frame-aware bounded segment restarts                  | Native loop handles the full clip; excerpts require synchronization. Frame/seek precision limits tiny ranges, so a held frame and 100 ms restart floor prevent a seek storm.                                                                                                                               | High       |
| Masked seek handoff                                   | Native WebKit probes showed both paused-seek stalls and stale frames when queuing playback. A held canvas permits decoding while keeping only valid frames visible; poster fallback covers unavailable capture. Three stable WebKit recovery probes and presented-frame bounds checks support this choice. | High       |
| Live-frame transition snapshot                        | A one-shot canvas capture expands/collapses the currently shown frame instead of flashing an unrelated static poster. Safe poster fallback handles unavailable/cross-origin capture.                                                                                                                       | High       |
| Recovered Informal fallback, retained corrected video | The sharp historical frame improves fallback at matched framing. The older video cut has different duration/edits, so it does not silently replace the corrected source. Live playback quality still depends on a cleaner corrected export.                                                                | High       |

Adjustment-specific audit: no shortcuts or temporary overrides were introduced.
The geometry helper intentionally mirrors the shared CSS cover/clamp formula;
unit and browser geometry checks guard against drift. Synthetic wheel events
exercise Meta input deterministically; physical Mac trackpad sensitivity remains
Aaron's manual acceptance item. No broader editor, dependencies, storage, API,
or Figma changes were added.

Pride gate: yes, I am proud of the implementation and its interaction coverage.
I would stand behind the approach in production after visual acceptance and the
required project release QA; this experiment has not yet passed that release
gate. Physical-phone gesture feel and the extreme crop choice remain review
items, not claimed acceptance.

Verdict: **ready with noted risks**. Changes are available for review and remain
uncommitted and unpublished.

## October 7 transition follow-up

The grid viewer now uses atomic visual ownership, decoded image
handoffs and direct video canvases. See the [transition findings, verification,
and decision audit](qa/2026-10-07-viewer-transitions.md) for measured causes,
results and remaining review items.

## October 8 — image-ratio cells and red blocks

The interactive cell now matches its first media’s source ratio in both viewport
orientations. A CSS container owns each existing composition slot; an inner
surface fits to `min(slot width, slot height × ratio)` and the corresponding
height. Hover/focus still animates from the existing zoom/focal crop to contain,
which now fills the entire cell rather than introducing internal letterboxing.
Cell bounds do not move on hover. Unused slot space is decorative accent red,
separated by the same dark seam token as the outer grid. Right-hand cells anchor
to the right edge; Toolbox anchors to the bottom edge.

The black backing keeps peer fading neutral rather than blending it into red.
It retires with the hidden source during the viewer handoff. Grid crop values,
video excerpts, editor gestures/export, portrait grayscale and viewer zoom limits
are unchanged. The narrower cell shapes necessarily change the visible resting
crop geometry even though the saved parameters remain identical.

Decision audit:

- **High confidence:** source dimensions drive all six cells through one shared
  CSS implementation, rather than approximate per-image sizes or runtime layout
  measurement. This addresses the ratio mismatch in both orientations.
- **Medium confidence:** retain the authored slot arrangement and fill its
  remainder with red, rather than build a masonry/packing algorithm. This keeps
  the composition recognizable; the red balance at unusual viewport shapes
  needs Aaron’s visual review.
- **High confidence:** preserve the existing crop-to-contain animation and
  isolate decoration outside the interactive cell; red blocks are not clickable.

Verification: TypeScript and 32 composition/routing unit checks passed. Browser
geometry, visual balance and the viewer/editor after this layout change have not
been reverified. Existing earlier browser evidence predates these wrappers.
No server restart, production release, or Figma edit was performed.

Pride gate: yes, the CSS-first implementation is focused and reusable. I would
stand behind the approach, but production acceptance still needs visual review
and the project’s release QA. Verdict: **ready with noted risks** for local review.

## Cycles addition — October 8, 2026

`cycles-dot-money` is grid-only and immediately precedes Informal Systems in
project order and the authored landscape/portrait arrangement. Its 1920×1080,
60 fps, 37.73-second recording is stream-copied with fast-start metadata; the
original quality is retained (roughly 34 MB). The two-second frame supplies the
poster. Full-video looping, hover fitting, editing, and the viewer use the shared
media implementation. Initial crops are centered at 5× and remain adjustable.

Credit context: Aaron built the page and GSAP animations and contributed ideas;
final visual design was by another designer. No sole-design claim is introduced.

Decision review: independent grid metadata preserves the legacy site; explicit
seven-cell areas preserve the authored composition. Keeping original quality
adds a fourth background video and about 34 MB of media. Layout and simultaneous
playback still need manual visual review; no browser verification was run.

Verification: TypeScript passed, 32 composition/routing unit tests passed, and
React Doctor scored changed React files 100/100. High confidence in grid-only
scope and ordering; medium confidence in visual balance until Aaron reviews it.
Pride gate: happy with the shared implementation; production confidence remains
conditional on visual/playback review and the existing release QA gate.
Verdict: ready with noted risks, left uncommitted for review.

## Layout comparison — October 8, 2026

The development panel now offers Video-led, Balanced Mondrian, Dense mosaic,
and Original beside Adjust project cells, including during editing. Development
starts on Video-led; production keeps Original until a layout is selected for
release. Selection lasts for this page session. Crop edits are shared across
layouts and retain the existing copy/export format.

Each alternative has landscape and portrait CSS grid definitions. Video-led
emphasizes Cycles with tall imagery flanking it on wide screens. Balanced
Mondrian distributes visual weight across staggered blocks. Dense mosaic groups
source aspect ratios into rows and centers fitted cells to reduce unused area.
The original project sequence still owns keyboard and gallery order; changing
the arrangement preserves keyed media elements and editor drafts.

Decision audit: high confidence in CSS-only placement and a native accessible
select using existing control styles. No measurement code, dependencies, or
parallel viewer implementations were needed. Medium confidence in visual
balance: source-shaped cells always fit, but the exact amount of red depends on
viewport proportions. Dense is an authored packing, not a globally optimal
packing algorithm. Shared crops make comparisons consistent; layout-specific
crop exports remain outside this experiment.

Verification: TypeScript and 32 composition/routing tests passed. A PostCSS check
validated all eight seven-project arrangements have rectangular named areas.
Visual appearance, interaction, and playback remain for manual review.
Pride gate: happy with the small shared implementation; production endorsement
requires visual review and the existing release QA. Verdict: ready with noted
risks, uncommitted and unpublished.

## Selected-segment editing preview — October 8, 2026

While adjustment mode is active, the selected video's selected segment repeats
with its own fade flags. Clicking it again or changing bounds, fades, or position
restarts at its start. Preview plays the entire configured sequence once in its
configured order, then pauses at the final frame (black when fade-out is enabled).
Selecting or editing a segment returns immediately to that segment's loop.
The preview mode and restart revision are session state, never exported settings.
Leaving the editor restores ordinary sequence looping; expanded playback still
uses the complete source.

Timeline segment bodies support pointer dragging and arrow-key translation
(0.1s, or 1s with Shift). Translation preserves length and clamps against source-time
neighbors, independently of playback order. Stable segment IDs preserve pointer
capture through edits. Existing overlapping ranges cannot translate through one
another; their boundary controls remain available. Add segment now fills a free
gap, preferring one after the selection, or splits the selection when no gap exists.
The existing native range inputs continue to resize the selected segment.

Decision audit:

- High confidence: reuse the existing playback controller with an ephemeral
  selected-segment override rather than remounting/reloading the video. This
  preserves decoded media and existing seek masking; completion and repeated
  selection/edit behavior have focused controller coverage.
- High confidence: clamp whole-segment movement by temporal neighbors, preserving
  source duration and playback order. Pointer capture supports continuous dragging;
  keyboard movement supplies the same bounds. CSS alone cannot express the required
  numeric segment edits, so the pointer handler measures the track once per drag.
- Medium confidence: Preview is one pass that holds at the end, rather than
  automatically returning to the selected loop. A click/edit always resumes the
  selected loop. Gap filling or splitting prevents Add from creating new overlapping
  regions; intentionally overlapping boundary edits remain possible.
- Validation: TypeScript and 45 focused unit tests passed. React Doctor reports
  92/100 with one editor control-flow complexity warning; the controller and drag
  behavior are separate owners, and this is a maintainability note, not evidence
  of a functional failure. Browser playback, fade appearance, and pointer/touch feel
  await manual review; no browser automation was run.
- Pride gate: proud of the shared playback implementation and bounded movement.
  I stand behind the verified logic; production endorsement still needs visual
  acceptance and the project's release QA. Verdict: ready with noted risks.

Changes remain in the main checkout, uncommitted and unpublished.

## Per-segment framing — October 8, 2026

Each segment may now carry `composition.landscape` and `composition.portrait`,
using the same focal point, target, and zoom fields as project framing. Missing
orientations inherit the project crop. With a video segment selected, the existing
pan, Meta+wheel, and keyboard controls edit that segment in the current orientation
and restart its loop. The toolbar identifies the segment, orientation, and zoom.
The first crop edit on a full-length video creates an explicit full-length segment
using loaded metadata. Image-cell framing still edits the project default.

Playback installs the next segment's CSS custom properties synchronously before
seeking or playing, including normal grid playback and the one-pass Preview.
Only geometry transitions on the media frame are cancelled at that change, so
segment framing snaps while ordinary subsequent hover/focus fitting keeps its
existing animation. Video, held canvas, and poster share that media frame. The
existing 0.5s fade flags still control each segment's beginning and end. Gallery
playback remains full source; its frozen source frame and return geometry retain
their existing ownership.

New segments copy the selected segment's explicit framing; resizing, dragging,
and reordering retain it. Clipboard schema 4 includes these optional per-segment
compositions along with project fallback crops and ordered segments.

Decision audit:

- High confidence: optional orientation overrides preserve current project crops
  and existing media data, rather than eagerly duplicating every default. Crop
  edits cannot alter neighboring segments or the other orientation. New segments
  copy explicit selected framing so splitting a segment preserves its view.
- High confidence: apply framing inside the existing playback controller before
  play, rather than waiting for a React render or replacing the video element.
  Stable gesture callbacks and a synchronous selection snapshot keep pointer
  capture intact during continuous edits. CSS still computes frame geometry.
- Medium confidence pending visual review: cancel only the frame's generated CSS
  geometry transitions when framing changes, rather than removing hover animation
  from videos altogether. The native APIs are Baseline Widely available:
  [Element.getAnimations](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations)
  and [Animation.cancel](https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel).
  This avoids adding frame-delay timers or measuring layout to implement a snap.
- Validation: TypeScript and 48 focused unit tests pass. Coverage includes crop
  isolation, fallback and export, full-video conversion, inherited new-segment
  crops, synchronous framing before play, fade timing, reset to inherited framing,
  wrapping, and cleanup. React Doctor remains 92/100 with its existing editor
  complexity warning. No browser tests were run; visual crop switching, continuous
  pan/zoom, hover fitting, and gallery return need manual review.
- Pride gate: proud of the shared framing and playback ownership. I stand behind
  the tested data and playback logic; production confidence still needs visual
  acceptance and the project's release QA. Verdict: ready with noted risks.

Implemented in the main checkout; uncommitted and unpublished.

## Balanced Mondrian and shuffle — October 8, 2026

Balanced Mondrian is now the default in development and production. The other
comparison layouts and dropdown are removed. Shuffle layout in the dev panel
builds both orientation arrangements by scoring 64 randomized rectangular
partitions per orientation for source fit and balanced visible image sizes.
The current viewport informs its orientation; the other uses a reference ratio.
All rendering remains CSS grid, with the existing source-shaped cell surfaces.

Each shuffle copies a versioned `mosaic-layout` JSON containing exact tracks,
area matrices, project mapping, viewport, and current crop/loop adjustments.
No seed or algorithm version is needed to reproduce an exported layout. A failed
clipboard write preserves the arrangement and exposes retry/manual-copy controls.
Done & copy also includes the current layout alongside the existing adjustments.
Selection remains page-session state; reload returns to the approved default.

Decision audit: high confidence in exact explicit exports and shared rendering;
medium confidence in aesthetic variety pending Aaron's visual review. Scoring is
heuristic, not optimal packing, and red gaps still vary by viewport. A shuffle
changes divisions as well as placement; crop and video state stay on keyed cells.
Pure unit checks cover 60 seeded shuffles, rectangularity, completeness, variation,
serialization, and unchanged project data. Clipboard/UI behavior awaits manual
review. Pride gate: happy with this bounded development tool; production release
still requires visual acceptance and established QA. Ready with noted risks.

## Expanded video scrubber — October 8, 2026

Expanded videos now use the shared branded VideoScrubber and a play/pause
control instead of browser-native controls. The existing video plugin retains
playback, sizing, and transition ownership. Controls subscribe to captured media
events on the slide, including videos mounted after the plugin measures its
container; no polling or second video player is introduced.

The scrubber renders actual buffered ranges as a subtle black/20 overlay on the
existing track, behind the solid playback fill and branded thumb. Discontinuous
ranges remain discontinuous. The existing portfolio media also consumes this
shared component and buffered-range reader. Native range keyboard behavior is
preserved; control gestures do not navigate the gallery, and Escape still closes.

Decision audit: high confidence in shared styling and actual buffered-range data;
medium confidence in the unverified viewer placement and touch interaction. The
footer stays visible on opening, including reduced-motion playback. Browser-native
menus are replaced by seek and play/pause controls for these muted recordings.
TypeScript and ten buffer/playback tests passed. React Doctor reported no issues
(score 93 across the expanded changed-file scope). Browser/manual verification
remains outstanding. Pride gate: happy with the implementation; production
endorsement still depends on visual acceptance and existing release QA.
Verdict: ready with noted risks; uncommitted and unpublished.

## Full-width loop editor and fades — October 8, 2026

Selecting a video in adjustment mode expands the dev panel across the viewport.
Two native range handles set start/end without crossing; numeric fields remain
for precision and keyboard access. The timeline covers the complete duration.
Per-project `loopFadeSeconds` (zero disables) is included in copied adjustments
and shuffle payloads. It applies to grid previews, not full expanded playback.

Fade opacity follows decoded media time inside the selected segment (or full
video). A 0.25s setting fades in over the first 0.25s and fades out over the last
0.25s while playback continues. Overlapping fades are limited to half the segment,
with an editor explanation. Both live video and held seek frames receive opacity;
segment restart masks its handoff at zero. Frame callbacks drive active fades,
with animation-frame fallback and existing pause/visibility cleanup.

Decision audit: high confidence in timing, export, and preservation of the playback
controller; medium confidence in touch dragging and visual handoffs until reviewed.
Native handles avoid a separate drag engine. Very close handles can overlap;
numeric and keyboard controls remain available. TypeScript and 37 relevant unit
tests passed, including fade boundaries and short loops. Browser verification is
outstanding. Proud of the shared implementation; production confidence requires
visual acceptance and established release QA. Ready with noted risks.

## NextPhrase recording replacement — October 8, 2026

The project ID/slug is now `nextphrase-dot-app` in the shared project collection
and grid layout mapping. Existing `/work/nextphrase` (including slide paths),
`/og/nextphrase`, and grid query links retain compatibility through redirects or
an alias. The stable media ID `nextphrase-intro` remains unchanged.

Source: `~/Downloads/nextphrase-dot-app with fades.mp4`, 40,557,864 bytes,
530×1080 at 60 fps, 61.617 seconds. Web delivery uses VP9 WebM (CRF 32,
zero target bitrate, good deadline, cpu-used 4, row multithreading, 120-frame GOP,
yuv420p, main video stream only): 4,795,776 bytes, approximately 88% smaller.
Resolution and frame rate are retained. The new lossless PNG poster is taken
at 12.5 seconds. Full decode completed without errors and representative decoded
frames were inspected locally. The old 0–5s excerpt is removed so the recording's
complete sequence and baked fades play. Existing crop framing remains adjustable.

Decision audit: high confidence in shared rename, old-link compatibility,
source dimensions, and full-video playback. Retaining WebM keeps the established
format without adding a second download. Compression is lossy; sampled frames
look readable, but full browser playback awaits Aaron's review. TypeScript and
61 relevant unit tests passed across the focused runs; redirect mappings checked.
Happy with the implementation; production endorsement still requires visual
acceptance and the established release QA. Ready with noted risks, uncommitted.

## Ordered video segments — October 8, 2026

Each grid video can now define an ordered `segments` array. Entries contain start,
end, fadeIn, and fadeOut; editor-created entries also carry a stable ID. Copying
adjustments uses schema 3, including all segments in order. The previous approved
Cycles range (2.99–10.29, both fades enabled) and Informal range (1–6, neither fade)
are preserved as their first entries. Other videos remain full length.

The full-width timeline shows every segment; numbered buttons select a segment
for its two native draggable handles, numeric bounds, and independent fade toggles.
Add, remove, move earlier/later, and reset-to-full controls modify the same list.
Overlap and nonchronological order are allowed deliberately. New segments default
to no fades. All enabled fades use the one internal constant
`MOSAIC_SEGMENT_FADE_SECONDS = 0.5` in `components/mosaic/videoLoop.ts`; there is no
per-project duration field. Short segments limit fade length so they can still
reach full opacity. Expanded playback continues to show the complete source.

Playback advances to the next segment and wraps after the last, retaining the
existing masked seek, pause, reduced-motion, and hidden-page handling. Gallery
return uses the active segment to decide whether its playback time can transfer.
No video source reload or new playback controller is needed between segments.

Decision audit: high confidence in ordered data, independent fade timing, export,
and pause/seek behavior. The editor is separated from the parent dev panel, which
also removes its prior complexity warning. Medium confidence in unverified visual
fit and touching/overlapping timeline handles; numbered selectors and numeric
fields remain available. TypeScript and 40 focused tests passed, including
forward/backward jumps, wrapping, pause/resume, in-flight edits, reset, short fades,
and export isolation. React Doctor reports no issues (93 across changed files).
Browser checks were not run. Proud of the shared implementation; production
endorsement still requires visual acceptance and established QA. Ready with noted
risks, uncommitted and unpublished.

## Shared framing across screen sizes — October 9, 2026

Project and segment framing now use one `MosaicComposition` each. The approved
landscape project crops become the shared defaults without changing their values.
A segment's optional crop overrides its project's crop at every viewport size.
Grid arrangements still vary by orientation; crop selection, gesture handling,
and playback framing no longer depend on orientation. The editor's orientation
label and subscription are removed. Timing, fades, selected-segment looping,
instant crop switching, and hover fitting retain their existing behavior.

Clipboard schema 5 stores each cell as `{ composition, segments? }`; every segment
may also contain its own `composition`. The optional layout retains its landscape
and portrait arrangements. The existing copy workflow has no runtime JSON importer;
old copied payloads can still be converted when applying them to source settings.

Decision audit: high confidence in keeping the approved landscape values rather
than averaging distinct crops, and in removing the duplicate model rather than
merely synchronizing two copies. Source-shaped cells make the relative framing
independent of cell size; one geometry check exercises this with all seven project
crops. CSS remains responsible for sizing and positioning, and layout orientation
remains separate from framing. TypeScript, 50 focused unit tests, and diff checks
pass. React Doctor remains 92/100 with the existing editor complexity warning.
Browser assertions were updated for the shared export contract but not run;
responsive appearance and editing still await visual acceptance. Proud of this
simpler model and confident in its tested behavior. Production endorsement still
requires that visual acceptance and the established release QA. Verdict: ready
with noted risks. Main checkout only; uncommitted and unpublished.

## Compact segment controls and speed — October 10, 2026

The timeline and its scale retain the full panel width. Other editor rows and
helper text are capped at 60rem, with shared numeric inputs sized to 8rem and
allowed to wrap. Each segment accepts an optional `speed` from 0.1 to 2; omission
means 1. The additive field is included in schema 5 clipboard exports. New
segments inherit the selected segment's speed, including when splitting it.
Changing speed restarts the selected segment; sequence playback applies each
speed before seeking/playing, and full-video playback resets to 1.

Decision audit: high confidence in keeping source-time boundaries unchanged and
using native playbackRate, rather than rewriting timestamps or encoding new
assets. Fades remain 0.5 seconds of real playback by scaling their source-time
window with speed (shortened for short segments); tying fades to source time
would make them unexpectedly long in slow motion. Optional speed preserves all
existing settings at normal speed without a migration. CSS owns compact wrapping
and shared numeric presentation; no runtime layout measurement was added.
Platform references: [flex](https://developer.mozilla.org/en-US/docs/Web/CSS/flex)
and [playbackRate](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate).

TypeScript, 24 focused tests, and whitespace checks passed. Tests cover rate
changes before playback, resets, invalid rates, real-time fades, and preservation
through editing/export. React Doctor remains 92/100 with the existing editor
complexity warning. Browser layout, actual media playback, and responsive wrapping
remain unverified. Proud of this scoped implementation and confident in the tested
logic; production endorsement still requires visual acceptance and release QA.
Verdict: ready with noted risks. Main checkout; uncommitted and unpublished.

## Fade handoff correction — October 13, 2026

A readiness event after `seeked` could restore the held outgoing frame's opacity
before a new decoded frame was revealed. A regression test reproduced the flash
at 3× with fade-out enabled and fade-in disabled. Readiness synchronization now
preserves opacity while video is masked, and both frame-callback paths apply the
incoming fade only when a frame passes the reveal guards.

Decision audit: high confidence in fixing the frame handoff rather than changing
easing or adding a black pause; the fade duration and loop timing stay intact.
TypeScript and 19 playback/fade tests pass, including the formerly failing case.
No browser verification was run; the reported visual result still needs Aaron's
review. Proud of the focused fix and confident in the reproduced logic; production
endorsement remains subject to visual acceptance and release QA. Ready with noted
risks, uncommitted and unpublished.

## Layout approach comparison — October 13, 2026

The dev panel now offers Saved Mondrian, Justified, and Rectangle packing.
The existing saved layout stays the initial selection. Both packing approaches
position source-shaped cells directly and recompute for the available grid area,
including opening/closing the timeline dock. Existing crop and segment settings,
media instances, project keys, and gallery controls remain shared.

Justified evaluates seeded project permutations, row partitions, and their
column equivalents. It solves for a row width that fits both viewport dimensions
with constant gaps. MaxRects uses `maxrects-packer` 2.7.3, rotation disabled,
with bounded size trials and similar-area weights. Both score occupied area with
a penalty for extreme size imbalance. These are bounded heuristics, not a proof
of globally optimal packing. The filled percentage is source-cell area divided
by the grid's usable inner area, excluding its perimeter; internal gaps count as
unused space. The justified search is capped for larger future collections.

A worker owns the search so controls stay responsive. ResizeObserver supplies
actual container dimensions; CSS alone cannot choose arbitrary project groups
and solve this constrained packing problem. CSS retains framing and styling.
Stale worker results are rejected, workers are terminated on selection change or
unmount, and the existing layout remains visible while the first result loads.
Shuffle changes the seed; copy exports optional `layout.packing` with approach
and seed alongside the fallback arrangements and all cell settings. Results are
reproducible at the same dimensions and adapt at other dimensions.

Decision audit: high confidence in preserving the approved Mondrian fallback,
source ratios, stable video elements, and keeping solver work off the main thread.
A small custom justified solver was chosen over Flickr's width-oriented utility
because this screen must fit a fixed height too; MaxRects handles irregular
placement without writing a second rectangle-packing engine. Relative area
balance is preferred over maximizing fill at any cost. Production build (including
worker compilation), TypeScript, and focused geometry tests pass. Tests exercise
both algorithms at four viewport/dock sizes and three seeds, checking coverage,
repeatability, seed variation, bounds, every project, overlap, and source ratios.
React Doctor remains 92/100 with only the existing editor complexity warning.
No browser verification was run. Selection, resize/dock behavior, clipboard use,
and visual fit need Aaron's review. Proud of the implementation and confident in
the tested geometry; production endorsement still requires hands-on acceptance
and established release QA. Verdict: ready with noted risks. Uncommitted and
unpublished; pre-existing unrelated working-tree changes were left alone.

## Aspect-ratio tolerance — October 13, 2026

Both packing approaches now expose Ratio tolerance (%) in the shared layout
selector. Newly selected packers start at 10%; 0% restores exact ratios and 30%
is the current exploratory upper bound. Existing saved settings without tolerance
still mean 0%. Tolerance is included in layout clipboard exports and retained
when switching between packers or shuffling.

Justified rows/columns adjust their aspect ratios toward filling both axes.
Rectangle packing tries bounded individual ratio variations. Both also evaluate
the original exact-ratio candidates, accepting flexible candidates only when
coverage improves and the existing size-balance score improves. This is a bounded
heuristic, not a guarantee of optimal packing. Source media is never stretched:
packed slots fill their allocation with the authored crop, while hover/focus
transitions the media to its exact ratio centered inside that fixed allocation.
Neighbors and hit targets stay stationary; exposed space uses the grid background.
Adjustment mode retains its existing crop editing behavior.

Decision audit: high confidence in preserving source ratios and using fixed slots
instead of hover-driven reflow, which would move neighbors and destabilize pointer
targets. Medium confidence in the 10% default and 30% cap; these are visual tuning
choices for Aaron to assess. Keeping the exact solution avoids trading worse fill
for cropping. Ratio trials remain in the worker; UI constants live separately so
controls do not import the packing library into the main bundle. No dependency added.

TypeScript, four packing tests, and whitespace checks pass. Tests cover exact-mode
compatibility, deterministic output, tolerance bounds, screen bounds, retained
gaps, and improved coverage across landscape/portrait and dock-sized viewports.
React Doctor remains 92/100 with the existing loop-editor complexity warning.
Browser animation, framing, and control interaction remain unverified, as requested
by the project verification policy. Proud of the implementation and confident in
the tested geometry; production endorsement requires visual acceptance and release
QA. Verdict: ready with noted risks. Changes remain uncommitted and unpublished.

## Radio App demo — October 22, 2026

Added the grid-only `radio-app` project with one video and a lossless WebP
poster from 0.5 seconds. Source: `~/Downloads/radio-app-demo-imovie.mp4`
(41,766,736 bytes, 1920×1080, 60000/1001 fps, 61.027633 seconds).
`public/portfolio/radio-app/demo.mp4` retains those dimensions, frame rate,
and duration using H.264 CRF 22, slow preset, yuv420p, a 120-frame maximum GOP,
and fast start. Only the main video stream is retained; the source has no audio.
Output: 3,068,852 bytes, 92.7% smaller. Poster: 109,622 bytes.

The grid intro plays 0–0.967633 seconds at 1×, then the remaining footage at 2×.
The split falls within the source's fully black transition frames. The outer
edges use the existing half-second black fades; the internal boundary has no
added fades or seek. Expanded playback retains the full recording at normal speed.
The existing packer includes the ninth project, with both authored fallback
arrangements also updated.

Verification: complete decode without errors, fast-start atom order, encoded
frame inspection, TypeScript, and 15 layout/fade unit tests passed. Decision
review: high confidence in the frame-aligned split and retaining source timing
instead of baking speed changes into the file. Compression is lossy; the inspected
frame remains readable. This follows the established media pipeline and is an
implementation I stand behind; browser playback still awaits visual acceptance.
Ready with that noted verification gap. Unrelated working-tree changes remain.

## Video handoffs and centred logo — October 22, 2026

The shared video controller now captures the frame actually on screen when it
holds playback for a seek. A boundary timestamp must not cause an earlier cached
intro frame to reappear. Frame-callback, time-update, and timer regressions cover
that case. A live, temporary observer checked 62 handoffs across all eight videos:
held frames matched the current image, fades remained hidden through seeks, and
the continuous FreshBooks/Loopio speed changes did not seek or reload the video.
Radio's held intro frame was black. The probe removed its listeners afterward.

The grid logo now sits at the viewport centre in a square three logo widths wide:
one width for the mark, plus one width of background on each side. The existing
resize observer measures that actual box relative to the grid's padded interior.
Opening the dock reduces the grid's available height without moving the logo.

Rectangle packing initializes MaxRects' available regions around that reservation.
Justified packing evaluates two four-region arrangements around it, then fits rows
or columns within each region. Both retain deterministic seeds, ratio tolerance,
constant inter-project gaps, and exact-ratio comparison candidates. These remain
bounded heuristics, not proofs of the densest possible arrangement.

Decision audit:

- **High confidence:** CSS owns the centred logo and its full margin; the existing
  geometry measurement sends its bounds to the worker. Unlike painting a black
  square over a cell, the packed result reserves real space for the logo.
- **Medium confidence:** justified rows are fitted within four surrounding regions,
  while MaxRects uses overlapping free regions. This preserves distinct approaches
  without adding a dependency; their visual balance still needs Aaron's review.
- **Medium confidence:** the old fixed Mondrian option is no longer selectable,
  since it cannot reserve this viewport-centred obstacle. Old layouts without
  packing settings use the default rectangle packer. Authored arrangements remain
  stored and serve as the initial/error fallback rather than being deleted.
- **Validation:** 42 focused unit tests and TypeScript pass. Geometry tests cover
  all nine projects, both algorithms, exact/tolerant ratios, gaps, deterministic
  output, portrait/landscape, and a reservation partly outside the dock-sized grid.
  An existing tolerance assertion was corrected to use the packer's established
  small-viewport gap clamp after the ninth project was added; production gap rules
  were not changed. React Doctor remains 92/100 with its existing editor warning.
- **Remaining review:** the new logo layout has not been inspected in a browser.
  While a layout is initially calculating, the authored fallback may pass behind
  the logo; the computed layout avoids it. On exceptionally short windows the dock
  can cover the viewport centre. No server was started or restarted for this work.

Pride gate: proud of the shared reservation and tested geometry. Confident in the
implementation, with visual acceptance and normal release QA still required before
production. Verdict: **ready with noted risks**. No commit, push, or publication;
unrelated working-tree changes were preserved.

### Square framing refinement

Avoiding the logo alone allowed an irregular opening. Both packers now allocate
one project to each available side first, align those projects to the square's
inner corners, and require each facing edge to span its side except for the
ordinary corner gutter. Other projects pack outward within the four surrounding
regions. Two mirrored arrangements and seeded project allocations retain shuffle
variation; source-ratio tolerance remains bounded as before.

Decision audit: high confidence in enforcing four aligned edges instead of only
checking non-overlap. The deliberate tradeoff is that this stronger visual
constraint can reduce total coverage versus unrestricted MaxRects packing.
Both selectable approaches share the frame rule while retaining their distinct
regional packing algorithms. When the dock clips the centre, only the remaining
visible sides can be framed. Geometry tests cover multiple seeds, sizes, tolerance
settings, gaps, and all four edge contacts; browser appearance remains unverified.
Proud of this implementation and confident in its tested geometry; production
endorsement still requires visual review and normal release QA. Ready with those
noted risks. No dependency, server, media, or publication changes.

## Initial entrance — October 22, 2026

The central logo fades in over 450 ms. Project cells remain hidden and inert until
that animation and a complete packing result are ready. Each entrance captures
its geometry and a random permutation of its four corners once on the client.
Cells launch clockwise from twelve o'clock, ordered by their nearest facing edges;
nearer cells win when two occupy the same ray.

Each red shape travels for 650 ms with an 85 ms stagger, remaining a square whose
outer width and height equal one logo pixel. Only after arriving at the final
cell centre does it expand, moving one corner at a time over four 45 ms intervals.
Every interval uses quadratic easing: 25% of its movement by the midpoint. Point
winding remains fixed regardless of the randomly chosen order.

Four native SVG edge paths follow the same four-point polygon used for clipping.
Their non-scaling strokes start at one logo pixel inside the polygon. After each
corner lands, its clockwise adjoining edge thins to 1 px over the next 45 ms,
overlapping the next corner's growth. The last edge gets a final 45 ms interval,
so the full growth-and-thinning sequence takes 225 ms. All rectangles then wait
until half a second after the last rectangle completes its fourth corner. The last
edge's thinning occupies the first 45 ms of that hold. A shared completion group
waits for every tile's actual growth end event before scheduling the remaining
455 ms hold. The outlines then flicker and fade fully out over 90 ms each,
in a freshly shuffled order with 85 ms between starts. Every project remains
hidden until the last fade and its 90 ms blank tail finish; then all ready media
may reveal together. Media then fades in over 350 ms
when ready. Videos remain paused until the outline finishes, and the existing
controller and native video element remain mounted throughout.

Decision audit:

- **High confidence:** native SVG animation moves each path vertex and preserves
  a real outline on every moving edge. CSS clipping alone would reveal a filled
  polygon without tracing those edges. SVG travel, growth, and flicker are linked
  by explicit native event listeners; no guessed completion timers or per-frame
  JavaScript are needed. Native [SVG animation](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/animate)
  and its [end event](https://developer.mozilla.org/en-US/docs/Web/API/SVGAnimationElement/endEvent_event)
  supply the sequencing. GSAP remains installed but is not added to this entrance.
- **High confidence:** an inside clip keeps each independently animated stroke within the
  planned rectangle. Only the SVG travels; the full-size cell background never
  moves across neighboring projects. The initial tiny square is fully covered by
  its stroke, then develops an open interior naturally as its corners expand.
- **High confidence:** the dedicated entrance hook latches geometry/order and
  completion. Editor updates, viewer returns, and later shuffles do not replay it.
  A packing failure reveals the existing fallback. Reduced motion skips the
  sequence, including when the preference changes during playback.
- **Medium confidence:** each tile gets its own random order on page load; the
  chosen 45 ms per corner and final flicker timing are visual judgments for Aaron.
  During an entrance-time resize, the SVG fits its captured geometry to the updated
  cell while retaining a non-scaling stroke; the moving origin may no longer line
  up with the newly centred logo. This brief resize case remains unverified.
- **Verification:** TypeScript, CSS checks, and 40 focused ordering/geometry,
  segment-fade, and video-playback tests pass. Geometry covers all 24 corner orders,
  fractional dimensions, exactly one moving corner per stage, and exact final
  bounds. React Doctor remains 92/100 with only the pre-existing loop-editor
  complexity warning. Browser appearance and SVG event sequencing still need
  hands-on review; no browser inspection or persistent-process changes were made.

Pride gate: proud of the constant-stroke SVG and the explicit native event chain.
Confident in the implementation and tested geometry; production confidence still
requires visual acceptance and normal release QA. Verdict: **ready with noted
risks**. Unrelated edits remain untouched; nothing has been committed or published.

### Travel-to-growth handoff repair

Aaron observed the squares arriving but never growing. The previous corner
animation lived inside the path cloned by both SVG `use` elements, with ID-based
syncbase references connecting the stages. The animation now lives outside that
shared definition and targets it explicitly; direct `endEvent` listeners start
corner growth, then flicker, then release the media. One-shot listeners and cleanup
prevent duplicate stage starts and callbacks after removal.

Decision audit: high confidence in removing cloned-animation/ID-resolution
ambiguity and making the handoff testable. The screenshot is consistent with that
failure, but the exact browser failure has not been inspected. TypeScript and 42
focused tests pass, including stage order, final-only media release, and cleanup.
React Doctor remains 92/100 with the existing editor warning. Proud of the simpler
ownership; production endorsement requires browser confirmation of the repaired
sequence. Verdict: **ready with noted risks**. No browser or process changes.

### Per-edge thinning — October 22, 2026

- **High confidence:** each corner owns its clockwise adjoining edge, so every
  random corner permutation thins all four edges exactly once. Independent edge
  paths share the clip polygon's geometry and easing; their doubled stroke widths
  are clipped inward to finish at a visible 1 px.
- **High confidence:** a shared 450 ms growth clock preserves the four 90 ms
  corner moves and adds a final 90 ms for the last edge. The explicit completion
  event starts flicker only after that interval; no timer estimates are used.
- **Medium confidence:** linear 90 ms thinning and the joins between independently
  stroked edges need Aaron's visual review. Browser verification was not run.
- **Verification:** TypeScript and all 7 entrance tests pass, covering matching
  edge/polygon geometry for every corner permutation and grouped animation
  handoff. React Doctor stays at 92/100 with its existing loop-editor warning.
- **Pride gate:** proud of the focused native implementation; confident in the
  geometry and sequencing, with production appearance conditional on visual
  review. **Verdict: ready with noted risks.**

### Shared hold and faster expansion — October 22, 2026

- **High confidence:** corner growth is 180 ms; flicker/fade is 180 ms. A shared
  group waits for all real completion events, instead of estimating the final
  tile's arrival from its stagger rank. The one-second hold is measured from
  completion of the final corner, including its subsequent 45 ms edge thinning.
- **Medium confidence:** the shorter flicker uses linear opacity changes to fade
  fully to zero; its visual rhythm remains for Aaron to review. Existing reduced
  motion and cleanup handling remain in place. The project roster is fixed during
  entrance; changing the roster mid-entrance is outside the current interaction.
- **Verification:** TypeScript and all 8 entrance tests pass, including out-of-order
  completion and single shared release. No browser verification was run.
- **Pride gate:** proud of the focused event-based coordination; confident in the
  tested timing logic, with visual production confidence pending review.
  **Verdict: ready with noted risks.**

### Shared media reveal — October 22, 2026

Corrected the per-tile reveal: the group now waits for every opacity animation's
end event, each including a 90 ms blank tail after its 90 ms fade. Earlier tiles
stay hidden throughout later tiles' fades. Completion callbacks are released
exactly once, together, after the final tail. Media readiness still applies.

Decision audit: high confidence in the shared event barrier rather than guessed
timing; the existing fixed-roster assumption remains. Proud of this focused fix
and confident in the sequencing; visual appearance remains unverified. TypeScript
and 9 entrance tests pass, including out-of-order fade completion with no early
project reveal. Verdict: ready with noted visual-review risk.

### Development adjustment layer — October 22, 2026

The dev panel now has **Blend Mode** and **Adjustment Layer Colour** controls.
A fixed, viewport-sized, pointer-transparent layer sits above the grid and below
the central logo, dev panel, and expanded viewer. It starts transparent with
normal blending. The sixteen standard blend modes use native CSS; colour accepts
any browser-supported CSS colour, including hex, named colours, and rgba(). Empty
input clears the layer. Invalid drafts retain the last valid colour and show a
concise field error. Settings last for the page session and are included as
`adjustmentLayer` in both adjustment and layout clipboard exports.

Decision audit:

- **High confidence:** native [mix-blend-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode)
  and [isolation](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/isolation)
  are Baseline Widely available. A grid stacking context keeps every cell beneath
  the adjustment layer; the root isolates blending from unrelated page content.
  This avoids canvas processing, runtime measurements, and additional dependencies.
- **High confidence:** the layer is supplied by the development surface through a
  slot, preserving the production route's exclusion of dev controls. Shared input
  and select primitives preserve the existing editor's styling and native labels.
  Layout, tolerance, segment-number, and new colour controls share their owner.
- **Medium confidence:** stacking and pointer pass-through were reviewed in code;
  visual blending, hover/viewer transitions, and GPU cost remain unverified in a
  browser. Browser checks were not requested. Session-only settings match the
  existing editor; no persistent storage or production colour treatment was added.
- **Verification:** TypeScript passes and both modified CSS modules parse. React
  Doctor remains 92/100 with only the existing loop-editor complexity warning.
  Unrelated working-tree changes were preserved.
- **Pride gate:** proud of the focused native implementation and confident in its
  data flow; production visual confidence remains conditional on manual review.
  **Verdict: ready with noted risks.**

### Per-project saturation covers — October 22, 2026

Supersedes the viewport adjustment layer above. Every grid tile now owns a
pointer-transparent cover between its media and label. Defaults are `saturation`
and `rgba(255,255,255,0.8)` in both ordinary and development grids. The dev controls
still change all covers and export the settings; controls remain excluded from
the production component imports.

Each tile isolates blending to its own contents. Cover opacity transitions to
zero on fine-pointer hover, keyboard focus, and the existing fitted viewer-return
state, and back to one when inactive. The transition reuses the media-padding
motion duration; reduced-motion skips it. Keeping colour alpha in the settings
and animating cover opacity also works with custom CSS colours without parsing
or rewriting them. Covers stay clipped to tile bounds and follow their media
entrance visibility.

Decision audit: high confidence in the shared tile implementation and CSS-only
transition; no JavaScript hover handlers or new dependencies. TypeScript passes.
The existing viewer captures unfiltered source media; immediate click/touch
handoff appearance and the blend/hover effect still need manual visual review.
Proud of the focused implementation; production visual confidence is conditional
on that review. Verdict: ready with noted risks.

### Red fill beneath project reveal — October 23, 2026

Replaces the flicker/fade-out and blank-screen beat. After the existing shared
500 ms hold, rectangles fill to 10% accent red over 90 ms in shuffled order,
staggered by 85 ms. The 1 px outlines remain. All projects wait for every fill to
finish, then ready media fades in over the red using the existing 350 ms reveal.
The ink stays mounted underneath until that tile's surface opacity transition
ends, preventing a black flash at handoff. Slow media retains its red placeholder.
Reduced motion continues to hide the entrance SVG and skip its sequence.

Decision audit: high confidence in retaining the existing shared completion
barrier and mounting the ink below the project surface, rather than removing it
at arrival. The final red fill uses native SVG fill-opacity, with no per-frame
JavaScript. The filled rectangles and outlines are covered by the media rather
than fading independently. Timing/appearance still need visual review; browser
verification was not requested. TypeScript and 10 entrance tests pass, including
out-of-order fill completion and retained ink after arrival. React Doctor remains
92/100 with its pre-existing loop-editor warning. Unrelated changes are untouched.
Proud of the focused implementation and confident in tested sequencing; visual
production confidence remains pending review. Verdict: ready with noted risks.

### Stroke-to-fill ordering correction — October 23, 2026

All four corner moves now finish at full logo-pixel stroke width over 180 ms.
Per-corner stroke thinning is removed. After the existing shared 500 ms hold,
each shuffled fill begins a simultaneous 90 ms transition: fill-opacity 0 → 0.1
and the whole outline's stroke-width → 0. The stroke starts from the native fill
begin event. Its end event releases the tile into the shared completion barrier,
ensuring the stroke is gone as well as the fill complete before media reveals.
Ink remains behind each project's opacity reveal until covered.

Audit: high confidence in explicit event ordering and the shared width inherited
by all four edges. Preserving the hold/stagger is intentional; only the overlap
between corner movement and stroke removal changed. TypeScript and 10 entrance
tests pass, including no stroke start during growth/hold and no media reveal on
fill completion alone. Visual timing remains unverified. Proud of the focused
correction; confident in the tested ordering, with production appearance pending
review. Verdict: ready with noted risks.

### Slow playback during project reveal — October 23, 2026

Grid videos start at 20% of their active segment's authored speed. The shared
scale persists through subsequent segments, seeks, and loop restarts. When every
project's media surface finishes appearing, the grid recovers to its authored
speeds together over 1,000 ms using smoothstep easing. Images and fallback posters
participate in this reveal barrier; the SVG entrance keeps its existing timing.

Decision audit:

- **High confidence:** the clock belongs to the grid rather than to an intro
  segment, so short intros cannot prematurely end the slowdown. A single frame
  callback updates native playback rates without React rerenders, reloads, or
  time-scale-induced seeks. Each video's current segment supplies its base rate.
- **High confidence:** segment fades retain their media-time spans, including
  black/white selection. Slower playback stretches those fades naturally, and
  recovery accelerates them without changing their current opacity. Multiplying
  the fade spans by the temporary scale would incorrectly cancel this effect.
- **High confidence:** native CSS transition completion determines reveal, rather
  than a guessed loading timeout. No-transition/reduced-motion surfaces complete
  immediately, and cancelled transitions settle. Subscriptions clean up on
  unmount; a backgrounded recovery catches up when animation frames resume.
- **Medium confidence:** the existing fixed project roster assumption remains.
  A project still waiting for media keeps the grid slow until it reveals its
  media or fallback. Actual browser timing and the feel of the easing await
  Aaron's visual review; no browser verification was requested.
- **Native limit:** Chromium rejects rates below 0.0625, as defined in its
  [media-element implementation](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/html/media/html_media_element.h).
  If an unusually slow authored rate multiplied by 0.2 is rejected, that video
  temporarily uses this floor. Engines accepting the exact rate keep it. This
  avoids breaking the whole reveal for a 0.1× segment; recovery still returns to
  its authored rate. Saved segment settings are unchanged.
- **Verification:** TypeScript and 53 focused tests pass, covering shared recovery,
  late arrivals, exact completion, cleanup, consecutive/faded segment handoffs,
  slowed fades, paused/full-video playback, and native rate rejection. React Doctor
  remains 92/100 with its existing loop-editor complexity warning. Existing
  unrelated working-tree changes were preserved.
- **Pride gate:** proud of the focused shared clock and preservation of the media
  controller; confident in tested behavior, with production visual confidence
  conditional on manual review. **Verdict: ready with noted risks.**

### Hover-controlled playback tempo — October 23, 2026

Supersedes automatic recovery after the final project reveal. Every grid cell
now owns its tempo and stays at 20% of its authored segment speeds indefinitely.
Fine-pointer hover or keyboard-visible focus ramps that cell to normal over one
second. Leaving both states ramps it back to 20% over one second. Reversals start
from the current rate; other cells remain slow. Touch does not latch hover, and
the expanded viewer retains its existing playback behavior. Segment fades follow
media time in either direction, without resetting the playhead.

Decision audit: **high confidence** in moving the existing tempo controller into
the shared tile instead of coordinating all projects. The native media API needs
JavaScript for playback rate; no presentation measurement or dependency was
added. Retaining the one-second smooth ramp, applying it on exit, and supporting
keyboard focus are deliberate interaction choices. **Medium confidence** in their
visual feel until Aaron reviews them. TypeScript and 44 focused tests pass,
including independent cells, interrupted ramps, focus/hover overlap, cleanup,
segment transitions, and fades. React Doctor remains 92/100 with the existing
loop-editor warning. Unrelated working-tree changes were preserved.

Pride gate: proud of the smaller per-cell ownership and tested rate continuity;
confident in the behavior, with production visual confidence pending review.
**Verdict: ready with noted risks.** No browser verification was run.

### Expanded About Me — October 23, 2026

About Me now opens a full-screen reading view inside the existing gallery modal.
Desktop has three columns: the portrait, the current biography, and the current
working-style/strengths sections. The header, typography, Markdown, links, and
list markers reuse the portfolio's canonical text components. Copy comes from
the existing About Me project; development hot reload refreshes it independently
of unsaved framing adjustments. Narrow layouts put the portrait above two text
columns, then stack everything on phones. One region owns vertical scrolling;
the existing close button remains outside it.

The transition retains the captured grid image and shared opening/closing
lifecycle. Instead of fitting the portrait to the whole screen, it measures the
portrait's CSS-defined destination once and shrinks into that position. Text
fades in after the image handoff. Closing uses the actual portrait position,
including any scroll offset. Image zoom is omitted for this reading view;
ordinary projects retain their media viewer. Escape, history, focus restoration,
and reduced motion continue through the shared modal/transition code.

Decision audit:

- **High confidence:** keeping the current biography and details as the two text
  columns meets the request without rewriting or duplicating content. The portrait
  is the new third column; equal column tracks and a capped portrait are an initial
  layout for Aaron to refine.
- **High confidence:** reusing the existing modal avoids a second focus trap,
  dismissal policy, and source-image handoff. CSS owns layout and breakpoints;
  the existing measured-transition approach handles its destination geometry.
- **Medium confidence:** opening/closing alignment, scrolling, and text appearance
  still need visual review. Browser verification was not requested. Existing
  transition coverage now recognizes the custom portrait and checks the About
  content and absence of zoom controls, but those browser tests were not run.
- **Verification:** TypeScript, CSS parsing, and 12 focused content/routing/Markdown
  tests pass. They confirm all three detail sections and 15 list items render with
  the canonical list component. React Doctor remains 92/100 with its existing
  loop-editor warning. Unrelated working-tree changes were preserved.
- **Pride gate:** proud of the shared content and modal implementation; confident
  in the checked structure, with production visual confidence conditional on
  review. **Verdict: ready with noted risks.**

## Gift Exchanges demo — October 26, 2026

Added `gift-exchanges` to the shared grid project collection with a single video,
centred uncropped composition, a one-sentence summary, and a lossless WebP poster
from 0.5 seconds. Both authored fallback layouts include the tenth project.

Source: `~/Downloads/gift-exchanges-imovie-export.mp4` (101,307,291 bytes).
The web version at `public/portfolio/gift-exchanges/demo.mp4` retains all
42.4424 seconds at 1920×1080 and 60000/1001 fps. It uses the established H.264
CRF 22 / slow / yuv420p / 120-frame GOP / fast-start settings, keeping only the
main video stream. The source has no audio. Output: 9,320,093 bytes (90.8% smaller).
The full clip uses the shared playback behavior without custom segment edits.

Verification: full decode, fast-start atom order, output dimensions/timing,
encoded frame/poster inspection, TypeScript, and seven existing layout/routing
tests passed. Browser playback and visual layout await review. Existing unrelated
working-tree changes were preserved; nothing was committed or deployed.

## Project copy editor — October 26, 2026

Selecting any project while adjusting cells now shows Title, Blurb, and Longer
blurb fields. Images and videos share the same editor dock and field primitives.
Title and Blurb update the project’s existing labels; Longer blurb is stored as
`longSummary` for later expanded-view work and is not rendered there yet.
Copy drafts are keyed by stable project ID, survive selection and media edits,
and preserve updates to unedited source copy during hot reload. Like media
adjustments, they last for the current page session until copied and baked in.

Clipboard schema 6 adds `projects: { [projectId]: { title, summary, longSummary } }`
alongside the existing `cells`, layout, and adjustment-layer data. Every project
is exported, including untouched fields and empty longer blurbs. Done & Copy,
manual-copy fallback, and Shuffle layout’s nested adjustments all use the same
displayed draft. Cell IDs, crops, segments, and playback settings retain their
previous structure. There is no browser import/parser to migrate; pasted exports
are applied to the authored data by the agent.

Verification and decision audit:

- **High confidence:** reuse `summary` for Blurb and add optional `longSummary`
  rather than duplicating copy fields or reusing the About page’s Markdown.
  Older project data remains valid; exports normalize omitted longer blurbs to
  an empty string.
- **High confidence:** keep text separate from segment drafts and stable project
  identity so crop edits, segment selection, and title changes do not discard
  text or change media keys. Native labelled fields reuse the editor’s shared
  styles; CSS controls the responsive row and the dock’s scroll limit.
- **High confidence:** increment the clipboard schema to identify the new
  project-level section rather than embedding project text in media settings.
  All clipboard paths include it; line breaks, quotes, Unicode, and deliberately
  empty blurbs are covered by the updated serialization check.
- **Checks:** TypeScript passes. The focused composition/segment suites report
  32 passed and the same three failures present before this task: an outdated
  grid-height CSS expectation, an older segment expectation without an ID, and
  excerpt expectations that predate the newer two-segment intros. Those failures
  were left unchanged. React Doctor remains 92/100, flagging the development
  component’s size and loop-editor complexity. Browser tests were not run;
  their schema expectations were updated for the new contract.
- **Validation gap:** Aaron still needs to review field layout, switching
  projects while editing, and clipboard behavior in the browser. No expanded
  longer-blurb rendering, persistence layer, or unrelated cleanup was added.
- **Pride gate:** proud of the shared editor and explicit export contract;
  confident in the checked data path, with visual confidence conditional on
  review. **Verdict: ready with noted risks.** Existing unrelated changes were
  preserved; nothing was committed or deployed.

## Expanded project blurbs — October 26, 2026

Nonempty `longSummary` values now render through the shared sanitized Markdown
renderer in a black, white-text panel with a logo-stroke-width accent-red border
and a maximum width of 48ch. Interior padding uses the logo-size token and text
uses pretty wrapping. The panel lives in the viewer controls layer, outside the media’s
zoom and slide transforms. It appears after opening and becomes inert during
closing. Empty blurbs produce no panel.

The project editor adds Top/Bottom and Left/Centre/Right selectors. Placement is
stored in `blurbPosition: { vertical, horizontal }` alongside the project copy
and included in every clipboard path as an additive schema-6 field. Older data
defaults to bottom-left. Top placement leaves room for the viewer controls;
bottom video placement leaves exactly one logo-width between the panel and the
top of the logo-high scrubber. Shared safe-area-aware side rails align left/right
panels with the scrubber ends. Centre remains available for both images and
videos. Long content scrolls within the available height, including on touch,
while the media retains the existing viewer gestures.

The previous left offset was the play/pause button and its flex gap. Play/pause
now sits at the top-left, allowing the scrubber to span equal side margins.
During an expanded-project session, a development-only hook injects a scoped
style into Next’s shadow root to hide `#devtools-indicator`. It restores the
badge on exit, handles a late-mounted dev portal, and leaves the error overlay
untouched. This selector was verified against the installed Next 16.4 source;
it should be rechecked when Next’s development UI changes.

Decision audit:

- **High confidence:** one shared panel and optional project-level placement
  preserve the six requested choices without per-project styling branches.
  Bottom-left is the default; video clearance applies to the bottom rail rather
  than overriding an explicitly selected top placement.
- **High confidence:** reuse the existing Markdown sanitizer and link treatment
  instead of adding another renderer. The NextPhrase link is now usable.
- **High confidence:** CSS owns width, alignment, safe areas, clearance, and
  overflow. Moving play/pause preserves the control and removes the asymmetric
  scrubber gutter; no runtime measurement was added for layout.
- **Medium confidence:** badge-only suppression uses a verified internal Next
  selector because its public setting cannot toggle visibility per viewer and
  page CSS cannot reach inside the shadow root. Hiding the entire portal would
  also hide errors, so that alternative was avoided.
- **Verification:** TypeScript and CSS parsing pass. Four new tests cover empty
  blurbs, safe Markdown links, all six placements through editor/export/viewer,
  and the default placement/inert transition state. The selected suites report
  37 passed and the same three previously recorded composition failures. React
  Doctor remains 92/100 with the same two maintainability warnings.
- **Validation gap:** no browser automation was requested or run. Visual
  placement, media controls, native touch scrolling, and badge restoration still
  need hands-on review. Existing unrelated working-tree changes were preserved.
- **Pride gate:** proud of the shared rendering and alignment rules; confident
  in the checked content/export path, with browser interaction confidence
  conditional on review. **Verdict: ready with noted risks.**

### Blurb motion and shared viewer buttons — October 26, 2026

Pause, Close, navigation, zoom, collapse, and notes now use `MosaicViewerButton`:
the same control-size token, 22px icon slot, colours, and focus treatment. The
collapse button stays against the panel’s inner top-right corner without adding
a header row; a small text-flow exclusion prevents it overlapping the first line.

The first reveal brings a logo pixel from beyond the viewport’s right edge to
the notes-button anchor, grows one corner at a time, then fades in the text and
collapse control. Minimizing fades out the content, reverses those corners back
to the pixel, grows uniformly to button size while removing the outline, then
fades in the notes icon. Reopening reverses that local sequence. One shuffled
corner order is kept per viewer session, so collapse retraces the opening shape.

Decision audit:

- **High confidence:** the grid and blurb share corner geometry, 650ms travel,
  180ms corner timing, and both easing curves. Existing grid behaviour is
  unchanged. SVG and Web Animations handle interpolation; completion events
  sequence stages without guessed timeouts or a per-frame JavaScript loop.
- **High confidence:** CSS continues to own all six placements and responsive
  sizing. Geometry is measured once per transition to draw the SVG at the actual
  text-dependent size with a constant inside stroke. Native SVG animation is
  [Baseline Widely available](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/animate).
- **Medium confidence / interpretation:** the small square is centred on the
  notes button’s eventual anchor rather than the expanded panel’s centre. This
  keeps minimizing in place at the chosen screen edge without an extra flight.
- **High confidence:** repeated activation is blocked during motion; completion
  transfers keyboard focus only after a user toggle. Closing cancels pending
  stages. Resizing or changing motion preferences settles immediately to the
  requested responsive state. Reduced motion skips the sequence entirely.
- **Verification:** TypeScript and 21 focused tests pass, including original grid
  sequencing, all six blurb placements, text/icon sequencing, cancellation,
  resize, and reduced motion. React Doctor remains 92/100 with the same unrelated
  development-panel size and loop-editor complexity warnings. Other working-tree
  changes were preserved.
- **Validation gap:** no browser inspection or automation was requested. Actual
  SVG rendering, visual pacing, keyboard focus, and icon appearance need Aaron’s
  review. The collapse preference is local to the open viewer, not saved data.
- **Pride gate:** proud of the shared controls and motion vocabulary; confident
  in the checked sequencing and cleanup. Production visual confidence remains
  conditional on hands-on review. **Verdict: ready with noted risks.**

#### Live blurb motion correction

Aaron’s requested Chrome inspection found incomplete SVG coordinates: spreading
the browser’s `DOMRect` discarded its prototype-backed width and height. The
geometry now reads those dimensions explicitly; a regression test uses accessor
properties rather than the plain objects that missed the original defect.

Verified initial travel, expansion, minimization, and restoration in the open
NextPhrase tab. Actual rendered path samples showed one corner changing per
45ms quarter of the shared 180ms growth phase; text stayed hidden until growth
finished. A paused frame also confirmed that the polygon paints correctly.
All temporary probes and SVG pauses were removed, leaving the viewer expanded.
TypeScript and all 22 focused tests pass. Unrelated working-tree changes remain
untouched.

## GSAP migration — October 26, 2026

The grid intro, expanded-view handoff, and project blurbs now use the installed
GSAP package. `motion.ts` registers CustomEase and converts the existing
millisecond tokens to seconds at the animation boundary. Logo/reveal durations
are now shared tokens (450ms and 350ms); no dependency or public control was added.

`MosaicRectangleInk` and `rectangleMotion.ts` are the canonical renderer and
paused timeline builder for matching four-point paths and clipped inside strokes.
The grid group waits for every measured member before starting its clock. It
retains the clockwise 650ms flights, 85ms launches, 180ms corner expansion,
500ms group hold, and randomized 90ms stroke-to-10%-fill stages. Corner and fill
orders remain stable during a sequence. The completed group releases a separate
readiness gate: each loaded asset receives its own 350ms reveal, and its ink
remains until that reveal completes. Reduced motion and layout changes settle
the sequence; packing failure retains the existing usable fallback.

The viewer keeps snapshots, decoding, frame readiness, source holding, routing,
and focus restoration in application code. GSAP owns only interpolation. During
motion, a requested direction change plays/reverses the current timeline. After
opening has completed, Close captures the current visual and measures the current
grid destination for a fresh return timeline. Video time from that return is
also retained if it is reversed. Portrait and About-content handoffs join the
same clock after readiness, preserving the 360/120/240ms roles. Deep links and
slides without a grid destination use the fade fallback. Abort signals and
generation checks invalidate obsolete media waits; an old play promise cannot
pause a newly reopened video.

Blurb arrival from the far right is a separate timeline. The reusable timeline
connects notes-button geometry, logo pixel, the four corners, the faded red fill,
and the finished panel. Repeated toggles change its direction without rebuilding
geometry or random order. One persistent toggle stays outside the inert/fading
content, at its last settled position while moving; its action updates immediately
and its position switches at completion. CSS still owns six placements, 48ch
width, token padding/stroke, pretty wrapping, overflow, and scrubber clearance.

All animation owners revert their GSAP contexts on cleanup. Geometry is read at
setup/destination changes, not per frame. Internal timelines expose labels,
pause/seek/reverse/timeScale without adding UI. Hover dimming, saturation,
portrait swaps, labels, video segment clocks/fades/tempo, and YARL navigation,
swipe, and zoom remain with their existing owners.

### Verification and decision audit

- TypeScript passes. Nine relevant unit suites pass: **74 tests**. The focused
  animation tests use real GSAP timelines and attribute targets, covering stage
  boundaries, partial reversals, repeat toggles, stable order, internal speed and
  seek controls, readiness/cancellation, cleanup, resize, and reduced motion.
  Rendering tests check the shared ink and the single toggle outside inert content.
- React Doctor's changed-file scan remains **92/100**, with the same pre-existing
  `MosaicDevelopment` size and `MosaicLoopEditor` complexity warnings. An explicit
  scan of all 24 changed/new TS/TSX files is **100/100, no issues**. This additional
  scan includes untracked migration files omitted by the default changed scope.
- The entrance hook deliberately captures its one-time geometry/order in a layout
  effect after asynchronous packing. Its narrow diagnostic annotation documents
  why this is a frozen sequence rather than continuously derived render state.
  SVG nodes use standard React refs; no compiler error is suppressed.
- No browser, screenshot, performance run, server operation, release QA, or
  deployment was performed. Existing unrelated working-tree changes were preserved.

| Decision | Reason and principal alternative | Confidence |
| --- | --- | --- |
| One shared rectangle primitive and GSAP builder | Prevents the blurb and intro paths drifting apart. Independent timelines with duplicated geometry would reintroduce the original mismatch. CSS remains responsible for layout. | High |
| Reverse only an active viewer timeline; capture a fresh return after opening settles | Retraces interrupted motion while avoiding an obsolete opening video frame on normal close. Reversing the original opening snapshot forever would show stale pixels. | High |
| Keep asynchronous media gates outside timeline duration | Asset arrival is not a predictable delay. Fixed waits would permit blank/stale frame handoffs. Existing 1.5s recovery bounds remain for failed media. | High |
| Keep one toggle separate from the fading panel | Preserves focus and immediate reversal at the last settled control position, as selected in the plan. Disabling or replacing controls would restore the interruption problem. | High |
| Measure once and settle on resize/reduced motion | Avoids per-frame layout reads and stale destinations. Continuously retargeting live paths would add complexity outside the agreed choreography. | High |
| Use headless timeline tests, then manual visual review | Verifies sequencing and cancellation without claiming rendered SVG, decoder, or frame pacing validation. Browser automation was explicitly deferred. | Medium for visual/runtime fidelity |

This migration addresses the animation ownership and interruption problems
generally across the requested surfaces. It does not establish a performance
improvement. Native image decoding itself cannot be aborted; invalidated results
are ignored before any live handoff. The existing fixed project roster during
intro remains an assumption.

**Pride gate:** proud of the shared choreography and clear media/animation
boundary. I can stand behind the tested ordering and cancellation logic;
production visual confidence still requires the requested hands-on checks.
**Verdict: ready with noted risks.**

Manual review remains: full intro sequencing and late media; first/repeated About
opens; closing a progressed video; rapid blurb toggles with keyboard focus;
Escape and browser Back/Forward during motion; all six placements on desktop and
mobile; resize/reduced-motion changes mid-sequence. Performance measurement is
a separate requested follow-up, not evidence supplied by this migration.
