"""Derive homepage atmosphere assets from the official book hero artwork.

Source: public/optimized/book-hero-trades-v1.webp (the /book hero background).
Outputs (public/optimized/atmosphere/):
  texture-*.webp         empty wall area, navy monochrome, for section texture
  worker-<name>-*-v2.webp   trade figures, navy monochrome, feathered alpha
Re-run after changing the source art: python3 tools/brand/build-atmosphere.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/optimized/book-hero-trades-v1.webp"
OUT = ROOT / "public/optimized/atmosphere"
OUT.mkdir(parents=True, exist_ok=True)

art = Image.open(SRC).convert("RGB")

# Crop boxes in source pixels (1585 x 992), before the green paint and marks.
WORKERS = {
    "hvac": (0, 173, 275, 548),
    "wrench": (560, 170, 900, 760),
    "painter": (1280, 238, 1514, 655),
}
TEXTURE = (930, 0, 1230, 620)

NAVY_DARK = np.array([6, 24, 46], dtype=np.float32)
NAVY_LIGHT = np.array([70, 128, 222], dtype=np.float32)


def navy(img: Image.Image, gamma: float = 1.0) -> Image.Image:
    """Map luminance onto a navy ramp so every figure shares one palette."""
    lum = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    lum = np.clip(lum, 0, 1) ** gamma
    rgb = NAVY_DARK + (NAVY_LIGHT - NAVY_DARK) * lum[..., None]
    return Image.fromarray(rgb.astype(np.uint8), "RGB")


def feather(img: Image.Image, edge: float = 0.22, left_open: bool = False) -> Image.Image:
    """Soft elliptical alpha so the figure dissolves into whatever is behind it."""
    w, h = img.size
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    cx = 0.0 if left_open else w / 2
    rx = w if left_open else w / 2
    d = np.sqrt(((x - cx) / rx) ** 2 + ((y - h * 0.42) / (h * 0.62)) ** 2)
    alpha = np.clip((1 - d) / edge, 0, 1) ** 1.6
    soft_alpha = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(6))
    vertical_fade = np.clip(np.minimum(y / (h * 0.12), (h - 1 - y) / (h * 0.16)), 0, 1)
    alpha_img = Image.fromarray((np.asarray(soft_alpha) * vertical_fade).astype(np.uint8), "L")
    out = img.convert("RGBA")
    out.putalpha(alpha_img)
    return out


def save(img: Image.Image, name: str, widths, quality: int = 62, version: str = "") -> None:
    for w in widths:
        h = round(img.height * w / img.width)
        img.resize((w, h), Image.LANCZOS).save(OUT / f"{name}-{w}{version}.webp", "WEBP", quality=quality, method=6)


save(navy(art.crop(TEXTURE), gamma=1.1), "texture", (960,), quality=50)
for name, box in WORKERS.items():
    width = 260 if name == "painter" else 300
    worker = navy(art.crop(box), gamma=0.9)
    save(feather(worker, edge=0.4, left_open=(name == "hvac")), f"worker-{name}", (width,), version="-v2")
