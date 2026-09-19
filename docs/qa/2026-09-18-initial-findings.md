# Initial release QA findings

The new release gate is intentionally blocked until the outstanding browser/task
failures are resolved and a complete run can be accepted as the baseline. No
application behavior or existing browser assertions were changed during this setup.

## Evidence

The completed release run is recorded in
[`qa/results/2026-09-18T23-46-55-573Z.md`](../../qa/results/2026-09-18T23-46-55-573Z.md)
with raw metrics and full failure messages in the adjacent JSON. Earlier results
are development/diagnostic runs; they are not eligible baselines.

Production build and all **96 unit tests passed**. The public browser matrix had
**54 passed, 24 failed, and 26 declared device skips**. Of 72 measured task attempts,
**63 completed and 9 failed**. No baseline was accepted. The release gate and
baseline command both rejected this evidence, and the temporary server stopped.

| Measured task | Median duration |
| --- | ---: |
| Desktop entry | 1.54 s |
| Throttled laptop entry | 9.38 s |
| Throttled portrait entry | 9.29 s |
| Throttled landscape entry | 9.43 s |
| Portrait next-media gesture through decoded image | 18.66 s |
| Landscape next-media gesture through decoded image | 22.76 s |

## Test contract and implementation disagree

These need reconciliation against the intended design, not automatic test healing:

- About Me tests target the old `About Me overview` region and old biography copy;
  the rendered page now has biography and supporting-text regions.
- Loopio's narrative is no longer inside its fixed project metadata region, but
  an old test still looks there for narrative copy.
- A history test expects active slide index 5, while the current Loopio sequence
  has four slides.
- Two tests require boundary wrapping. The current navigation controller clamps
  both axes at their ends. Confirm the intended behavior before changing either
  the tests or the app.
- The landscape layout test assumes vertically stacked information and media;
  the current layout uses a wide arrangement at that aspect ratio.

## Interaction and performance findings

The diagnostic run reproduced horizontal wheel navigation staying on the first
Toolbox item at both desktop sizes. Touch horizontal navigation did advance. The
portrait touch task failed to advance vertically to NextPhrase, while landscape
passed. These are automated input reproductions, not physical-device confirmations.

The final portrait run also reached NextPhrase but could not tap its visible
Back to top logo: the left navigation rail intercepted the tap. The saved failure
screenshot shows the visible logo and the error identifies the intercepting `nav`.
Keep both the swipe outcome and the return-home obstruction in the investigation;
do not force the tap through the overlay in the test.

Under 4× CPU slowdown and the configured 1.6 Mbps / 150 ms network, entry took
roughly 9 seconds. Loading the next Toolbox media item on the phone profiles took
roughly 19–23 seconds, including waiting for its decoded image. Desktop entry was
roughly 1.5 seconds. These are lab journey durations, not Core Web Vitals. See the
release report for final medians and variability in the raw repetitions.

The first existing Chromium viewer test also failed to close after media navigation;
other engines passed that test. Preserve and investigate that failure rather than
adding a retry or weakening the close assertion.

## Next steps

1. Confirm and update the obsolete contracts while retaining meaningful assertions.
2. Investigate the wheel and portrait touch failures; verify their input sequences
   and repair any application defects. Inspect large-media loading under throttling.
3. Run `pnpm qa:run` again. Review the results and establish a baseline only when
   functional checks and all required measurements are complete.

Agents can help with this triage and turn newly discovered problems into regression
tests. A variable agent-driven journey should not define the timing benchmark.
