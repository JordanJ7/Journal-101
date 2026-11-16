/**
 * The redesigned week screen's parts (design/journal-redesign, layout "the log"):
 * the week strip, a log row per entry, and the session panel. Colours come from the --j-*
 * scheme tokens (src/utils/schemes.ts).
 */
import { ArrowRight, Bell, ChevronRight, Image as ImageIcon, MessageSquare, Pin } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useJournalStore } from '../../store/useJournalStore';
import type { BulletPoint, WeeklyBlock } from '../../types';
import { parseDateFromTimestamp } from '../../utils/storage';
import { formatReminder, fromLocalInput, isOverdue, toLocalInput } from '../../utils/reminderTime';
import { usePermissions } from '../../hooks/usePermissions';
import { HighlightText } from '../HighlightText';

export function entryDate(b: BulletPoint): Date {
  return b.isoDate ? new Date(b.isoDate) : parseDateFromTimestamp(b.timestamp);
}

function weekStart(week: WeeklyBlock): Date {
  const [y, m, d] = (week.startDate || '').split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  const first = (week.bullets || []).map(entryDate).sort((a, b) => a.getTime() - b.getTime())[0] || new Date();
  const s = new Date(first); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Seven bars, one per day, sized by how much was written; today in the accent. */
export const WeekStrip: React.FC<{ week: WeeklyBlock; bullets: BulletPoint[] }> = ({ week, bullets }) => {
  const { sizes, todayIdx } = useMemo(() => {
    const start = weekStart(week).getTime();
    const sums = [0, 0, 0, 0, 0, 0, 0];
    for (const b of bullets) {
      const i = Math.floor((entryDate(b).getTime() - start) / 86400000);
      if (i >= 0 && i < 7) sums[i] += Math.max(20, (b.text || '').length);
    }
    const max = Math.max(...sums, 1);
    const now = new Date(); now.setHours(12, 0, 0, 0);
    const t = Math.floor((now.getTime() - start) / 86400000);
    return { sizes: sums.map((s) => (s ? 0.12 + 0.88 * (s / max) : 0)), todayIdx: t >= 0 && t < 7 ? t : -1 };
  }, [week, bullets]);

  return (
    <div className="grid grid-cols-7 gap-2 items-end h-[72px] sm:h-[84px] pb-1.5 border-b border-(--j-line)" aria-hidden="true">
      {sizes.map((s, i) => (
        <div key={i} className="flex flex-col items-center justify-end gap-1.5 h-full">
          <i
            className="block w-full rounded-[3px]"
            style={{
              height: s ? `${Math.round(s * 100)}%` : i === todayIdx ? '4px' : '3px',
              maxHeight: 'calc(100% - 20px)',
              background: i === todayIdx ? 'var(--j-today)' : 'var(--j-bar)',
              opacity: !s && i !== todayIdx ? 0.5 : 1,
            }}
          />
          <b className={`text-[12px] leading-[14px] font-semibold ${i === todayIdx ? 'text-(--j-ink)' : 'text-(--j-ink2)'}`}>{DAY_LETTERS[i]}</b>
        </div>
      ))}
    </div>
  );
};

/** One entry as a log row: time and day on the left, the text, and its tags. Tap to open it. */
export const LogRow: React.FC<{
  bullet: BulletPoint;
  expanded: boolean;
  onToggle: () => void;
  onToggleComplete?: () => void;
  searchQuery?: string;
  /** Just written: the row slides in so you can see where it went. */
  isNew?: boolean;
  children?: React.ReactNode;
}> = ({ bullet, expanded, onToggle, onToggleComplete, searchQuery, isNew, children }) => {
  const d = entryDate(bullet);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  const day = d.toLocaleDateString([], { weekday: 'short' });
  const isTodo = !!bullet.remindAt || bullet.completed === true;
  const media = (bullet.attachments?.length || 0) + (bullet.mediaUrl ? 1 : 0);

  return (
    <div className={`border-b border-(--j-line) ${expanded ? 'pb-3' : ''} ${isNew ? 'animate-in fade-in slide-in-from-top-2 duration-500' : ''}`} style={{ paddingLeft: (bullet.indent || 0) * 18 }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="grid grid-cols-[76px_1fr] sm:grid-cols-[84px_1fr] gap-x-3 py-3.5 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-(--j-tag) rounded-md"
      >
        <span className="text-[15px] leading-6 font-semibold tabular-nums text-(--j-ink2) whitespace-nowrap">
          {time}
          <small className="block text-[12px] leading-[14px] font-medium">{day}</small>
        </span>
        <div className="min-w-0">
          <div className="flex gap-2.5">
            {isTodo && (
              <button
                type="button"
                aria-label={bullet.completed ? 'Mark not done' : 'Mark done'}
                onClick={(e) => { e.stopPropagation(); onToggleComplete?.(); }}
                className={`m-press shrink-0 mt-[3px] w-[18px] h-[18px] rounded-[5px] border-[1.6px] border-current grid place-items-center ${bullet.completed ? 'bg-(--j-ink) text-(--j-ground)' : ''}`}
              >
                {bullet.completed && <svg viewBox="0 0 24 24" className="m-tick w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
              </button>
            )}
            <p className={`m-0 text-[17px] leading-[25px] whitespace-pre-wrap break-words ${bullet.completed ? 'line-through opacity-60' : ''} ${bullet.isAnswerHighlight ? 'font-medium' : ''}`}>
              <HighlightText text={bullet.text} highlight={searchQuery || ''} />
            </p>
          </div>
          {(bullet.remindAt || bullet.forSession || bullet.isAnswerHighlight || bullet.pinnedToLearned || media > 0) && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[13px] leading-4 font-semibold">
              {bullet.remindAt && (
                <span className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-full ${!bullet.completed && isOverdue(bullet.remindAt) ? 'bg-red-500/15 text-red-600 dark:text-red-300' : 'bg-(--j-chip) text-(--j-tag)'}`}>
                  <Bell className="w-3.5 h-3.5" />{formatReminder(bullet.remindAt)}
                </span>
              )}
              {bullet.forSession && (
                <span className="inline-flex items-center gap-1 text-(--j-tag)"><ArrowRight className="w-3.5 h-3.5" />{bullet.discussedAt ? 'Discussed' : 'For session'}</span>
              )}
              {bullet.isAnswerHighlight && <span className="inline-flex items-center gap-1 text-(--j-tag)"><MessageSquare className="w-3.5 h-3.5" />Highlight</span>}
              {bullet.pinnedToLearned && <span className="inline-flex items-center gap-1 text-(--j-ink2)"><Pin className="w-3.5 h-3.5" />Learned</span>}
              {media > 0 && <span className="inline-flex items-center gap-1 text-(--j-ink2)"><ImageIcon className="w-3.5 h-3.5" />{media}</span>}
            </div>
          )}
        </div>
      </div>
      {expanded && <div className="mt-1 animate-in fade-in duration-200">{children}</div>}
    </div>
  );
};

/** Right-hand panel: the next session, what to bring up, and upcoming reminders. */
export const SessionPanel: React.FC = () => {
  const nextSessionAt = useJournalStore((s) => s.nextSessionAt);
  const weeks = useJournalStore((s) => s.weeks);
  const openPrep = useJournalStore((s) => s.setIsSessionPrepOpen);
  const setNextSessionAt = useJournalStore((s) => s.setNextSessionAt);
  const { isOwner } = usePermissions();
  const [editing, setEditing] = useState(false);

  const { bringUp, reminders } = useMemo(() => {
    const all = weeks.filter((w) => !w.deletedAt).flatMap((w) => (w.bullets || []).filter((b) => !b.deletedAt));
    const bringUp = all.filter((b) => b.forSession && !b.discussedAt).slice(-4);
    const now = Date.now();
    const reminders = all
      .filter((b) => b.remindAt && !b.completed && Date.parse(b.remindAt) > now - 86400000)
      .sort((a, b) => Date.parse(a.remindAt!) - Date.parse(b.remindAt!))
      .slice(0, 5);
    return { bringUp, reminders };
  }, [weeks]);

  const session = nextSessionAt ? new Date(nextSessionAt) : null;
  const days = session ? Math.ceil((new Date(session).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
  const heading = session && days !== null && days >= 0
    ? days === 0 ? 'Session today' : days === 1 ? 'Session tomorrow' : `${days} days to session`
    : 'Next session';

  return (
    <section className="text-(--j-ink)">
      <p className="text-[13px] leading-4 font-semibold text-(--j-ink2)">
        {session ? session.toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled yet'}
      </p>
      <h2 className="j-display text-[34px] sm:text-[40px] leading-[1.1] mt-1.5 mb-1">{heading}</h2>
      <div className="flex flex-wrap items-center gap-x-5">
        <button type="button" onClick={() => openPrep(true)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-(--j-tag) min-h-[44px]">
          Open session prep <ChevronRight className="w-4 h-4" />
        </button>
        {isOwner && (
          <button type="button" onClick={() => setEditing(!editing)} className="text-[13px] font-semibold text-(--j-ink2) hover:text-(--j-ink) min-h-[44px]">
            {session ? 'Change' : 'Set date'}
          </button>
        )}
      </div>
      {editing && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <input
            type="datetime-local"
            aria-label="Next session date and time"
            defaultValue={session ? toLocalInput(session) : ''}
            onChange={(e) => { const iso = fromLocalInput(e.target.value); if (iso) setNextSessionAt(iso); }}
            className="min-h-[36px] px-2 rounded-lg text-[14px] bg-(--j-field) border border-(--j-fieldline) text-(--j-ink)"
          />
          {session && (
            <button type="button" onClick={() => { setNextSessionAt(null); setEditing(false); }} className="text-[13px] font-semibold text-(--j-ink2) min-h-[36px]">Clear</button>
          )}
          <button type="button" onClick={() => setEditing(false)} className="text-[13px] font-semibold text-(--j-tag) min-h-[36px]">Done</button>
        </div>
      )}

      <h3 className="text-[13px] font-semibold text-(--j-ink2) mt-5 mb-0.5">Bringing up</h3>
      {bringUp.length ? bringUp.map((b) => (
        <p key={b.id} className="py-3 border-b border-(--j-line) text-[16px] leading-[22px] m-0">{b.text}</p>
      )) : <p className="py-3 text-[15px] text-(--j-ink2) m-0">Tag an entry “For session” to bring it up here.</p>}

      <h3 className="text-[13px] font-semibold text-(--j-ink2) mt-6 mb-0.5">Reminders</h3>
      {reminders.length ? reminders.map((b) => (
        <div key={b.id} className="py-3 border-b border-(--j-line) grid grid-cols-[1fr_auto] gap-3 text-[16px] leading-[22px]">
          <span className="min-w-0 break-words">{b.text}</span>
          <span className={`text-[13px] font-semibold whitespace-nowrap ${isOverdue(b.remindAt!) ? 'text-red-600 dark:text-red-300' : 'text-(--j-tag)'}`}>{formatReminder(b.remindAt!)}</span>
        </div>
      )) : <p className="py-3 text-[15px] text-(--j-ink2) m-0">No reminders coming up.</p>}
    </section>
  );
};
