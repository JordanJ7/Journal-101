/**
 * Colour tokens for the redesigned screens (design/journal-redesign/schemes.html), one set per
 * scheme for dark and one for light. Each mode is designed on its own: the dark mode uses the
 * palette's own dark colour as the ground, the light mode its light colour. They are applied as
 * --j-* CSS variables on <html> (see applySchemeTokens) and read by Tailwind arbitrary values,
 * e.g. bg-(--j-ground) text-(--j-ink).
 *
 * Roles: ground (page), ink (text), ink2 (secondary text, ≥4.5:1 on ground), line (hairlines),
 * bar (week-strip bars), sig/onsig (the one accent fill and its text), tag (accent as text),
 * today (today's strip bar), field/fieldline (the composer), glass (floating bars), side (sidebar),
 * chip (accent-tinted tag), soft (a quiet panel surface).
 */
import type { AccentTheme } from '../types';

export interface SchemeTokens {
  ground: string; ink: string; ink2: string; line: string; bar: string; sig: string; onsig: string;
  tag: string; today: string; field: string; fieldline: string; glass: string; side: string; chip: string; soft: string;
}

type Pair = { dark: SchemeTokens; light: SchemeTokens };

const t = (o: Omit<SchemeTokens, 'today' | 'chip' | 'soft'> & { today?: string; chip?: string }): SchemeTokens => ({
  ...o,
  today: o.today ?? o.sig,
  chip: o.chip ?? `color-mix(in srgb, ${o.tag} 16%, transparent)`,
  // A quiet panel surface for older screens: the ground, nudged toward the text colour.
  soft: `color-mix(in srgb, ${o.ink} 7%, ${o.ground})`,
});

