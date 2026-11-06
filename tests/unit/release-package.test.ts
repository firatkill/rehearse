import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('TC-201 release documentation links a complete, animated demo asset under 1 MB', () => {
  const readme = readFileSync('README.md', 'utf8');
  const path = readme.match(/!\[[^\]]+\]\((docs\/assets\/[^)]+\.gif)\)/)?.[1];
  expect(path).toBeDefined();
  const gif = readFileSync(path!);
  expect(gif.subarray(0, 6).toString()).toBe('GIF89a');
  expect(gif.byteLength).toBeLessThan(1_000_000);
  expect(gif.readUInt16LE(6)).toBeGreaterThanOrEqual(640);
  expect(gif.readUInt16LE(8)).toBeGreaterThanOrEqual(400);
  let offset = 13;
  const packed = gif[10]!;
  if (packed & 128) offset += 3 * 2 ** ((packed & 7) + 1);
  let frames = 0;
  const skipBlocks = () => {
    while (offset < gif.length) {
      const size = gif[offset++]!;
      if (size === 0) return;
      offset += size;
    }
    throw new Error('Truncated GIF data');
  };
  while (offset < gif.length && gif[offset] !== 0x3b) {
    const marker = gif[offset++];
    if (marker === 0x21) {
      offset++; // Extension label; following payload is length-delimited.
      skipBlocks();
    } else if (marker === 0x2c) {
      const flags = gif[offset + 8]!;
      offset += 9;
      if (flags & 128) offset += 3 * 2 ** ((flags & 7) + 1);
      offset++; // LZW minimum code size.
      skipBlocks();
      frames++;
    } else {
      throw new Error('Invalid GIF block');
    }
  }
  expect(frames).toBeGreaterThan(1);
  expect(offset).toBe(gif.length - 1);
  expect(gif[offset]).toBe(0x3b);
});

it('TC-201 release version and setup documentation agree', () => {
  const packageText = readFileSync('package.json', 'utf8');
  const readme = readFileSync('README.md', 'utf8');
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  expect(packageText).toMatch(/"version": "2\.0\.0"/);
  expect(changelog).toContain('## v2.0.0');
  expect(readme).toContain('**v2.0.0**');
  expect(readme).toContain('docker compose up --build');
  expect(readme).toContain('pnpm dev --hostname 127.0.0.1');
  expect(readme).toContain('pnpm dev:mock --hostname 127.0.0.1');
  expect(readme).toContain('TC-194');
  expect(changelog).toContain('TC-194');
});
