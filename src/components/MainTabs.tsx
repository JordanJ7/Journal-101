import { CalendarDays, Folder, Image as ImageIcon, MessageCircle } from 'lucide-react';
import React from 'react';
import { useJournalStore } from '../store/useJournalStore';
import type { ViewMode } from '../types';

/**
 * The four main places: Week, Topics, Session and Media. Session opens session prep;
 * Home (the overview) is still reachable from the navigation drawer and the sidebar.
 *   variant="bottom"  the phone tab bar
 *   variant="top"     the floating tab bar in the header on iPad and desktop
 */
const TABS: { key: 'weekly' | 'core' | 'session' | 'media'; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'weekly', label: 'Week', Icon: CalendarDays },
  { key: 'core', label: 'Topics', Icon: Folder },
  { key: 'session', label: 'Session', Icon: MessageCircle },
  { key: 'media', label: 'Media', Icon: ImageIcon },
];

export const MainTabs: React.FC<{ variant: 'bottom' | 'top'; viewMode: ViewMode; onSelect: (mode: ViewMode) => void }> = ({ variant, viewMode, onSelect }) => {
  const isSessionOpen = useJournalStore((s) => s.isSessionPrepOpen);
  const openSession = useJournalStore((s) => s.setIsSessionPrepOpen);

  const isActive = (key: (typeof TABS)[number]['key']) => (key === 'session' ? isSessionOpen : !isSessionOpen && viewMode === key);
  const select = (key: (typeof TABS)[number]['key']) => {
    if (key === 'session') openSession(true);
    else { openSession(false); onSelect(key); }
  };

  if (variant === 'top') {
    return (
      <nav aria-label="Main" className="flex items-center gap-0.5 p-1 rounded-full bg-(--j-chip) shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => select(key)}
            aria-current={isActive(key) ? 'page' : undefined}
            className={`min-h-[36px] px-3.5 lg:px-4 rounded-full text-[14px] font-semibold transition-colors ${
              isActive(key) ? 'bg-(--j-ground) text-(--j-ink) shadow-xs' : 'text-(--j-ink2) hover:text-(--j-ink)'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <>
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => select(key)}
          aria-current={isActive(key) ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
            isActive(key) ? 'text-(--j-ink) font-semibold' : 'text-(--j-ink2) hover:text-(--j-ink)'
          }`}
        >
          <Icon className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] tracking-tight">{label}</span>
        </button>
      ))}
    </>
  );
};
