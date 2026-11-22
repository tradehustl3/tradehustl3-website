"""Rasterize the generated PDF sample; never retouch the document image.

Run after: node --import tsx tools/audit/generate-homepage-samples.ts
Requires PyMuPDF and Pillow in the audit environment.
"""
from pathlib import Path

import fitz
from PIL import Image

source = Path("output/homepage-audit/jordan-cover-letter.pdf")
target = Path("public/sample-hvac-cover-letter.webp")
with fitz.open(source) as document:
    if len(document) != 1:
        raise ValueError("The illustrative homepage cover letter must fit one page")
    pixmap = document[0].get_pixmap(matrix=fitz.Matrix(4 / 3, 4 / 3))
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    image.save(target, "WEBP", quality=90)
print(f"Rendered {source} to {target}")
