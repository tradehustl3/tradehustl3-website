"""Run with fontTools. Sources are OFL fonts from google/fonts and installed Carlito.
Usage: python build-fonts.py /path/to/downloaded/google/fonts
Static fonts preserve all supported Unicode; per-document outlines are subset at runtime.
"""
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
from pathlib import Path
import base64, io, sys
root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp')
lines = ['// Open fonts bundled for offline Worker rendering. OFL licenses in worker/fonts.', 'export const TEMPLATE_FONTS = {']
for label in ['Arimo', 'Carlito', 'Gelasio']:
    lines.append(f'  {label}: {{')
    for variant, weight in [('regular', 400), ('bold', 700), ('italic', 400)]:
        if label == 'Carlito':
            path = Path('/usr/share/fonts/truetype/crosextra') / ('Carlito-' + {'regular': 'Regular', 'bold': 'Bold', 'italic': 'Italic'}[variant] + '.ttf')
        else:
            path = root / f'pr186-{label.lower()}{"-italic" if variant == "italic" else ""}.ttf'
        font = TTFont(path)
        if label != 'Carlito':
            font = instantiateVariableFont(font, {'wght': weight}, inplace=True)
        options = subset.Options()
        options.hinting = False
        options.layout_features = []
        options.name_IDs = [1, 2, 4, 6]
        options.name_languages = [0x409]
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=font.getBestCmap().keys())
        subsetter.subset(font)
        buffer = io.BytesIO(); font.save(buffer)
        lines.append(f'    {variant}: "{base64.b64encode(buffer.getvalue()).decode()}",')
    lines.append('  },')
lines.append('} as const;')
Path('worker/resume-template-fonts.ts').write_text('\n'.join(lines) + '\n')
