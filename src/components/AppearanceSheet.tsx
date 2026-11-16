import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useJournalStore } from '../store/useJournalStore';
import type { AccentTheme } from '../types';
import { getIconChoice, ICON_EVENT, IconChoice, resolveIcon, setIconChoice } from '../utils/appIcon';
import { SCHEMES } from '../utils/schemes';
import { ACCENT_THEMES } from '../utils/theme';

const ORDER: AccentTheme[] = ['crimson', 'espresso', 'nox', 'lavender', 'bloom', 'lagoon', 'boreal', 'velvet', 'amber', 'blue', 'emerald'];
const SHORT: Record<AccentTheme, string> = { crimson: 'Crimson', espresso: 'Espresso', nox: 'Nox', lavender: 'Lavender', bloom: 'Bloom', lagoon: 'Lagoon', boreal: 'Boreal', velvet: 'Velvet', amber: 'Amber', blue: 'Blue', emerald: 'Emerald' };
const shortName = (id: AccentTheme) => SHORT[id] || ACCENT_THEMES[id]?.name || id;

/**
 * Appearance: light or dark, the colour scheme, and the app icon. All three are saved on this
 * device only. The icon is its own choice; "Match colour scheme" makes it follow the scheme.
 */
export const AppearanceSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const theme = useJournalStore((s) => s.theme);
  const setTheme = useJournalStore((s) => s.setTheme);
  const accent = useJournalStore((s) => s.accentTheme);
  const setAccent = useJournalStore((s) => s.setAccentTheme);
  const [icon, setIcon] = useState<IconChoice>(getIconChoice);

  useEffect(() => {
    const sync = () => setIcon(getIconChoice());
    window.addEventListener(ICON_EVENT, sync);
    return () => window.removeEventListener(ICON_EVENT, sync);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  const matching = icon === 'match';
  const shownIcon = resolveIcon(icon, accent);

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Appearance">
      <div className="m-fade absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="m-sheet m-sheet-from-bottom relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-(--j-ground) text-(--j-ink) border border-(--j-line) shadow-2xl px-5 sm:px-7 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-between">
          <h2 className="j-display text-[30px] leading-tight m-0">Appearance</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 rounded-full grid place-items-center bg-(--j-chip) text-(--j-ink)">
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-[13px] font-semibold text-(--j-ink2) mt-6 mb-2">Mode</h3>
        <div className="grid grid-cols-2 p-1 rounded-xl bg-(--j-chip)">
          {(['light', 'dark'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setTheme(m)} aria-pressed={theme === m}
              className={`min-h-[40px] rounded-lg text-[15px] font-semibold capitalize ${theme === m ? 'bg-(--j-ground) text-(--j-ink) shadow-xs' : 'text-(--j-ink2)'}`}>
              {m}
            </button>
          ))}
        </div>

        <h3 className="text-[13px] font-semibold text-(--j-ink2) mt-6 mb-3">Colour scheme · this device</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-2 gap-y-3">
          {ORDER.map((id) => {
            const t = SCHEMES[id][theme === 'dark' ? 'dark' : 'light'];
            const on = accent === id;
            return (
              <button key={id} type="button" onClick={() => setAccent(id)} aria-pressed={on} title={ACCENT_THEMES[id]?.name}
                className="flex flex-col items-center gap-1.5 min-h-[44px]">
                <span className="relative w-11 h-11 rounded-full overflow-hidden border border-(--j-line)"
                  style={{ background: SCHEMES[id].dark.ground, boxShadow: on ? '0 0 0 2px var(--j-ground), 0 0 0 4px var(--j-ink)' : undefined }}>
                  <span className="absolute right-0 bottom-0 w-1/2 h-1/2" style={{ background: SCHEMES[id].dark.sig }} />
                  <span className="absolute left-0 bottom-0 w-1/2 h-1/2" style={{ background: t.ground === SCHEMES[id].dark.ground ? SCHEMES[id].light.ground : t.ground }} />
                </span>
                <small className={`text-[11px] leading-[13px] text-center ${on ? 'text-(--j-ink) font-semibold' : 'text-(--j-ink2)'}`}>{shortName(id)}</small>
              </button>
            );
          })}
        </div>

        <h3 className="text-[13px] font-semibold text-(--j-ink2) mt-7 mb-1">App icon</h3>
        <label className="flex items-center justify-between gap-3 py-2.5 border-b border-(--j-line) text-[17px] cursor-pointer">
          <span>Match colour scheme</span>
          <input type="checkbox" className="sr-only peer" checked={matching}
            onChange={(e) => setIconChoice(e.target.checked ? 'match' : accent)} />
          <span className="relative w-[51px] h-[31px] rounded-full bg-(--j-bar) peer-checked:bg-(--j-sig) transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[27px] after:h-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-[20px]" aria-hidden="true" />
        </label>
        <div className={`grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4 ${matching ? 'opacity-50' : ''}`}>
          {ORDER.map((id) => (
            <button key={id} type="button" disabled={matching} onClick={() => setIconChoice(id)} aria-pressed={shownIcon === id} aria-label={`${ACCENT_THEMES[id]?.name} icon`}
              className="rounded-[22%] overflow-hidden aspect-square"
              style={{ boxShadow: shownIcon === id ? '0 0 0 2px var(--j-ground), 0 0 0 4px var(--j-ink)' : '0 0 0 1px var(--j-line)' }}>
              <img src={`/icons/${id}-180.png`} alt="" className="w-full h-full block" />
            </button>
          ))}
        </div>
        <p className="text-[13px] leading-[18px] text-(--j-ink2) mt-4 mb-0">
          On iPhone and iPad, a new icon shows after you remove Journal from your Home Screen and add it again. The colour scheme, mode and icon are saved on this device only.
        </p>
      </div>
    </div>
  );
};
