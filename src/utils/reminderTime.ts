/** Formatting and presets for reminder times (local time). */

const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(/\s/g, ' ');

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

/** "Tonight, 10:00 pm", "Today, 2:00 pm", "Tomorrow, 9:00 am", "Mon, 9:00 am", "Dec 1, 9:00 am". */
export function formatReminder(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);
  if (days === 0) return `${d.getHours() >= 17 ? 'Tonight' : 'Today'}, ${time(d)}`;
  if (days === 1) return `Tomorrow, ${time(d)}`;
  if (days === -1) return `Yesterday, ${time(d)}`;
  if (days > 1 && days < 7) return `${d.toLocaleDateString([], { weekday: 'short' })}, ${time(d)}`;
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })}, ${time(d)}`;
}

export const isOverdue = (iso: string, now = Date.now()) => Date.parse(iso) < now;

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Parses a datetime-local value as local time; returns an ISO string or null. */
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Two quick choices: later today (9 pm, or in an hour once it's past 8 pm) and tomorrow at 9 am. */
export function reminderPresets(now = new Date()): { label: string; iso: string }[] {
  const later = new Date(now);
  if (now.getHours() < 20) later.setHours(21, 0, 0, 0);
  else { later.setMinutes(0, 0, 0); later.setHours(later.getHours() + 1); if (later.getTime() - now.getTime() < 30 * 60000) later.setHours(later.getHours() + 1); }
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  return [later, tomorrow].map((d) => ({ label: formatReminder(d.toISOString(), now), iso: d.toISOString() }));
}
