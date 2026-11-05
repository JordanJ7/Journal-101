// Generates src/palettes.css from the palette definitions below.
// Run: node scripts/generate-palettes.mjs
//
// Each palette re-tints the whole app by overriding Tailwind's color variables while
// html[data-palette="<id>"] is set: the neutral scales (stone/neutral/zinc/gray/slate)
// run from the palette's light color to its dark color, the amber scale becomes the
// palette accent, and the hard-coded surface colors (--sf-*) follow both.
import fs from 'fs';

export const PALETTES = [
  { id: 'espresso', name: 'Deep Espresso', dark: '#3F2622', accent: '#F4C9D6', light: '#F5F0E6', onAccent: 'dark' },
  { id: 'nox', name: 'Nox Noir', dark: '#141414', accent: '#7E49B3', light: '#CFCFCF', onAccent: 'white' },
  { id: 'crimson', name: 'Crimson Violet', dark: '#470B24', accent: '#B5BEDD', light: '#FFEDD5', onAccent: 'dark' },
  // Lavender Steel has no truly dark color, so its dark end is a deep indigo derived from it.
  { id: 'lavender', name: 'Lavender Steel', dark: '#8E93CB', deriveDark: true, accent: '#F8769C', light: '#FFDBED', onAccent: 'dark' },
  { id: 'bloom', name: 'Obsidian Bloom', dark: '#4C1413', accent: '#EA6B7E', light: '#FFDBED', onAccent: 'dark' },
];

