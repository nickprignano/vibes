// Run with: node --test
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { THEME_FILES, appFiles, stamp, themeUrl, version } from '../tools/sw-version.mjs';

const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
const html = readFileSync('index.html', 'utf8');
const main = readFileSync('src/main.js', 'utf8');

// Width and height from a PNG's header.
function pngSize(path) {
  const b = readFileSync(path);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

test('the manifest has what browsers need to offer an install', () => {
  for (const key of ['id', 'name', 'short_name', 'start_url', 'display', 'background_color', 'theme_color']) {
    assert.ok(manifest[key], `manifest is missing ${key}`);
  }
  assert.equal(manifest.display, 'standalone');
  const icons = manifest.icons.map((i) => `${i.sizes} ${i.purpose}`);
  for (const want of ['192x192 any', '512x512 any', '512x512 maskable']) assert.ok(icons.includes(want), want);
  for (const icon of manifest.icons) assert.equal(pngSize(icon.src), icon.sizes, icon.src);
});

test('the page links the manifest, icons and iOS home-screen tags', () => {
  for (const tag of ['rel="manifest"', 'rel="apple-touch-icon"', 'name="theme-color"', 'name="apple-mobile-web-app-capable"', 'viewport-fit=cover']) {
    assert.ok(html.includes(tag), tag);
  }
  for (const [, href] of html.matchAll(/<link rel="(?:icon|apple-touch-icon|manifest)" href="([^"]+)"/g)) {
    assert.ok(existsSync(href), href);
  }
  assert.equal(pngSize('icons/apple-touch-icon.png'), '180x180');
});

test('the page and the player load the theme from the same pinned commit', () => {
  const theme = themeUrl();
  for (const [, url] of main.matchAll(/from "(https:[^"]+)"/g)) {
    assert.ok(url.startsWith(`${theme}/`), url);
    assert.ok(THEME_FILES.includes(url.slice(theme.length + 1)), `${url} is not in THEME_FILES`);
  }
});

test('sw.js lists every app file and the theme files, with a version that matches their contents', () => {
  const source = readFileSync('sw.js', 'utf8');
  const files = appFiles();
  assert.ok(files.includes('/') && files.includes('src/main.js') && !files.some((f) => f.startsWith('test/') || f.startsWith('docs/')));
  assert.equal(source, stamp(source, files, version('.', files), themeUrl()), 'sw.js is out of date: run node tools/sw-version.mjs');
});
