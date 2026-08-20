import { AccentTheme } from '../types';

export interface ThemeColorDef {
  id: AccentTheme;
  name: string;
  bg500: string;
  bgHover: string;
  textPrimary: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  ring: string;
  colorHex: string;
  darkAppBg: string;
  darkCardBg: string;
  activeTabBg: string;
}

export const ACCENT_THEMES: Record<AccentTheme, ThemeColorDef> = {
  blue: {
    id: 'blue',
    name: 'Royal Sapphire',
    bg500: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    textPrimary: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/80',
    badgeText: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-500 dark:border-blue-600',
    ring: 'focus:ring-blue-500',
    colorHex: '#2563EB',
    darkAppBg: 'dark:bg-stone-950',
    darkCardBg: 'dark:bg-stone-900 dark:border-stone-800',
    activeTabBg: 'bg-blue-600 text-white shadow-xs font-semibold',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    bg500: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    textPrimary: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-500 dark:border-emerald-600',
    ring: 'focus:ring-emerald-500',
    colorHex: '#059669',
    darkAppBg: 'dark:bg-stone-950',
    darkCardBg: 'dark:bg-stone-900 dark:border-stone-800',
    activeTabBg: 'bg-emerald-600 text-white shadow-xs font-semibold',
  },
  amber: {
    id: 'amber',
    name: 'Warm Amber',
    bg500: 'bg-amber-600',
    bgHover: 'hover:bg-amber-700',
    textPrimary: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-500 dark:border-amber-600',
    ring: 'focus:ring-amber-500',
    colorHex: '#D97706',
    darkAppBg: 'dark:bg-stone-950',
    darkCardBg: 'dark:bg-stone-900 dark:border-stone-800',
    activeTabBg: 'bg-amber-600 text-white shadow-xs font-semibold',
  },
  violet: {
    id: 'violet',
    name: 'Royal Violet',
    bg500: 'bg-violet-600',
    bgHover: 'hover:bg-violet-700',
    textPrimary: 'text-violet-600 dark:text-violet-400',
    badgeBg: 'bg-violet-100 dark:bg-violet-950/80',
    badgeText: 'text-violet-800 dark:text-violet-200',
    border: 'border-violet-500 dark:border-violet-600',
    ring: 'focus:ring-violet-500',
    colorHex: '#7C3AED',
    darkAppBg: 'dark:bg-stone-950',
    darkCardBg: 'dark:bg-stone-900 dark:border-stone-800',
    activeTabBg: 'bg-violet-600 text-white shadow-xs font-semibold',
  },
  rose: {
    id: 'rose',
    name: 'Rose Crimson',
    bg500: 'bg-rose-600',
    bgHover: 'hover:bg-rose-700',
    textPrimary: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/80',
    badgeText: 'text-rose-800 dark:text-rose-200',
    border: 'border-rose-500 dark:border-rose-600',
    ring: 'focus:ring-rose-500',
    colorHex: '#E11D48',
    darkAppBg: 'dark:bg-stone-950',
    darkCardBg: 'dark:bg-stone-900 dark:border-stone-800',
    activeTabBg: 'bg-rose-600 text-white shadow-xs font-semibold',
  },
};
