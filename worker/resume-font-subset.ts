import fontkit from '@pdf-lib/fontkit';
/** Sparse TrueType subset retaining glyph IDs. Fontkit's renumbered subsets of
 * Arimo/Carlito lose outlines in Poppler. Keeping IDs preserves cmap/shaping while
 * stripping unused glyph outlines, including composite dependencies correctly.
 */
export function subsetTrueType(bytes: Uint8Array, text: string): Uint8Array {
  const source = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = new Map<string, Uint8Array>();
  for (let i = 0; i < source.getUint16(4); i++) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(...bytes.slice(at, at + 4));
    const offset = source.getUint32(at + 8), length = source.getUint32(at + 12);
    if (tag !== 'DSIG') tables.set(tag, bytes.slice(offset, offset + length));
  }
  const head = tables.get('head')!, loca = tables.get('loca')!, glyf = tables.get('glyf')!;
  if (!head || !loca || !glyf) throw new Error('Expected TrueType outlines');
  const hd = new DataView(head.buffer), ld = new DataView(loca.buffer);
  const maxp = tables.get('maxp')!, count = new DataView(maxp.buffer).getUint16(4);
  const long = hd.getInt16(50) === 1;
  const offset = (id: number) => long ? ld.getUint32(id * 4) : ld.getUint16(id * 2) * 2;
  const font = fontkit.create(bytes), ids = new Set<number>([0]);
  for (const character of text) ids.add(font.glyphForCodePoint(character.codePointAt(0)!).id);
  for (const word of text.split(/\s+/)) for (const glyph of font.layout(word).glyphs) ids.add(glyph.id);
  const include = (id: number) => {
    const start = offset(id), end = offset(id + 1);
    if (end - start < 10) return;
    const gd = new DataView(glyf.buffer, start, end - start);
    if (gd.getInt16(0) >= 0) return;
    let at = 10, flags = 0;
    do {
      flags = gd.getUint16(at); const component = gd.getUint16(at + 2); at += 4;
      if (!ids.has(component)) { ids.add(component); include(component); }
      at += flags & 1 ? 4 : 2;
      if (flags & 8) at += 2;
      else if (flags & 64) at += 4;
      else if (flags & 128) at += 8;
    } while (flags & 32);
  };
  for (const id of ids) include(id);
  const chunks: Uint8Array[] = [], offsets = new Uint32Array(count + 1); let total = 0;
  for (let id = 0; id < count; id++) {
    offsets[id] = total;
    if (!ids.has(id)) continue;
    const chunk = glyf.slice(offset(id), offset(id + 1)); chunks.push(chunk);
    total += (chunk.length + 3) & ~3;
  }
  offsets[count] = total;
  const outline = new Uint8Array(total); let at = 0;
  for (const chunk of chunks) { outline.set(chunk, at); at += (chunk.length + 3) & ~3; }
  const locations = new Uint8Array((count + 1) * 4), view = new DataView(locations.buffer);
  offsets.forEach((value, i) => view.setUint32(i * 4, value));
  hd.setInt16(50, 1); hd.setUint32(8, 0);
  tables.set('glyf', outline); tables.set('loca', locations);
  const entries = [...tables.entries()].sort(([a], [b]) => a.localeCompare(b));
  const directoryLength = 12 + entries.length * 16;
  const result = new Uint8Array(directoryLength + entries.reduce((n, [, data]) => n + ((data.length + 3) & ~3), 0));
  const output = new DataView(result.buffer);
  output.setUint32(0, source.getUint32(0)); output.setUint16(4, entries.length);
  const power = 2 ** Math.floor(Math.log2(entries.length));
  output.setUint16(6, power * 16); output.setUint16(8, Math.log2(power)); output.setUint16(10, entries.length * 16 - power * 16);
  const checksum = (data: Uint8Array) => {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum = (sum + (((data[i] ?? 0) << 24) >>> 0) + ((data[i + 1] ?? 0) << 16) + ((data[i + 2] ?? 0) << 8) + (data[i + 3] ?? 0)) >>> 0;
    return sum;
  };
  let dataAt = directoryLength, headAt = 0;
  entries.forEach(([tag, data], i) => {
    const dir = 12 + i * 16;
    [...tag].forEach((char, j) => { result[dir + j] = char.charCodeAt(0); });
    output.setUint32(dir + 4, checksum(data)); output.setUint32(dir + 8, dataAt); output.setUint32(dir + 12, data.length);
    result.set(data, dataAt); if (tag === 'head') headAt = dataAt;
    dataAt += (data.length + 3) & ~3;
  });
  output.setUint32(headAt + 8, (0xB1B0AFBA - checksum(result)) >>> 0);
  return result;
}