export const SCHEMES: Record<AccentTheme, Pair> = {
  crimson: {
    dark: t({ ground: '#470B24', ink: '#FFEDD5', ink2: '#E2C3BA', line: 'rgba(255,237,213,.16)', bar: 'rgba(255,237,213,.20)', sig: '#B5BEDD', onsig: '#470B24', tag: '#B5BEDD', field: '#5A1832', fieldline: 'rgba(255,237,213,.18)', glass: 'rgba(90,24,50,.78)', side: '#3A081D' }),
    light: t({ ground: '#FFEDD5', ink: '#470B24', ink2: '#7A3550', line: 'rgba(71,11,36,.14)', bar: 'rgba(71,11,36,.16)', sig: '#470B24', onsig: '#FFEDD5', tag: '#4B57A3', today: '#7E8BCB', field: '#FFF7EC', fieldline: 'rgba(71,11,36,.16)', glass: 'rgba(255,247,236,.82)', side: '#F8E2C6' }),
  },
  espresso: {
    dark: t({ ground: '#3F2622', ink: '#F5F0E6', ink2: '#D4C1B8', line: 'rgba(245,240,230,.15)', bar: 'rgba(245,240,230,.20)', sig: '#F4C9D6', onsig: '#3F2622', tag: '#F4C9D6', field: '#4E322D', fieldline: 'rgba(245,240,230,.16)', glass: 'rgba(78,50,45,.8)', side: '#33201D' }),
    light: t({ ground: '#F5F0E6', ink: '#3F2622', ink2: '#6E4F47', line: 'rgba(63,38,34,.13)', bar: 'rgba(63,38,34,.15)', sig: '#3F2622', onsig: '#F5F0E6', tag: '#A3405F', today: '#E08FA8', field: '#FBF8F2', fieldline: 'rgba(63,38,34,.15)', glass: 'rgba(251,248,242,.82)', side: '#EDE5D7' }),
  },
  nox: {
    dark: t({ ground: '#141414', ink: '#ECEAF0', ink2: '#A6A3AE', line: '#2A2830', bar: '#3A3742', sig: '#7E49B3', onsig: '#FFFFFF', tag: '#B794E0', field: '#1E1C22', fieldline: '#34313B', glass: 'rgba(30,28,34,.8)', side: '#0E0E0F' }),
    light: t({ ground: '#EDEDED', ink: '#141414', ink2: '#55545A', line: 'rgba(20,20,20,.12)', bar: 'rgba(20,20,20,.14)', sig: '#7E49B3', onsig: '#FFFFFF', tag: '#6A3A9C', field: '#F8F8F8', fieldline: 'rgba(20,20,20,.14)', glass: 'rgba(248,248,248,.82)', side: '#E2E2E2' }),
  },
  lavender: {
    dark: t({ ground: '#1A1B3B', ink: '#FFDBED', ink2: '#C9B9D6', line: 'rgba(255,219,237,.15)', bar: 'rgba(255,219,237,.20)', sig: '#F8769C', onsig: '#1A1B3B', tag: '#FF9DBA', field: '#262850', fieldline: 'rgba(255,219,237,.17)', glass: 'rgba(38,40,80,.8)', side: '#141530' }),
    light: t({ ground: '#FFDBED', ink: '#1A1B3B', ink2: '#4C4A73', line: 'rgba(26,27,59,.13)', bar: 'rgba(26,27,59,.15)', sig: '#1A1B3B', onsig: '#FFDBED', tag: '#A82E57', today: '#F8769C', field: '#FFEEF6', fieldline: 'rgba(26,27,59,.15)', glass: 'rgba(255,238,246,.82)', side: '#F7CDE2' }),
  },
  bloom: {
    dark: t({ ground: '#4C1413', ink: '#FFDBED', ink2: '#E8BCC6', line: 'rgba(255,219,237,.15)', bar: 'rgba(255,219,237,.20)', sig: '#EA6B7E', onsig: '#4C1413', tag: '#F7A0AE', field: '#5E2220', fieldline: 'rgba(255,219,237,.17)', glass: 'rgba(94,34,32,.8)', side: '#3D0F0E' }),
    light: t({ ground: '#FFDBED', ink: '#4C1413', ink2: '#7D3A40', line: 'rgba(76,20,19,.13)', bar: 'rgba(76,20,19,.15)', sig: '#4C1413', onsig: '#FFDBED', tag: '#A8324A', today: '#EA6B7E', field: '#FFEEF6', fieldline: 'rgba(76,20,19,.15)', glass: 'rgba(255,238,246,.82)', side: '#F7CDE2' }),
  },
  lagoon: {
    dark: t({ ground: '#3A2212', ink: '#FFF8DC', ink2: '#DCC7A8', line: 'rgba(255,248,220,.15)', bar: 'rgba(255,248,220,.20)', sig: '#75DDDD', onsig: '#3A2212', tag: '#75DDDD', field: '#4A2E1A', fieldline: 'rgba(255,248,220,.17)', glass: 'rgba(74,46,26,.8)', side: '#2E1A0D' }),
    light: t({ ground: '#FFF8DC', ink: '#4A2A10', ink2: '#7A5332', line: 'rgba(74,42,16,.13)', bar: 'rgba(74,42,16,.15)', sig: '#CD853F', onsig: '#3A2212', tag: '#1F7373', today: '#3FBDBD', field: '#FFFCEE', fieldline: 'rgba(74,42,16,.15)', glass: 'rgba(255,252,238,.82)', side: '#F6ECC8' }),
  },
  boreal: {
    dark: t({ ground: '#062A15', ink: '#F7F4D4', ink2: '#BFD0B5', line: 'rgba(247,244,212,.14)', bar: 'rgba(247,244,212,.18)', sig: '#E9DB00', onsig: '#062A15', tag: '#E9DB00', field: '#0D3A20', fieldline: 'rgba(247,244,212,.16)', glass: 'rgba(13,58,32,.8)', side: '#04200F' }),
    light: t({ ground: '#FBF9E4', ink: '#06331A', ink2: '#3D5A44', line: 'rgba(6,51,26,.12)', bar: 'rgba(6,51,26,.14)', sig: '#038A3B', onsig: '#FFFFFF', tag: '#B3364F', today: '#E67086', field: '#FFFEF3', fieldline: 'rgba(6,51,26,.14)', glass: 'rgba(255,254,243,.82)', side: '#F1EECF' }),
  },
  velvet: {
    dark: t({ ground: '#890105', ink: '#F6F5E1', ink2: '#F2CFC9', line: 'rgba(246,245,225,.18)', bar: 'rgba(246,245,225,.24)', sig: '#FEEAF6', onsig: '#890105', tag: '#FEEAF6', field: '#9C1A1D', fieldline: 'rgba(246,245,225,.20)', glass: 'rgba(156,26,29,.82)', side: '#700004' }),
    light: t({ ground: '#F6F5E1', ink: '#890105', ink2: '#7E3A35', line: 'rgba(137,1,5,.13)', bar: 'rgba(137,1,5,.15)', sig: '#890105', onsig: '#FEEAF6', tag: '#B0264A', today: '#E28BB0', field: '#FEEAF6', fieldline: 'rgba(137,1,5,.15)', glass: 'rgba(254,234,246,.82)', side: '#ECEACD' }),
  },
  amber: {
    dark: t({ ground: '#1C1917', ink: '#F5F5F4', ink2: '#AEA8A3', line: '#2F2B28', bar: '#3B3633', sig: '#F59E0B', onsig: '#1C1917', tag: '#FBBF24', field: '#262220', fieldline: '#3B3633', glass: 'rgba(38,34,32,.82)', side: '#151311' }),
    light: t({ ground: '#FAFAF9', ink: '#1C1917', ink2: '#57534E', line: '#E7E5E4', bar: '#E2DFDC', sig: '#1C1917', onsig: '#FAFAF9', tag: '#B45309', today: '#F59E0B', field: '#FFFFFF', fieldline: '#E2DFDC', glass: 'rgba(255,255,255,.82)', side: '#F1EFEC' }),
  },
  blue: {
    dark: t({ ground: '#0F172A', ink: '#F1F5F9', ink2: '#9DAABE', line: '#1E293B', bar: '#2A3850', sig: '#3B82F6', onsig: '#FFFFFF', tag: '#7DB2FF', field: '#16203A', fieldline: '#2A3850', glass: 'rgba(22,32,58,.82)', side: '#0B1222' }),
    light: t({ ground: '#F8FAFC', ink: '#0F172A', ink2: '#475569', line: '#E2E8F0', bar: '#DCE3EC', sig: '#2563EB', onsig: '#FFFFFF', tag: '#1D4ED8', field: '#FFFFFF', fieldline: '#DCE3EC', glass: 'rgba(255,255,255,.82)', side: '#EEF2F7' }),
  },
  emerald: {
    dark: t({ ground: '#0C1A14', ink: '#ECFDF5', ink2: '#9DBAAD', line: '#1B2E25', bar: '#24392F', sig: '#10B981', onsig: '#052E1F', tag: '#4ADE9F', field: '#13241C', fieldline: '#24392F', glass: 'rgba(19,36,28,.82)', side: '#08140F' }),
    light: t({ ground: '#F6FAF8', ink: '#052E1F', ink2: '#3F5F52', line: '#DDE9E3', bar: '#D5E3DC', sig: '#047857', onsig: '#FFFFFF', tag: '#047857', field: '#FFFFFF', fieldline: '#D5E3DC', glass: 'rgba(255,255,255,.82)', side: '#EAF2EE' }),
  },
};

/** Writes the scheme's tokens for the current mode onto <html> as --j-* variables. */
export function applySchemeTokens(accent: AccentTheme, dark: boolean) {
  const pair = SCHEMES[accent] || SCHEMES.crimson;
  const tokens = dark ? pair.dark : pair.light;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(`--j-${k}`, v);
  // The browser chrome (status bar on iOS, tab colour) follows the ground.
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
  meta.content = tokens.ground;
}
