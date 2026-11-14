// Generates the app icons: the train mark (the week as a line, today a stop on it, the session the
// stop it arrives at) in each colour scheme's own dark colours.
//   node scripts/generate-icons.mjs
// Writes public/icons/<scheme>.svg and <scheme>-{180,192,512,maskable-512}.png, and copies the
// default (Crimson Violet) to the root icons the manifest and index.html reference.
// Rendering uses Chrome through playwright-core (installed with the App Designer skill, or set
// PLAYWRIGHT_CORE to a playwright-core folder).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'icons');
const DEFAULT = 'crimson';

// ground, rail, today stop, session stop: from the scheme's dark tokens (src/utils/schemes.ts).
const ICONS = {
  crimson: ['#470B24', '#7A3550', '#FFEDD5', '#B5BEDD'],
  espresso: ['#3F2622', '#6A4A43', '#F5F0E6', '#F4C9D6'],
  nox: ['#141414', '#3A3742', '#ECEAF0', '#7E49B3'],
  lavender: ['#1A1B3B', '#3F3F6A', '#FFDBED', '#F8769C'],
  bloom: ['#4C1413', '#7A3A38', '#FFDBED', '#EA6B7E'],
  lagoon: ['#3A2212', '#6A4A30', '#FFF8DC', '#75DDDD'],
  boreal: ['#062A15', '#245A38', '#F7F4D4', '#E9DB00'],
  velvet: ['#890105', '#B0383B', '#F6F5E1', '#FEEAF6'],
  amber: ['#1C1917', '#3B3633', '#F5F5F4', '#F59E0B'],
  blue: ['#0F172A', '#2A3850', '#F1F5F9', '#3B82F6'],
  emerald: ['#0C1A14', '#24392F', '#ECFDF5', '#10B981'],
};

// `scale` < 1 shrinks the mark around the centre (maskable icons keep it inside the safe circle).
const svg = ([ground, rail, now, dest], scale = 1) => {
  const t = `translate(50 50) scale(${scale}) translate(-55 -50)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${ground}"/>` +
    `<g transform="${t}"><path d="M30 18 V70 a12 12 0 0 0 12 12 H80" fill="none" stroke="${rail}" stroke-width="7" stroke-linecap="round"/>` +
    `<circle cx="30" cy="34" r="8" fill="${now}"/><circle cx="74" cy="82" r="10" fill="${dest}"/></g></svg>`;
};

let require;
try { require = createRequire(path.join(process.env.PLAYWRIGHT_CORE || `${process.env.HOME}/.claude/skills/app-designer`, 'package.json')); }
catch { console.error('playwright-core not found; set PLAYWRIGHT_CORE'); process.exit(1); }
const { chromium } = require('playwright-core');

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: 1 });
const render = async (markup, size, file) => {
  await page.setContent(`<html><body style="margin:0">${markup.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
  await page.locator('svg').screenshot({ path: file, animations: 'disabled', timeout: 15000 });
};
for (const [id, colours] of Object.entries(ICONS)) {
  fs.writeFileSync(path.join(OUT, `${id}.svg`), svg(colours));
  for (const size of [180, 192, 512]) await render(svg(colours), size, path.join(OUT, `${id}-${size}.png`));
  await render(svg(colours, 0.72), 512, path.join(OUT, `${id}-maskable-512.png`));
}
await browser.close();

const pub = path.join(ROOT, 'public');
fs.copyFileSync(path.join(OUT, `${DEFAULT}-180.png`), path.join(pub, 'apple-touch-icon.png'));
fs.copyFileSync(path.join(OUT, `${DEFAULT}-192.png`), path.join(pub, 'icon-192.png'));
fs.copyFileSync(path.join(OUT, `${DEFAULT}-512.png`), path.join(pub, 'icon-512.png'));
fs.copyFileSync(path.join(OUT, `${DEFAULT}-maskable-512.png`), path.join(pub, 'icon-maskable-512.png'));
fs.copyFileSync(path.join(OUT, `${DEFAULT}.svg`), path.join(pub, 'favicon.svg'));
console.log(`icons for ${Object.keys(ICONS).length} schemes -> public/icons`);
