import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('official HUSTL3 BOT image is complete', () => {
  const image = readFileSync(new URL('../public/hustl3-bot-official.webp', import.meta.url));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF');
  assert.equal(image.toString('ascii', 8, 12), 'WEBP');
  assert.equal(image.readUInt32LE(4) + 8, image.length, 'WebP payload must not be truncated');
  assert.ok(image.length > 100_000, 'full-body artwork must be present');
});
