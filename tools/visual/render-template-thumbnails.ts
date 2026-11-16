// Renders the sample resume in every look to the 371×480 PNGs the style carousel
// shows before a customer's first build, using the real bundled fonts.
// Usage: npx tsx tools/visual/render-template-thumbnails.ts [outDir]
// Default outDir is public/resume-templates (the files the site serves).
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createResumePdf } from '../../worker/resume-documents';
import { TEMPLATE_KEYS, defaultStyle, trackForTemplate } from '../../worker/resume-templates';
import { sampleResume } from '../../docs/pr186/sample-resume';

const WIDTH = 371, HEIGHT = 480;
const outDir = process.argv[2] ?? 'public/resume-templates';
await mkdir(outDir, { recursive: true });
for (const theme of TEMPLATE_KEYS) {
  const pdf = await createResumePdf(sampleResume, false, theme, trackForTemplate(theme, null), defaultStyle(theme));
  const task = getDocument({ data: Uint8Array.from(pdf), isEvalSupported: false });
  try {
    const page = await (await task.promise).getPage(1);
    const natural = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: WIDTH / natural.width });
    const canvas = createCanvas(WIDTH, HEIGHT), context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    await page.render({ canvas: canvas as never, canvasContext: context as never, viewport }).promise;
    const file = join(outDir, `${theme}.png`);
    await writeFile(file, canvas.toBuffer('image/png'));
    console.log(`${theme} -> ${file}`);
  } finally {
    await task.destroy();
  }
}
