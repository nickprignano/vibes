// Writes the list of app files and their content hash into sw.js, so the installed app
// downloads a new version whenever any app file changes. Run after changing an app file:
//   node tools/sw-version.mjs
// test/pwa.test.mjs fails if this hasn't been run.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_FILE = /\.(html|css|m?js|json|webmanifest|png|svg|mp3)$/;

// Files the site serves (not left out by .assetsignore) that the app needs, as site paths.
export function appFiles(root = '.') {
  const ignored = readFileSync(join(root, '.assetsignore'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(join(root, dir)).sort()) {
      const path = dir ? `${dir}/${name}` : name;
      if (ignored.includes(path) || name === 'node_modules' || name === 'sw.js') continue;
      if (statSync(join(root, path)).isDirectory()) walk(path);
      else if (APP_FILE.test(name)) files.push(path);
    }
  })('');
  // The page is served at "/", never at "/index.html" (which redirects).
  return files.map((path) => (path === 'index.html' ? '/' : path));
}

export function version(root = '.', files = appFiles(root)) {
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(path);
    hash.update(readFileSync(join(root, path === '/' ? 'index.html' : path)));
  }
  return hash.digest('hex').slice(0, 12);
}

// The shared theme and its line-art library, from jsDelivr at the commit the
// page pins (THEME_URL in index.html). Listed by hand: add a file here when the
// library gains one.
export const THEME_FILES = [
  'theme.css',
  'index.js',
  'art/index.js',
  'art/rng.js',
  'art/color.js',
  'art/styles/space.js',
  'art/styles/flow-trails.js',
  'art/styles/wave-lines.js',
  'art/styles/harmonograph.js',
  'art/styles/gear-curves.js',
  'art/styles/rose.js',
  'art/styles/knot.js',
  'art/styles/wire-solids.js',
  'art/styles/attractor.js',
  'art/styles/times-tables.js',
  'art/styles/star-polygons.js',
  'art/styles/circle-lattice.js',
  'art/styles/star-tiling.js',
  'art/styles/rhomb-tiling.js',
  'art/styles/hyperbolic.js',
  'art/styles/voronoi.js',
  'art/styles/fractal-curves.js',
  'art/styles/meander.js',
  'art/styles/epicycles.js',
];

// The theme's address, pinned to one commit, as index.html loads it.
export function themeUrl(root = '.') {
  return readFileSync(join(root, 'index.html'), 'utf8').match(/href="(https:\/\/cdn\.jsdelivr\.net\/gh\/nickprignano\/prignano-theme@[0-9a-f]{40})\/theme\.css"/)[1];
}

// Sound files go in their own cache, named by their own hash, so an app update doesn't
// download them again.
export function stamp(source, files, v, theme, root = '.') {
  const audio = files.filter((f) => f.startsWith('audio/'));
  const list = (name, items) => [new RegExp(`^const ${name} = \\[[\\s\\S]*?\\];$`, 'm'), `const ${name} = [\n${items.map((f) => `  '${f}',`).join('\n')}\n];`];
  return source
    .replace(/^const VERSION = .*$/m, `const VERSION = '${v}';`)
    .replace(/^const AUDIO_VERSION = .*$/m, `const AUDIO_VERSION = '${version(root, audio)}';`)
    .replace(...list('FILES', files.filter((f) => !audio.includes(f))))
    .replace(...list('AUDIO', audio))
    .replace(/^const EXTRA = \[[\s\S]*?\];$/m, `const EXTRA = [\n${THEME_FILES.map((f) => `  '${theme}/${f}',`).join('\n')}\n];`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = appFiles();
  writeFileSync('sw.js', stamp(readFileSync('sw.js', 'utf8'), files, version('.', files), themeUrl()));
  console.log(`sw.js: ${files.length} files, version ${version('.', files)}`);
}
