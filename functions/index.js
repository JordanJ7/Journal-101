// Sends reminder alarms. Every minute, finds reminders whose time has come (mirrored into
// /reminders by the app, see src/lib/reminders.ts), claims each one so it is sent once, and
// pushes it to every device its owner turned alerts on for (/push_subscriptions).
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import webpush from 'web-push';

const DATABASE_ID = 'ai-studio-personaljournalt-bc0c2355-172c-45d5-90b0-ae6bddaf0d17';
const VAPID_PUBLIC_KEY = 'BOEQzYG55CldeS4i_k6ov4ygEZfsxLzpEG-vVePNLswj9wEPCic_rI4833g6W25F26D5VQqt0fxQOVMsq9VkVn4';
const VAPID_PRIVATE_KEY = defineSecret('VAPID_PRIVATE_KEY');
// Reminders more than this late (the function was down, the phone was set in the past) are skipped.
const MAX_LATENESS_MS = 6 * 60 * 60 * 1000;

const db = getFirestore(initializeApp(), DATABASE_ID);

export const sendDueReminders = onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'Etc/UTC', secrets: [VAPID_PRIVATE_KEY], retryCount: 0, memory: '256MiB', timeoutSeconds: 60 },
  async () => {
    webpush.setVapidDetails('https://gen-lang-client-0806083499.web.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.value());
    const now = Date.now();
    const due = await db.collection('reminders')
      .where('remindAtMs', '<=', now)
      .where('remindAtMs', '>', now - MAX_LATENESS_MS)
      .get();
    const pending = due.docs.filter((d) => !d.get('sentAt'));
    if (!pending.length) return;

    for (const snap of pending) {
      // Claim it, so an overlapping run can't send it twice.
      const claimed = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(snap.ref);
        if (!fresh.exists || fresh.get('sentAt')) return null;
        tx.update(snap.ref, { sentAt: FieldValue.serverTimestamp() });
        return fresh.data();
      });
      if (!claimed) continue;

      const email = String(claimed.email || '').toLowerCase();
      const subs = await db.collection('push_subscriptions').where('email', '==', email).get();
      const payload = JSON.stringify({ title: 'Journal', body: claimed.text || 'Reminder', tag: snap.id, url: '/' });
      let sent = 0;
      await Promise.all(subs.docs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.get('endpoint'), keys: s.get('keys') }, payload, { TTL: 60 * 60, urgency: 'high' });
          sent++;
        } catch (err) {
          // 404/410: the device unsubscribed or the app was removed; forget it.
          if (err?.statusCode === 404 || err?.statusCode === 410) await s.ref.delete();
          else logger.warn('push failed', { reminder: snap.id, status: err?.statusCode, body: err?.body });
        }
      }));
      logger.info('reminder sent', { reminder: snap.id, devices: sent, of: subs.size });
    }
  }
);
