# Appearance menu exit sequencing

Inspected the existing Chrome tab at
`https://aaronwright-dot-ca.localhost/work/about-me` on September 20, 2026,
at its existing 2293 × 1267 viewport. No server was started.

## Reproduction and result

Previously, selecting Dark removed the menu scrim immediately and changed the
visible option order and text colors while the page background was still light.
The captured sequence was dimmed light, bright light, then a dark background.

Selection now queues the preference until React Aria detaches the exiting
popover. Its rows retain the old order and theme throughout the exit. The scrim
fades with the popover. A fresh activation of the current option also closes it;
the opening mouse-up on the overlapping current row is ignored.

In a live light-to-dark frame sample, the menu and scrim opacity matched at every
sample during exit (1, 0.981, 0.931, 0.859, …, 0.099). Every exiting sample retained
Light and the order `light,system,dark`. The next sampled state had no menu, scrim
opacity 0, and Dark applied.

Pointer opening, current-option dismissal, changed-option selection, keyboard
activation, focus restoration, and reduced-motion selection were exercised in
the same tab. Motion emulation was cleared and System preference restored.

## Decision audit

- **High confidence:** use the existing popover's detach lifecycle rather than a
  timer. It follows the actual CSS exit and reduced-motion behavior. A pending
  selection blocks reopening until applied.
- **High confidence:** keep the decorative, noninteractive scrim mounted at zero
  opacity so CSS can fade it out alongside the menu.
- **Medium confidence:** distinguish a fresh pointer press from release of the
  opening press. This preserves the overlapping trigger and native drag-to-option
  behavior while allowing the current option to dismiss the menu. Desktop pointer
  and keyboard checks passed; physical touch and WebKit were not exercised.
- This change addresses menu sequencing. The existing text/background color
  interpolation is unchanged; it is not a claim that every theme color now fades
  in sync.
- TypeScript passed. Two regression scenarios were added to the existing browser
  suite for close-before-apply ordering and reduced-motion/current-option
  selection. The browser test runner and full release QA were not run; live checks
  above are supplemental evidence, not a release receipt.
- Pride gate: proud of the scoped lifecycle fix. I would stand behind its desktop
  behavior; production release still needs the required QA matrix.

**Verdict: ready with noted risks.**
