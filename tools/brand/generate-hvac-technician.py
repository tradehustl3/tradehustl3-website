#!/usr/bin/env python3
"""Generate the TRADE HUSTL3 HVAC technician brand character image.

Uses the OpenAI Images edit API with three reference images, passed in the
order the prompt describes: 1. TH3 / TRADE HUSTL3 logo, 2. face/identity,
3. body/outfit/HVAC style. Requires `pip install openai` and OPENAI_API_KEY.
Run from the repo root:
    python3 tools/brand/generate-hvac-technician.py logo.png face.jpg body.jpg

Output defaults to outputs/ (gitignored); review the image, including the logo
lettering, before moving it into public/.
"""
import argparse
import base64
import sys
from contextlib import ExitStack
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[2]

MODEL = "gpt-image-2.5-sunburst-2026-09-08"

PROMPT = """Create a single ultra-realistic full-body HVAC technician character image using the uploaded references.

Reference Image 1 is the official TH3 / TRADE HUSTL3 logo reference. Use it accurately on the uniform and cap, keeping the colors and lettering clean and correct.

Reference Image 2 is the face and identity reference. Preserve this person's exact facial identity, beard shape, skin tone, facial structure, expression style, and age. The face must look like the same real person, not a different model.

Reference Image 3 is the body, outfit, and HVAC work-style reference. Use it to guide the uniform, stance, tools, and overall appearance.

Important priority: the body must look fully natural, believable, and proportionate. Do not make the neck too thick, too long, too narrow, or disconnected from the shoulders. Make the shoulders, chest, arms, torso, waist, hands, legs, and boots all look anatomically correct and aligned. The final image should look like one real person photographed in full-body view, not like a face pasted onto another body.

Create a confident professional skilled-trades HVAC technician standing upright and facing forward in a relaxed but strong pose. Keep the pose natural and realistic.

Wardrobe:
- navy HVAC work shirt
- navy work pants
- work boots
- fitted navy cap
- professional tool pouch or side tool bag
- TRADE HUSTL3 / TH3 branding on the shirt and hat
Equipment:
- realistic blue HVAC digital manifold gauges in hand or clearly visible
- oxy-fuel torch set positioned beside him on the ground
- optional small HVAC tools that look authentic and professional
- do not overcrowd the image
Style:
- photorealistic
- sharp commercial quality
- realistic lighting
- clean, detailed, professional
- believable anatomy
- realistic hands and fingers
- accurate workwear textures
- true-to-life facial blending
Composition:
- full-body image
- centered subject
- enough space around the body so nothing is cropped awkwardly
- character is the main focus
- simple clean setting, minimal distractions
Avoid:
- distorted anatomy
- oversized head
- fake-looking neck
- mismatched skin tones between face and body
- extra fingers
- warped hands
- duplicated tools
- cartoon look
- bodybuilder proportions unless supported by the reference
- awkward posture
- face looking pasted on
- misspelled logo text
- extra people"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("logo", type=Path, help="Reference 1: TH3 logo")
    parser.add_argument("face", type=Path, help="Reference 2: face/identity")
    parser.add_argument("body", type=Path, help="Reference 3: body/outfit/HVAC style")
    parser.add_argument("-o", "--output", type=Path, default=ROOT / "outputs/th3-hvac-technician.png")
    args = parser.parse_args()

    refs = [args.logo, args.face, args.body]
    missing = [str(p) for p in refs if not p.is_file()]
    if missing:
        print(f"Missing reference image(s): {', '.join(missing)}", file=sys.stderr)
        return 1

    client = OpenAI()
    with ExitStack() as stack:
        images = [stack.enter_context(p.open("rb")) for p in refs]
        response = client.images.edit(
            model=MODEL,
            image=images,
            prompt=PROMPT,
            n=1,
            size="auto",
            quality="auto",
            background="auto",
            moderation="auto",
        )

    b64 = response.data[0].b64_json
    if not b64:
        print("API returned no image data.", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(base64.b64decode(b64))
    print(f"Saved {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
