#!/usr/bin/env python3
"""Build the repeating tool-silhouette background tiles in public/brand/.

Source of truth: tools/brand/tool-silhouettes.json (also used by
app/tool-silhouettes.tsx). Run from the repo root:
    python3 tools/brand/build-tool-patterns.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOLS = {k: v for k, v in json.loads((ROOT / "tools/brand/tool-silhouettes.json").read_text()).items() if not k.startswith("_")}

# (tool, x, y, scale, rotation) on a 360x360 tile; staggered so the repeat has no obvious grid.
LAYOUT = [
    ("wrench", 18, 20, 0.95, 0), ("gauge", 142, 8, 0.8, 0), ("hammer", 262, 34, 0.9, 0),
    ("level", 60, 134, 0.9, -18), ("hardhat", 190, 124, 0.85, 0), ("pliers", 296, 150, 0.8, 12),
    ("drill", 10, 252, 0.85, 0), ("multimeter", 128, 246, 0.8, -10), ("tape", 222, 260, 0.8, 8),
    ("screwdriver", 316, 286, 0.75, 0), ("pipewrench", 96, 316, 0.7, 0)
]

def tile(fill: str, opacity: float) -> str:
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360"><g fill="{fill}" fill-opacity="{opacity}">']
    for name, x, y, scale, rot in LAYOUT:
        parts.append(f'<g transform="translate({x} {y}) rotate({rot} {32*scale} {32*scale}) scale({scale})">{TOOLS[name]}</g>')
    parts.append("</g></svg>\n")
    return "".join(parts)

out = ROOT / "public/brand"
out.mkdir(parents=True, exist_ok=True)
(out / "tool-pattern-gold.svg").write_text(tile("#F1C357", 0.055))
(out / "tool-pattern-navy.svg").write_text(tile("#0B1F33", 0.05))
print("wrote", sorted(p.name for p in out.glob("tool-pattern-*.svg")))
