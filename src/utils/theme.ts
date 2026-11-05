import { AccentTheme } from '../types';

export interface ThemeColorDef {
  id: AccentTheme;
  name: string;
  bg500: string;
  bgHover: string;
  textPrimary: string;
  hoverText: string;
  groupHoverText: string;
  badgeBg: string;
  badgeText: string;
  tagBadge: string;
  iconBox: string;
  iconBoxHover: string;
  iconBoxSelected: string;
  bulletDot: string;
  buttonPrimary: string;
  border: string;
  hoverBorder: string;
  activeBorder: string;
  ring: string;
  colorHex: string;
  activeTabBg: string;
  /** Full palettes re-tint the whole app (see src/palettes.css); classic themes only change the accent. */
  palette?: { dark: string; accent: string; light: string };
}

// Palette themes reuse the amber utility classes: while html[data-palette] is set, src/palettes.css
// re-tints the amber scale to the palette accent (text roles use 700 / 300 so contrast holds for
// light accents too), and --accent / --on-accent give the exact palette color for filled controls.
// Colors here must match scripts/generate-palettes.mjs.
const paletteTheme = (id: AccentTheme, name: string, palette: { dark: string; accent: string; light: string }): ThemeColorDef => ({
  id,
  name,
  bg500: 'bg-(--accent)',
  bgHover: 'hover:brightness-95',
  textPrimary: 'text-amber-700 dark:text-amber-300',
  hoverText: 'hover:text-amber-700 dark:hover:text-amber-300',
  groupHoverText: 'group-hover:text-amber-700 dark:group-hover:text-amber-300',
  badgeBg: 'bg-amber-100 dark:bg-amber-950/70',
  badgeText: 'text-amber-800 dark:text-amber-200',
  tagBadge: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 dark:border-amber-400/20',
  iconBox: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300',
  iconBoxHover: 'group-hover:bg-amber-500/20 group-hover:text-amber-800 dark:group-hover:text-amber-200',
  iconBoxSelected: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-2xs',
  bulletDot: 'bg-(--accent)',
  buttonPrimary: 'bg-(--accent) hover:brightness-105 active:brightness-95 text-(--on-accent) font-semibold shadow-xs',
  border: 'border-amber-500/40 dark:border-amber-400/30',
  hoverBorder: 'hover:border-amber-500/40 dark:hover:border-amber-400/30',
  activeBorder: 'border-amber-500/60 ring-1 ring-amber-500/40',
  ring: 'focus:ring-amber-500',
  colorHex: palette.accent,
  activeTabBg: 'bg-(--accent) text-(--on-accent) shadow-xs font-semibold',
  palette,
});

export const DEFAULT_ACCENT_THEME: AccentTheme = 'espresso';

export const ACCENT_THEMES: Record<AccentTheme, ThemeColorDef> = {
  espresso: paletteTheme('espresso', 'Deep Espresso', { dark: '#3F2622', accent: '#F4C9D6', light: '#F5F0E6' }),
  nox: paletteTheme('nox', 'Nox Noir', { dark: '#141414', accent: '#7E49B3', light: '#CFCFCF' }),
  crimson: paletteTheme('crimson', 'Crimson Violet', { dark: '#470B24', accent: '#B5BEDD', light: '#FFEDD5' }),
  lavender: paletteTheme('lavender', 'Lavender Steel', { dark: '#8E93CB', accent: '#F8769C', light: '#FFDBED' }),
  bloom: paletteTheme('bloom', 'Obsidian Bloom', { dark: '#4C1413', accent: '#EA6B7E', light: '#FFDBED' }),
  amber: {
    id: 'amber',
    name: 'Warm Amber',
    bg500: 'bg-amber-500',
    bgHover: 'hover:bg-amber-600',
    textPrimary: 'text-amber-600 dark:text-amber-400',
    hoverText: 'hover:text-amber-600 dark:hover:text-amber-400',
    groupHoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-200',
    tagBadge: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20',
    iconBox: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400',
    iconBoxHover: 'group-hover:bg-amber-500/20 group-hover:text-amber-700 dark:group-hover:text-amber-300',
    iconBoxSelected: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-2xs',
    bulletDot: 'bg-amber-500 dark:bg-amber-400',
    buttonPrimary: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-semibold shadow-xs',
    border: 'border-amber-500/40 dark:border-amber-400/30',
    hoverBorder: 'hover:border-amber-500/40 dark:hover:border-amber-400/30',
    activeBorder: 'border-amber-500/60 ring-1 ring-amber-500/40',
    ring: 'focus:ring-amber-500',
    colorHex: '#F59E0B',
    activeTabBg: 'bg-amber-500 text-white shadow-xs font-semibold',
  },
  blue: {
    id: 'blue',
    name: 'Royal Sapphire',
    bg500: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    textPrimary: 'text-blue-600 dark:text-blue-400',
    hoverText: 'hover:text-blue-600 dark:hover:text-blue-400',
    groupHoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/80',
    badgeText: 'text-blue-800 dark:text-blue-200',
    tagBadge: 'bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-400/20',
    iconBox: 'bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400',
    iconBoxHover: 'group-hover:bg-blue-500/20 group-hover:text-blue-700 dark:group-hover:text-blue-300',
    iconBoxSelected: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-2xs',
    bulletDot: 'bg-blue-500 dark:bg-blue-400',
    buttonPrimary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs',
    border: 'border-blue-500/40 dark:border-blue-400/30',
    hoverBorder: 'hover:border-blue-500/40 dark:hover:border-blue-400/30',
    activeBorder: 'border-blue-500/60 ring-1 ring-blue-500/40',
    ring: 'focus:ring-blue-500',
    colorHex: '#2563EB',
    activeTabBg: 'bg-blue-600 text-white shadow-xs font-semibold',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    bg500: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    textPrimary: 'text-emerald-600 dark:text-emerald-400',
    hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-400',
    groupHoverText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    tagBadge: 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-400/20',
    iconBox: 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
    iconBoxHover: 'group-hover:bg-emerald-500/20 group-hover:text-emerald-700 dark:group-hover:text-emerald-300',
    iconBoxSelected: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-2xs',
    bulletDot: 'bg-emerald-500 dark:bg-emerald-400',
    buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs',
    border: 'border-emerald-500/40 dark:border-emerald-400/30',
    hoverBorder: 'hover:border-emerald-500/40 dark:hover:border-emerald-400/30',
    activeBorder: 'border-emerald-500/60 ring-1 ring-emerald-500/40',
    ring: 'focus:ring-emerald-500',
    colorHex: '#059669',
    activeTabBg: 'bg-emerald-600 text-white shadow-xs font-semibold',
  },
};

/** Maps a stored theme id (possibly one that was removed, like 'violet' or 'rose') to a valid one. */
export function normalizeAccentTheme(value: unknown): AccentTheme {
  return typeof value === 'string' && value in ACCENT_THEMES ? (value as AccentTheme) : DEFAULT_ACCENT_THEME;
}
