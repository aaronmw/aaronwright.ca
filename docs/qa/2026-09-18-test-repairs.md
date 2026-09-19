# Browser test repairs

This follows the [initial QA findings](2026-09-18-initial-findings.md). The original
24 failures were repeated failures across four browser/device profiles, not 24
independent product bugs.

## Application fixes

- **Horizontal wheel navigation:** the mouse-axis classifier rejected the wheel
  plugin's synthetic `mousedown`. Allow that event on its own carousel track;
  keep physical mouse drags subject to axis classification.
- **The next click after a gesture:** Embla retained drag-click suppression because
  a new, unclassified mouse press never reached its down/up lifecycle. A press
  that ends without becoming a carousel drag now completes that lifecycle at the
  release position. No synthetic click is dispatched. Existing wheel and mouse
  drag tests now open the viewer with the next real click.
- **Escape after viewer navigation:** Chromium could drop focus onto `body` when
  the dragged media button left the current slide. Restore controller focus when
  focus is lost, preserving focus on persistent viewer controls. The test asserts
  focus remains inside the viewer before pressing Escape.
- **Portrait home logo:** the transparent section-navigation rail intercepted
  taps. Only the central navigation control area now receives pointer events;
  the surrounding rail passes them through. Both rails share the fix, including
  their hidden state while the viewer is open.

## Corrected contracts

Aaron explicitly confirmed that both carousel axes should **stop at their ends**.
The obsolete wrapping assertions now check both boundaries, for keyboard input
and desktop wheel/mouse input. No wrapping behavior was added.

Other stale assertions referenced removed biography copy, narrative content inside
the metadata panel, Loopio slide index 5 instead of 3, and a stacked layout on all
touch devices. The replacements check the current two-panel biography, fixed
metadata with changing narrative, restored history selection, and actual geometry
in wide and stacked layouts.

The intermittent measured portrait swipe was also an input-definition problem:
55% of the 623px inner stage was only 343px, below the 422px midpoint of the 844px
outer snap. Instrumentation showed the outer track moving and then correctly
returning to its starting snap. The task now drags 60% of the outer viewport,
independent of flick velocity. This changes the measurement protocol fingerprint;
earlier timing samples are not an interchangeable baseline.

## Why tests were skipped

Originally, 12 desktop-only scenarios were skipped on each of two phone profiles
(24 skips), and one touch-layout scenario was skipped on both desktops (2 skips).

Theme keyboard/focus/persistence and viewer lifecycle checks now also run on the
phone profiles. Fixed metadata and responsive geometry checks run on all profiles.
That enables 12 previously skipped cases. The remaining **14 skips** are seven
wheel/mouse scenarios on two touch profiles, each with an explicit reason. No
failure was quarantined or newly skipped. Touch gestures are exercised by the
separate measured Chromium tasks; this does not establish WebKit swipe or physical
iPhone coverage.

## Final evidence and decision audit

The [complete production run](../../qa/results/2026-09-19T03-13-36-570Z.md)
and adjacent JSON record **96 passing unit tests, 90 passing browser cases,
0 failures/flakes, 14 declared input exclusions, and all 72 task measurements**.
There were no captured runtime, console, or same-origin HTTP errors. Production
build and TypeScript checks passed. Source and protocol fingerprints match this
checkout. The owned server stopped and port 3032 was released.

React Doctor reported no diagnostics on the final eight changed files (97/100).
Its earlier 100/100 scans covered zero and then six changed files; the expanded
scope exposed no reported issue to fix or suppress. Whitespace checks passed.

| Decision | Rationale and alternative | Confidence |
| --- | --- | --- |
| Preserve finite carousel boundaries and current content/layout contracts. | Aaron confirmed stopping at the ends. Restoring wrapping or removed content would change the product to satisfy obsolete assertions. | High |
| Complete deferred mouse presses through Embla's down/up lifecycle. | Repairs stale click suppression while retaining one-axis drags and text selection. Replacing Embla or bypassing its click handler would be broader and more fragile. The adapter relies on the pinned wheel/Embla integration, covered by sequential browser checks. | High |
| Restore viewer focus only when it has fallen to body. | Keeps Escape working without stealing focus from persistent controls. A global Escape listener would leave the underlying focus defect in place. | High |
| Limit rail hit testing to its controls. | Fixes both equivalent rails and avoids changing visual stacking or forcing taps through an overlay. | High |
| Enable non-pointer-specific checks on every profile; retain 14 explicit exclusions. | Adds meaningful phone coverage while keeping wheel/mouse assertions tied to their input profile. Real-phone gestures remain outside emulation. | High |
| Define the vertical task as a swipe crossing the outer snap midpoint. | A short, slow drag can correctly snap back. The revised journey has a definite outcome; it does not test minimum flick velocity. | High |
| Use this complete run as the initial performance baseline. | Establishes observed starting measurements for future comparisons. No existing baseline was replaced, no failure was skipped, and no budget was relaxed. Absolute UX limits and physical-device performance remain separate work. | Medium |

Under the slow-network profile, median startup remains **9.35–9.48 seconds** and
next-image completion **18.66–22.89 seconds**. Relative regression checking will
detect deterioration from this starting point; it does not make those durations
acceptable. Large-media delivery and loading behavior warrant a performance pass.

Am I proud of this implementation? **Yes.** The measured sequence exposed an
additional click-after-gesture defect and that sequence is now covered by the
browser suite.

Would I confidently stand behind these fixes in production? **Yes, within the
verified browser and emulation scope.** Physical iPhone behavior, short flicks,
and slow-network loading remain explicit limitations.

Verdict: **ready with noted risks**. Changes remain uncommitted and undeployed.
The report's original “blocked” status records the absence of a baseline when it
was written; initial baseline acceptance and a fresh `qa:check` determine the
current release-gate result without rewriting historical evidence.

The [initial baseline](../../qa/baseline.json) was accepted from this run.
`pnpm qa:check` then **passed** for source fingerprint `0eb0a397fa58`.
