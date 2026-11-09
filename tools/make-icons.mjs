// Draws icons/icon.svg (a harmonograph figure, like the art's own) and renders
// the PNG app icons from it. Run after changing the figure:
//   node tools/make-icons.mjs
// Needs Playwright with Chromium (not a dependency of the app).
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');

// Two decaying pendulum curves, the same maths as the harmonograph style.
function curve(fx, fy, fx2, fy2, px, py) {
  const pts = [];
  for (let i = 0; i <= 900; i++) {
    const s = (i / 900) * 40;
    const e = Math.exp(-0.035 * s);
    const x = (Math.sin(fx * s + px) + Math.sin(fx2 * s + py)) * 0.5 * e;
    const y = (Math.sin(fy * s + py) + Math.sin(fy2 * s + px)) * 0.5 * e;
    pts.push(`${(32 + x * 26).toFixed(2)},${(32 + y * 26).toFixed(2)}`);
  }
  return `M${pts.join('L')}`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#000"/>
  <path d="${curve(3, 2, 1, 3, 0.4, 1.9)}" fill="none" stroke="#58a6ff" stroke-width="0.4" stroke-opacity="0.85"/>
  <path d="${curve(2, 3, 4, 1, 2.2, 0.7)}" fill="none" stroke="#c678ff" stroke-width="0.4" stroke-opacity="0.75"/>
</svg>
`;
writeFileSync('icons/icon.svg', svg);

// [file, size, scale]: "any" icons fill more of the square; the maskable one keeps the
// artwork inside the 80% safe circle that Android crops to.
const outputs = [
  ['icons/icon-192.png', 192, 1],
  ['icons/icon-512.png', 512, 1],
  ['icons/icon-maskable-512.png', 512, 0.8],
  ['icons/apple-touch-icon.png', 180, 1],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, scale] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:#000;overflow:hidden}svg{width:${size}px;height:${size}px;display:block;transform:scale(${scale})}</style>${svg}`);
  await page.screenshot({ path: file });
}
await browser.close();