// ---- color math (OKLab / OKLCH) ----
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255); }
function rgbToHex(rgb) { return '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); }
function rgbToOklch(rgb) {
  const [r, g, b] = rgb.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
function oklchToRgbRaw([L, C, H]) {
  const A = C * Math.cos((H * Math.PI) / 180), B = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
// Reduce chroma until the color fits in sRGB.
function oklchToHex([L, C, H]) {
  let c = C;
  for (let i = 0; i < 60; i++) {
    const lin = oklchToRgbRaw([L, c, H]);
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005)) return rgbToHex(lin.map((v) => toGam(Math.min(1, Math.max(0, v)))));
    c *= 0.93;
  }
  return rgbToHex(oklchToRgbRaw([L, 0, H]).map((v) => toGam(Math.min(1, Math.max(0, v)))));
}
const lerp = (a, b, t) => a + (b - a) * t;
const lerpHue = (a, b, t) => { const d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360; };
const lum = (hex) => { const [r, g, b] = hexToRgb(hex).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Lightness of Tailwind's stone scale, used for the light half of every neutral scale.
const NEUTRAL_L = [0.985, 0.97, 0.923, 0.869, 0.709, 0.553, 0.444, 0.374, 0.268, 0.216, 0.147];

function build(p) {
  const light = rgbToOklch(hexToRgb(p.light));
  const darkSrc = rgbToOklch(hexToRgb(p.dark));
  const dark = p.deriveDark ? [0.24, Math.min(0.06, darkSrc[1]), darkSrc[2]] : darkSrc;
  const darkHex = p.deriveDark ? oklchToHex(dark) : p.dark.toUpperCase();
  const Ld = dark[0];

  // Neutral lightness: Tailwind stone for the light half, anchored to the palette dark at the bottom.
  const L = NEUTRAL_L.slice();
  L[10] = Ld;
  L[9] = Math.max(L[9], Ld + 0.05);
  L[8] = Math.max(L[8], Ld + 0.11);
  L[7] = Math.max(L[7], Ld + 0.17);
  L[6] = Math.max(L[6], Ld + 0.2);
  L[5] = Math.max(L[5], L[6] + 0.05);
  const cLight = Math.min(light[1], 0.02);
  const neutral = SHADES.map((s, i) => {
    if (i === 10) return darkHex;
    const t = i / 10;
    const c = Math.min(0.05, lerp(cLight, dark[1], t * t));
    return oklchToHex([L[i], c, lerpHue(light[2], dark[2], t)]);
  });

  // Accent (amber) scale passes through the exact palette accent at 500, so hard-coded
  // bg-amber-500 controls show the real color. 700 stays dark enough for text on white
  // (light mode) and 300 light enough for text on dark surfaces.
  const acc = rgbToOklch(hexToRgb(p.accent));
  const La = acc[0];
  const up = [0.3, 0.55, 0.75, 0.9, 1].map((f) => La + (0.975 - La) * f); // 400, 300, 200, 100, 50
  const L700 = Math.min(0.52, La - 0.14);
  const accL = [up[4], up[3], up[2], up[1], up[0], La, (La + L700) / 2, L700, L700 - 0.08, L700 - 0.15, Math.max(0.2, L700 - 0.23)];
  const amber = SHADES.map((s, i) => {
    if (i === 5) return p.accent.toUpperCase();
    const edge = i === 0 ? 0.25 : i === 1 ? 0.45 : i === 10 ? 0.7 : 1;
    return oklchToHex([accL[i], Math.max(acc[1] * edge, 0.02), acc[2]]);
  });

  // Page background in light mode: the palette's light color, lifted if it is too dark for a page.
  const pageLight = light[0] >= 0.92 ? p.light.toUpperCase() : oklchToHex([0.93, light[1] * 0.6, light[2]]);
  const surf = (dL) => oklchToHex([Math.max(0.05, Ld + dL), Math.min(dark[1], 0.06) * (dL > 0.05 ? 0.8 : 1), dark[2]]);
  const onAccent = p.onAccent === 'white' ? '#FFFFFF' : darkHex;

  return {
    ...p, darkHex, neutral, amber, onAccent,
    surfaces: {
      '--sf-app-lt': pageLight,
      '--sf-grouped-lt': oklchToHex([0.955, cLight, light[2]]),
      '--sf-soft-lt': neutral[0],
      '--sf-app-dk': darkHex,
      '--sf-sunken-dk': surf(-0.02),
      '--sf-header-dk': surf(0.015),
      '--sf-panel-dk': surf(0.025),
      '--sf-card-dk': surf(0.04),
      '--sf-raised-dk': surf(0.06),
      '--sf-raised2-dk': surf(0.08),
      '--sf-raised3-dk': surf(0.13),
    },
  };
}

export const BUILT = PALETTES.map(build);

if (process.argv[1] && process.argv[1].endsWith('generate-palettes.mjs')) {
  let css = '/* Generated by scripts/generate-palettes.mjs. Do not edit by hand. */\n\n';
  for (const b of BUILT) {
    css += `html[data-palette="${b.id}"] {\n`;
    css += `  /* ${b.name}: dark ${b.darkHex}, accent ${b.accent}, light ${b.light} */\n`;
    css += `  --accent: ${b.accent};\n  --on-accent: ${b.onAccent};\n`;
    for (const fam of ['stone', 'neutral', 'zinc', 'gray', 'slate']) {
      SHADES.forEach((s, i) => (css += `  --color-${fam}-${s}: ${b.neutral[i]};\n`));
    }
    SHADES.forEach((s, i) => (css += `  --color-amber-${s}: ${b.amber[i]};\n`));
    for (const [k, v] of Object.entries(b.surfaces)) css += `  ${k}: ${v};\n`;
    css += '}\n\n';
  }
  fs.writeFileSync(new URL('../src/palettes.css', import.meta.url), css);
  // Contrast report for the roles the UI relies on.
  for (const b of BUILT) {
    const r = (x) => x.toFixed(1);
    console.log(b.id.padEnd(9),
      'body text/page', r(contrast(b.neutral[9], b.surfaces['--sf-app-lt'])),
      '| muted text/white', r(contrast(b.neutral[5], '#FFFFFF')),
      '| accent text/white', r(contrast(b.amber[7], '#FFFFFF')),
      '| button', r(contrast(b.onAccent, b.accent)),
      '| dark: text', r(contrast(b.neutral[1], b.surfaces['--sf-app-dk'])),
      '| muted', r(contrast(b.neutral[4], b.surfaces['--sf-card-dk'])),
      '| accent', r(contrast(b.amber[3], b.surfaces['--sf-card-dk'])));
  }
}
