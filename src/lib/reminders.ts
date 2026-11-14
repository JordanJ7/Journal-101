/**
 * Reminder alarms.
 *
 * An entry with `remindAt` is a reminder. So the alarm can fire while the app is closed, each
 * active reminder is mirrored into /reminders/{bulletId}_{remindAtMs}; a scheduled Cloud Function
 * (functions/index.js) checks that collection every minute and sends a Web Push notification to
 * every device the person turned alerts on for (/push_subscriptions).
 *
 * The mirror is reconciled from the weeks in the store, never edited by hand: a reminder that is
 * completed, deleted, cleared or moved to a new time loses its doc, and a changed time gets a
 * new doc id (so the server's `sentAt` on the old one can't suppress the new alarm).
 */
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getHasReceivedFirstFirestoreSnapshot } from '../utils/storage';
import type { WeeklyBlock } from '../types';

export const VAPID_PUBLIC_KEY = 'BOEQzYG55CldeS4i_k6ov4ygEZfsxLzpEG-vVePNLswj9wEPCic_rI4833g6W25F26D5VQqt0fxQOVMsq9VkVn4';

// ---------- Alerts on this device ----------

export type AlertStatus = 'unsupported' | 'needs-install' | 'off' | 'on' | 'blocked';

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export async function getAlertStatus(): Promise<AlertStatus> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // iOS only exposes Web Push to Home Screen apps.
    return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function subscriptionId(endpoint: string): Promise<string> {
  const bytes = new TextEncoder().encode(endpoint);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

/**
 * Turns on reminder alerts for this device. Must be called from a tap (iOS asks for permission
 * only in response to a user gesture). Returns the resulting status.
 */
export async function enableAlerts(email: string): Promise<AlertStatus> {
  const status = await getAlertStatus();
  if (status === 'unsupported' || status === 'needs-install' || status === 'blocked') return status;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';

  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON();
  await setDoc(doc(db, 'push_subscriptions', await subscriptionId(sub.endpoint)), {
    email: email.toLowerCase(),
    endpoint: sub.endpoint,
    keys: json.keys,
    userAgent: navigator.userAgent.slice(0, 200),
    createdAt: serverTimestamp(),
  });
  return 'on';
}

/** Turns alerts off for this device and removes its subscription doc. */
export async function disableAlerts(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await deleteDoc(doc(db, 'push_subscriptions', await subscriptionId(sub.endpoint))).catch(() => {});
  await sub.unsubscribe();
}

// ---------- Mirroring reminders for the server ----------

interface ReminderDoc {
  bulletId: string;
  weekId: string;
  text: string;
  remindAt: string;
  remindAtMs: number;
  email: string;
}

/** The reminders the weeks say should exist, keyed by doc id. */
export function desiredReminders(weeks: WeeklyBlock[], email: string): Map<string, ReminderDoc> {
  const out = new Map<string, ReminderDoc>();
  for (const w of weeks) {
    if (w.deletedAt) continue;
    for (const b of w.bullets || []) {
      if (!b.remindAt || b.completed || b.deletedAt) continue;
      const ms = Date.parse(b.remindAt);
      if (!Number.isFinite(ms)) continue;
      out.set(`${b.id}_${ms}`, {
        bulletId: b.id,
        weekId: w.id,
        text: (b.text || '').replace(/\s+/g, ' ').trim().slice(0, 180) || 'Reminder',
        remindAt: new Date(ms).toISOString(),
        remindAtMs: ms,
        email: email.toLowerCase(),
      });
    }
  }
  return out;
}

/**
 * Keeps /reminders in step with the weeks. Call `update(weeks)` whenever weeks change; it waits
 * for the first server snapshot (so stale local data never deletes real reminders) and debounces.
 */
export function startReminderSync(email: string) {
  let existing: Map<string, Partial<ReminderDoc>> | null = null;
  let latest: WeeklyBlock[] | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const unsub = onSnapshot(
    collection(db, 'reminders'),
    (snap) => {
      existing = new Map(snap.docs.map((d) => [d.id, d.data() as Partial<ReminderDoc>]));
      schedule();
    },
    (err) => console.warn('[Reminders] listener error:', err)
  );

  const reconcile = async () => {
    if (!existing || !latest || !getHasReceivedFirstFirestoreSnapshot()) return;
    const want = desiredReminders(latest, email);
    const writes: Promise<unknown>[] = [];
    for (const [id, r] of want) {
      const have = existing.get(id);
      if (!have || have.text !== r.text || have.weekId !== r.weekId) {
        // Merge, so the server's sentAt survives a text edit.
        writes.push(setDoc(doc(db, 'reminders', id), { ...r, email: have?.email || r.email, updatedAt: serverTimestamp() }, { merge: true }));
      }
    }
    for (const id of existing.keys()) {
      if (!want.has(id)) writes.push(deleteDoc(doc(db, 'reminders', id)));
    }
    const results = await Promise.allSettled(writes);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) console.warn(`[Reminders] ${failed.length} sync write(s) failed`, failed);
  };

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => { reconcile().catch((e) => console.warn('[Reminders] sync failed:', e)); }, 1200);
  }

  return {
    update(weeks: WeeklyBlock[]) { latest = weeks; schedule(); },
    stop() { clearTimeout(timer); unsub(); },
  };
}
