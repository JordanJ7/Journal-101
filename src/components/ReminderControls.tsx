import { Bell, BellOff, BellRing, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AlertStatus, disableAlerts, enableAlerts, getAlertStatus } from '../lib/reminders';
import { useJournalStore } from '../store/useJournalStore';
import { formatReminder, fromLocalInput, isOverdue, reminderPresets, toLocalInput } from '../utils/reminderTime';

/** The bell tag on a reminder entry: its time, marked when it has passed. */
export const ReminderChip: React.FC<{ iso: string; completed?: boolean }> = ({ iso, completed }) => {
  const overdue = !completed && isOverdue(iso);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-fit border ${
        completed
          ? 'text-stone-500 dark:text-stone-400 bg-black/5 dark:bg-white/5 border-transparent line-through'
          : overdue
            ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
            : 'text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60'
      }`}
      title={new Date(iso).toLocaleString()}
    >
      <Bell className="w-3 h-3 shrink-0" />
      {formatReminder(iso)}
    </span>
  );
};

/** Hook: this device's alert status, refreshed when the app regains focus. */
export function useAlertStatus() {
  const [status, setStatus] = useState<AlertStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const refresh = () => getAlertStatus().then((s) => alive && setStatus(s)).catch(() => alive && setStatus('unsupported'));
    refresh();
    window.addEventListener('focus', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); };
  }, []);
  return [status, setStatus] as const;
}

const STATUS_HELP: Record<AlertStatus, string> = {
  on: 'Alerts are on for this device.',
  off: 'Turn on alerts so reminders ring on this device.',
  blocked: 'Notifications are blocked for Journal. Allow them in Settings › Notifications › Journal.',
  'needs-install': 'To get alerts on iPhone or iPad, add Journal to your Home Screen (Share › Add to Home Screen) and open it from there.',
  unsupported: 'This browser can’t show reminder alerts.',
};

/** Turn alerts on or off for this device. Must be tapped: iOS only asks for permission after a tap. */
export const AlertsButton: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const email = useJournalStore((s) => s.currentUser.email);
  const showToast = useJournalStore((s) => s.showToast);
  const [status, setStatus] = useAlertStatus();
  const [busy, setBusy] = useState(false);
  if (!status) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (status === 'on') { await disableAlerts(); setStatus('off'); showToast('Alerts turned off on this device'); }
      else {
        const next = await enableAlerts(email);
        setStatus(next);
        showToast(next === 'on' ? 'Alerts are on. Reminders will ring on this device.' : STATUS_HELP[next]);
      }
    } catch (e) {
      console.error('[Reminders] could not change alerts:', e);
      showToast('Couldn’t turn on alerts. Try again in a moment.');
    } finally { setBusy(false); }
  };

  const canToggle = status === 'on' || status === 'off';
  const Icon = status === 'on' ? BellRing : status === 'off' ? Bell : BellOff;
  if (compact && status === 'on') return null;
  return (
    <div className="flex items-start gap-2 text-[11px] text-stone-600 dark:text-stone-300">
      {canToggle ? (
        <button
          type="button"
          disabled={busy}
          onClick={toggle}
          className="min-h-[32px] px-2.5 rounded-lg border border-black/10 dark:border-white/15 font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-60 shrink-0"
        >
          <Icon className="w-3.5 h-3.5" />
          {status === 'on' ? 'Turn off alerts' : 'Turn on alerts'}
        </button>
      ) : (
        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      )}
      {(!canToggle || !compact) && <span className="pt-1.5">{STATUS_HELP[status]}</span>}
    </div>
  );
};

/** Inline picker: two quick times, any date and time, and clear. */
export const ReminderPicker: React.FC<{ value: string | null; onChange: (iso: string | null) => void; showAlerts?: boolean }> = ({ value, onChange, showAlerts = true }) => {
  const presets = reminderPresets();
  return (
    <div className="space-y-1.5 px-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.iso)}
            className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-semibold border transition-colors ${
              value && Math.abs(Date.parse(value) - Date.parse(p.iso)) < 60000
                ? 'bg-amber-500 text-[var(--on-accent,var(--color-stone-950))] border-amber-500'
                : 'border-black/10 dark:border-white/15 text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
        <input
          type="datetime-local"
          aria-label="Reminder date and time"
          value={value ? toLocalInput(new Date(value)) : ''}
          onChange={(e) => onChange(fromLocalInput(e.target.value))}
          className="min-h-[32px] px-2 rounded-lg text-[12px] border border-black/10 dark:border-white/15 bg-white dark:bg-(--sf-raised-dk) text-stone-800 dark:text-stone-100"
        />
        {value && (
          <button type="button" onClick={() => onChange(null)} className="min-h-[32px] px-2 rounded-lg text-[11px] font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
      {showAlerts && <AlertsButton compact />}
    </div>
  );
};
