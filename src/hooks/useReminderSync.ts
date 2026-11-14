import { useEffect, useRef } from 'react';
import { useJournalStore } from '../store/useJournalStore';
import { startReminderSync } from '../lib/reminders';
import { checkCanEdit } from './usePermissions';

/**
 * Mirrors this journal's reminders to Firestore so the server can send their alarms.
 * Runs only for a signed-in owner or editor, and never while previewing as a guest.
 */
export function useReminderSync() {
  const user = useJournalStore((s) => s.currentUser);
  const previewGuest = useJournalStore((s) => s.previewGuest);
  const weeks = useJournalStore((s) => s.weeks);
  const syncRef = useRef<ReturnType<typeof startReminderSync> | null>(null);

  const active = !!user?.isLoggedIn && !!user.email && !previewGuest && checkCanEdit(user);

  useEffect(() => {
    if (!active) return;
    const sync = startReminderSync(user.email);
    syncRef.current = sync;
    sync.update(useJournalStore.getState().weeks);
    return () => { sync.stop(); syncRef.current = null; };
  }, [active, user?.email]);

  useEffect(() => { syncRef.current?.update(weeks); }, [weeks]);
}
