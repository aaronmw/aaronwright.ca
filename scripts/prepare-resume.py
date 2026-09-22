#!/usr/bin/env python3
"""Repair this resume's Figma PDF export without changing its visible artwork."""

import argparse
from collections import defaultdict
from io import BytesIO
from pathlib import Path
import re
import tempfile
from xml.sax.saxutils import escape

import pdfplumber
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, ContentStream, DecodedStreamObject, NameObject, NullObject, TextStringObject
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
NAME = "Aaron M. Wright"
TITLE = f"{NAME} - Resume"
HEADINGS = {"Experience:", "Education:", "Strengths:"}


def clean(text):
    return text.replace("\u2028", "\n").replace("\u2029", "\n").strip()


def words(text):
    return " ".join(text.split())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def repair(source, destination):
    reader = PdfReader(source)
    require(len(reader.pages) == 1, "Expected a single-page Figma resume export.")
    require("/StructTreeRoot" in reader.trailer["/Root"], "Missing Figma text tags.")
    data = reader.pages[0].get_contents().get_data()
    # Figma draws the appearance as one artifact, followed by its text layer.
    # Fail closed if a future exporter changes that contract.
    artwork, separator, text_layer = data.partition(b"\nEMC\n")
    require(
        separator and artwork.count(b"/Artifact BMC") == 1
        and b"BDC" not in artwork and b"BT" not in artwork
        and b"/MCID" not in artwork and b"/Artifact" not in text_layer,
        "Unrecognized Figma export structure; the input has not been changed.",
    )
    semantic_stream = DecodedStreamObject()
    semantic_stream.set_data(text_layer)
    text_operators = {b"q", b"Q", b"cm", b"BDC", b"EMC", b"BT", b"ET", b"Tm", b"Tf", b"TJ"}
    require(all(operator in text_operators for _, operator in ContentStream(semantic_stream, reader).operations),
            "Unexpected drawing operations outside Figma's artwork; refusing to drop content.")

    groups = defaultdict(list)
    with pdfplumber.open(source) as pdf:
        page = pdf.pages[0]
        require(page.rotation == 0, "Rotated exports are not supported.")
        for char in page.chars:
            require(char.get("mcid") is not None, "Found untagged text.")
            groups[char["mcid"]].append(char)
    require(groups, "No extractable text found.")
    texts = {mcid: clean("".join(c["text"] for c in chars)) for mcid, chars in groups.items()}
    require(list(texts.values()).count(NAME) == 1, "Expected one complete name text layer.")
    # The vector artwork already paints the dotted leaders. Exclude only their
    # duplicate machine-readable text; keep their exact visible shape and position.
    decorative = {mcid for mcid, text in texts.items() if re.fullmatch(r"\.{5,}", text)}
    groups = {mcid: chars for mcid, chars in groups.items() if mcid not in decorative}
    texts = {mcid: text for mcid, text in texts.items() if mcid not in decorative}
    name_mcid = next(mcid for mcid, text in texts.items() if text == NAME)
    # Reading order is independent of page geometry. Never move text coordinates
    # to influence a parser: selections must still align with the visible words.
    ordered = [name_mcid] + [mcid for mcid in sorted(groups) if mcid != name_mcid]
    require(HEADINGS.issubset(set(texts.values())), "Expected Experience, Education, and Strengths headings.")

    font = TTFont("ResumeText", str(ROOT / "scripts/resume/fonts/IBMPlexMono-Regular.ttf"))
    pdfmetrics.registerFont(font)
    all_characters = set("".join(texts.values())) - {"\n", "\r", "\t"}
    require(all(ord(c) in font.face.charToGlyph for c in all_characters), "The embedded font lacks a source character.")
    buffer = BytesIO()
    output = canvas.Canvas(buffer, pagesize=tuple(reader.pages[0].mediabox[2:]), invariant=1)
    for mcid in ordered:
        chars = groups[mcid]
        output.addLiteral(f"/Span << /MCID {mcid} >> BDC")
        lines = defaultdict(list)
        for char in chars:
            lines[round(char["y0"], 2)].append(char)
        for baseline, line in sorted(lines.items(), reverse=True):
            text = clean("".join(c["text"] for c in line))
            if not text:
                continue
            size = line[0]["size"]
            x = min(c["x0"] for c in line)
            width = max(c["x1"] for c in line) - x
            native = output.beginText(x, baseline)
            native.setFont("ResumeText", size)
            native.setTextRenderMode(3)  # Artwork above already supplies the appearance.
            native.setHorizScale(100 * width / pdfmetrics.stringWidth(text, "ResumeText", size))
            native.textLine(text)
            output.drawText(native)
        output.addLiteral("EMC")
    output.showPage()
    output.save()

    writer = PdfWriter(clone_from=reader)
    page = writer.pages[0]
    stream = DecodedStreamObject()
    stream.set_data(artwork + separator)
    page.replace_contents(stream)
    # The preserved artwork contains no font calls. Remove the now-unused Type3 fonts.
    page["/Resources"].pop(NameObject("/Font"), None)
    page.merge_page(PdfReader(buffer).pages[0])
    page.compress_content_streams()

    seen = set()
    node_order = {}
    heading_roles = {}
    for mcid, text in texts.items():
        if text == NAME:
            heading_roles[mcid] = "/H1"
        elif text in HEADINGS:
            heading_roles[mcid] = "/H2"
        else:
            # Entry titles share a baseline with a separate date range to their right.
            first = groups[mcid][0]
            if any(other != mcid and re.fullmatch(r"(?:[A-Za-z]+ )?\d{4}[\s–—-]+(?:[A-Za-z]+ )?(?:\d{4}|Present)", value)
                   and abs(groups[other][0]["y0"] - first["y0"]) < 1
                   and groups[other][0]["x0"] > first["x0"]
                   for other, value in texts.items()):
                heading_roles[mcid] = "/H3"

    def fix_tags(ref):
        node = ref.get_object()
        if not isinstance(node, dict):
            return True
        children = node.get("/K", [])
        children = children if isinstance(children, list) else [children]
        mcids = [int(k) for k in children if isinstance(k, int)]
        if mcids:
            if len(mcids) == 1 and mcids[0] in decorative:
                return False
            require(len(mcids) == 1 and mcids[0] in texts, "Unexpected marked-content structure.")
            mcid = mcids[0]
            seen.add(mcid)
            # Figma's ActualText strings corrupt curly quotes, arrows, and en dashes.
            # Re-encode the characters decoded through its ToUnicode maps as PDF Unicode.
            node[NameObject("/ActualText")] = TextStringObject(texts[mcid])
            if mcid in heading_roles:
                parent = node["/P"]
                require(parent.get("/S") == "/P", "Unexpected heading parent tag.")
                parent[NameObject("/S")] = NameObject(heading_roles[mcid])
        kept = [child for child in children if isinstance(child, int) or fix_tags(child)]
        if children and not kept:
            return False
        # Match the tag tree's logical order to the replacement text stream.
        ranks = {mcid: index for index, mcid in enumerate(ordered)}
        def rank(child):
            if isinstance(child, int):
                return ranks[child]
            return node_order.get(id(child.get_object()), len(ordered))
        if kept:
            kept.sort(key=rank)
            node[NameObject("/K")] = ArrayObject(kept)
            node_order[id(node)] = min(map(rank, kept))
        return True

    fix_tags(writer.root_object["/StructTreeRoot"])
    require(seen == set(groups), "Some text has no matching structure tag.")
    parent_tree = writer.root_object["/StructTreeRoot"]["/ParentTree"]
    require("/Nums" in parent_tree, "Unexpected Figma parent-tree format.")
    parent_nums = parent_tree["/Nums"]
    page_parents = next((parent_nums[i + 1].get_object() for i in range(0, len(parent_nums), 2)
                         if parent_nums[i] == page["/StructParents"]), None)
    require(isinstance(page_parents, list), "Missing page marked-content parents.")
    for mcid in decorative:
        page_parents[mcid] = NullObject()
    writer.root_object[NameObject("/Lang")] = TextStringObject("en-CA")
    writer.root_object.pop(NameObject("/Info"), None)
    writer.add_metadata({"/Title": TITLE, "/Author": NAME, "/Subject": "Product design and frontend engineering resume"})
    # Do not repeat the source's PDF/UA claim: this tool is not a conformance validator.
    metadata = DecodedStreamObject()
    metadata[NameObject("/Type")] = NameObject("/Metadata")
    metadata[NameObject("/Subtype")] = NameObject("/XML")
    metadata.set_data(f'''<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title><rdf:Alt><rdf:li xml:lang="x-default">{escape(TITLE)}</rdf:li></rdf:Alt></dc:title>
<dc:creator><rdf:Seq><rdf:li>{escape(NAME)}</rdf:li></rdf:Seq></dc:creator>
<dc:language><rdf:Bag><rdf:li>en-CA</rdf:li></rdf:Bag></dc:language>
</rdf:Description></rdf:RDF></x:xmpmeta>'''.encode())
    writer.root_object[NameObject("/Metadata")] = writer._add_object(metadata)
    writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)

    destination.parent.mkdir(parents=True, exist_ok=True)
    # Validate a temporary file before replacing an existing published asset.
    with tempfile.NamedTemporaryFile(suffix=".pdf", dir=destination.parent, delete=False) as tmp:
        temporary = Path(tmp.name)
    try:
        writer.write(temporary)
        check = PdfReader(temporary)
        extracted = check.pages[0].extract_text()
        require(extracted.splitlines()[0] == NAME, "Content-order extraction does not start with the name.")
        require(words(extracted) == words("\n".join(texts[m] for m in ordered)), "Output text differs from the source.")
        with pdfplumber.open(temporary) as pdf:
            # A geometry-only extractor can still list the higher address first.
            # Verify content at its original coordinates, without requiring a redesign.
            output_groups = defaultdict(lambda: defaultdict(list))
            for char in pdf.pages[0].chars:
                output_groups[char["mcid"]][round(char["y0"], 2)].append(char["text"])
            require(set(output_groups) == set(groups), "Output text blocks differ from the source.")
            require(all(words("\n".join("".join(line) for _, line in sorted(output_groups[m].items(), reverse=True)))
                        == words(texts[m]) for m in groups),
                    "Position-based extraction changed a text block.")
        require(len(check.pages[0].get("/Annots", [])) == len(reader.pages[0].get("/Annots", [])), "Link annotations changed.")
        temporary.chmod(destination.stat().st_mode & 0o777 if destination.exists() else 0o644)
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)
    print(f"Prepared {destination}: name first in logical order, {len(groups)} text blocks, {len(heading_roles)} headings; layout and links preserved.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="PDF exported from the original Figma resume frame")
    parser.add_argument("--output", type=Path, default=ROOT / "public/resume.pdf")
    args = parser.parse_args()
    repair(args.source.resolve(), args.output.resolve())
