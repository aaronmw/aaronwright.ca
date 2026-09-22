# Resume PDF exports

The editable source is the [resume frame in Figma](https://www.figma.com/design/ftIzwQbtYACdhGzwyZDRcl/Estimates--Invoices--Resume--and-Portfolio?node-id=2962-75), named **Aaron M. Wright - Resume**.

## Direct Figma export

Export this frame as PDF normally. No separate build step is required for the
source improvements described below. Keep the original layout and typography.

- The frame name becomes the PDF document title.
- Descriptive, numbered layer names identify identity/contact, summary, experience,
  education, strengths, and decorative artwork.
- The full name is first in the identity group. Section labels precede entry
  headings/dates and descriptions in the shared entry component's child order.
- Decorative periods are exact vector outlines in their original layout box.
  Their appearance is unchanged and they no longer enter the exported text.
- The address uses ordinary line breaks instead of a Unicode line separator that
  Figma encoded incorrectly in PDF `ActualText`.
- Substantive resume copy and links remain editable text.

Do not convert the name, contact details, headings, or descriptions to outlines.
Do not recreate dotted leaders as text. The shared leader component owns them.

## What native export does and does not preserve

Verified on 2026-09-21: the direct PDF export renders identically to the source
before these changes, has the descriptive document title, starts with the full
name in logical text/tag order, retains all three links, and has no decorative
period strings in its text.

Descriptive layer names help source maintenance; they do **not** turn Figma's
paragraph tags into PDF H1/H2/H3 tags. The native export still has generic paragraph
structure and encoding defects in some Unicode `ActualText` (such as curly quotes
and arrows). Figma's documented PDF export settings do not expose heading tags.

A parser that ignores logical order and sorts by physical position can still read
the higher address before the centered name. Ashby's actual autofill has not been
retested, so native source improvements cannot guarantee its name detection.

## Optional PDF repair

The existing `scripts/prepare-resume.py` remains an optional fallback for embedded
machine-readable text, repaired Unicode, explicit PDF headings, and author/language
metadata. It preserves the original artwork and substantive text coordinates.
It reads current PDF copy rather than maintaining a separate resume source.

```sh
# One-time setup, only if you want the optional repair.
python3 -m venv ~/.venvs/aaronwright-resume
~/.venvs/aaronwright-resume/bin/python -m pip install -r scripts/resume/requirements.txt

# Default destination: public/resume.pdf.
~/.venvs/aaronwright-resume/bin/python scripts/prepare-resume.py \
  ~/Downloads/'Aaron M. Wright - Resume.pdf'
```

Use `--output /path/to/resume.pdf` for a separate application copy. The bundled
[IBM Plex Mono font](https://github.com/IBM/plex) is licensed under the accompanying
SIL Open Font License. This tool does not certify PDF/UA compliance. It deliberately
rejects unfamiliar export structures and currently supports only a single page.

The site's `public/resume.pdf` remains the previously repaired, visually unchanged
PDF. The native Figma changes do not deploy or replace that asset automatically.

## Decision audit

- **Direct export as the default (high confidence):** source improvements survive
  ordinary Figma PDF export; no required repair step is added to the workflow.
- **Preserve the design (high confidence):** original coordinates, typography,
  spacing, and exact decorative glyph shapes are retained and compared by pixels.
- **Honest semantics boundary (high confidence):** title, logical order, and clean
  decorative content are verified. Layer names are not represented as PDF heading
  tags. Unicode and geometry-only parser limitations remain explicit.
- **Pride gate:** yes; confident in the source changes and verified preservation.
  **Verdict: ready with noted risks**, specifically native exporter limitations and
  the unverified Ashby result. No website deployment was performed.
