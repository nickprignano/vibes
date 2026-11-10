// Run with: node --test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SOUNDS } from '../src/sounds.js';
import { appFiles } from '../tools/sw-version.mjs';

const text = appFiles()
  .filter((f) => !/\.(png|mp3)$/.test(f))
  .map((f) => readFileSync(f === '/' ? 'index.html' : f, 'utf8'))
  .join('\n');

test('shipped files never name screensaver products, a toy trademark or marked pattern names', () => {
  // Encoded so this file doesn't contain them either.
  const banned = ['TXlzdGlmeQ==', 'QWZ0ZXIgRGFyaw==', 'U3Bpcm9ncmFwaA==', 'Rmxvd2VyIG9mIExpZmU=', 'U2VlZCBvZiBMaWZl', 'UGVucm9zZQ==', 'RmxvYXRpbmcgdG9hc3Rlcg==']
    .map((b) => Buffer.from(b, 'base64').toString().toLowerCase());
  for (const word of banned) assert.ok(!text.toLowerCase().includes(word), 'a banned word is in a shipped file');
});

test('nothing leaves the device: no network calls in shipped files', () => {
  const pageCode = appFiles().filter((f) => f.endsWith('.js')).map((f) => readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(pageCode, /\b(XMLHttpRequest|WebSocket|sendBeacon|EventSource)\b/);
  // fetch only in the service worker, which serves the app's own cached files, and for
  // the app's own sound files, which it caches.
  assert.doesNotMatch(pageCode.replace('fetch(file)', ''), /\bfetch\(/);
  for (const { file } of SOUNDS) if (file) assert.match(file, /^audio\/[a-z]+\.mp3$/);
  assert.match(readFileSync('sw.js', 'utf8'), /fetch\(request\)/);
});
