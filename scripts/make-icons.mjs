#!/usr/bin/env node
/**
 * Generate the app icons (public/icons/*.png) without any native image
 * dependency: a hand-rolled PNG encoder (zlib is in Node core) drawing the
 * mark — the red and green ankle bands on ink, the folkstyle scoring pair.
 *
 * Run once (or after changing the mark): npm run icons
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.resolve(import.meta.dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// palette
const INK = [0x16, 0x19, 0x1d];
const RED = [0xc3, 0x1f, 0x2e];
const GREEN = [0x1c, 0x7a, 0x34];
const PAPER = [0xf1, 0xf2, 0xee];

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, paint) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = paint(x / size, y / size);
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The mark in unit coordinates: ink field, two bands, paper baseline. */
function mark(x, y) {
  const inBand = (cx) => Math.abs(x - cx) < 0.11 && y > 0.2 && y < 0.72;
  if (inBand(0.36)) return RED;
  if (inBand(0.64)) return GREEN;
  if (y > 0.78 && y < 0.84 && x > 0.2 && x < 0.8) return PAPER; // the mat line
  return INK;
}

for (const size of [180, 192, 512]) {
  const file = path.join(OUT, `icon-${size}.png`);
  fs.writeFileSync(file, png(size, mark));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
