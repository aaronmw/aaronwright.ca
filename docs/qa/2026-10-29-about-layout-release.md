# About layout follow-up release

The grid About page now vertically centres its content when it fits, retaining
its existing scrolling for shorter viewports. The portrait-to-copy gap and the
spacing above and below the headline share one responsive About-only value.
Other project viewer rules and portfolio content are unchanged.

Validation: CSS parsing and scoped spacing checks passed; all four existing
Mosaic About and portfolio-isolation unit tests passed; production build,
including TypeScript, passed. Visual browser review was not run for these fixes.

`pnpm qa:check` was run and failed because the accepted baseline uses a different
QA configuration and the previous receipt predates these CSS changes. Aaron
explicitly approved a new exception for these two fixes after being told both
reasons, replying “Yes.” to the release-exception question. This approval does
not replace the baseline or relax any assertions or budgets. The normal Netlify
build gate remains committed; this operation packages with `pnpm build` and
publishes the resulting Netlify bundle under the approved exception.
