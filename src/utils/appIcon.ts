/**
 * The app icon is its own choice, separate from the colour scheme, saved on this device only
 * (like the colour scheme itself, which is not synced to the account).
 *
 * A web app on the iPhone/iPad Home Screen keeps the icon it was added with; the choice here sets
 * the icon used the next time Journal is added to the Home Screen (and the browser tab icon now).
 */
import type { AccentTheme } from '../types';

export type IconChoice = AccentTheme | 'match';
const KEY = 'journal_app_icon';
export const DEFAULT_ICON: AccentTheme = 'crimson';
export const ICON_EVENT = 'journal-app-icon-change';

export function getIconChoice(): IconChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return v as IconChoice;
  } catch {}
  return DEFAULT_ICON;
}

export function setIconChoice(choice: IconChoice) {
  try { localStorage.setItem(KEY, choice); } catch {}
  window.dispatchEvent(new Event(ICON_EVENT));
}

export function resolveIcon(choice: IconChoice, accent: AccentTheme): AccentTheme {
  return choice === 'match' ? accent : choice;
}

/** Points the Home Screen icon and the tab icon at the chosen scheme's icon. */
export function applyAppIcon(accent: AccentTheme) {
  const id = resolveIcon(getIconChoice(), accent);
  const set = (rel: string, href: string, extra?: Record<string, string>) => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) { link = document.createElement('link'); link.rel = rel; document.head.appendChild(link); }
    if (extra) for (const [k, v] of Object.entries(extra)) link.setAttribute(k, v);
    if (link.getAttribute('href') !== href) link.href = href;
  };
  set('apple-touch-icon', `/icons/${id}-180.png`, { sizes: '180x180' });
  set('icon', `/icons/${id}.svg`, { type: 'image/svg+xml' });
}
