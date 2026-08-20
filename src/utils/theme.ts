import { AccentTheme } from '../types';

export interface ThemeColorDef {
  id: AccentTheme;
  name: string;
  bg500: string;
  bgHover: string;
  textPrimary: string;
  hoverText: string;
  groupHoverText: string;
  badgeBg: string;
  badgeText: string;
  tagBadge: string;
  iconBox: string;
  iconBoxHover: string;
  iconBoxSelected: string;
  bulletDot: string;
  buttonPrimary: string;
  border: string;
  hoverBorder: string;
  activeBorder: string;
  ring: string;
  colorHex: string;
  darkAppBg: string;
  darkCardBg: string;
  activeTabBg: string;
}

export const ACCENT_THEMES: Record<AccentTheme, ThemeColorDef> = {
  amber: {
    id: 'amber',
    name: 'Warm Amber',
    bg500: 'bg-amber-500',
    bgHover: 'hover:bg-amber-600',
    textPrimary: 'text-amber-600 dark:text-amber-400',
    hoverText: 'hover:text-amber-600 dark:hover:text-amber-400',
    groupHoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-200',
    tagBadge: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20',
    iconBox: 'bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400',
    iconBoxHover: 'group-hover:bg-amber-500/20 group-hover:text-amber-700 dark:group-hover:text-amber-300',
    iconBoxSelected: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-2xs',
    bulletDot: 'bg-amber-500 dark:bg-amber-400',
    buttonPrimary: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-xs',
    border: 'border-amber-500/40 dark:border-amber-400/30',
    hoverBorder: 'hover:border-amber-500/40 dark:hover:border-amber-400/30',
    activeBorder: 'border-amber-500/60 ring-1 ring-amber-500/40',
    ring: 'focus:ring-amber-500',
    colorHex: '#F59E0B',
    darkAppBg: 'dark:bg-[#0f0f11]',
    darkCardBg: 'dark:bg-[#18181b] dark:border-white/5',
    activeTabBg: 'bg-amber-500 text-white shadow-xs font-semibold',
  },
  blue: {
    id: 'blue',
    name: 'Royal Sapphire',
    bg500: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    textPrimary: 'text-blue-600 dark:text-blue-400',
    hoverText: 'hover:text-blue-600 dark:hover:text-blue-400',
    groupHoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/80',
    badgeText: 'text-blue-800 dark:text-blue-200',
    tagBadge: 'bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-400/20',
    iconBox: 'bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400',
    iconBoxHover: 'group-hover:bg-blue-500/20 group-hover:text-blue-700 dark:group-hover:text-blue-300',
    iconBoxSelected: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-2xs',
    bulletDot: 'bg-blue-500 dark:bg-blue-400',
    buttonPrimary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs',
    border: 'border-blue-500/40 dark:border-blue-400/30',
    hoverBorder: 'hover:border-blue-500/40 dark:hover:border-blue-400/30',
    activeBorder: 'border-blue-500/60 ring-1 ring-blue-500/40',
    ring: 'focus:ring-blue-500',
    colorHex: '#2563EB',
    darkAppBg: 'dark:bg-[#0f0f11]',
    darkCardBg: 'dark:bg-[#18181b] dark:border-white/5',
    activeTabBg: 'bg-blue-600 text-white shadow-xs font-semibold',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    bg500: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    textPrimary: 'text-emerald-600 dark:text-emerald-400',
    hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-400',
    groupHoverText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-200',
    tagBadge: 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-400/20',
    iconBox: 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400',
    iconBoxHover: 'group-hover:bg-emerald-500/20 group-hover:text-emerald-700 dark:group-hover:text-emerald-300',
    iconBoxSelected: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-2xs',
    bulletDot: 'bg-emerald-500 dark:bg-emerald-400',
    buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs',
    border: 'border-emerald-500/40 dark:border-emerald-400/30',
    hoverBorder: 'hover:border-emerald-500/40 dark:hover:border-emerald-400/30',
    activeBorder: 'border-emerald-500/60 ring-1 ring-emerald-500/40',
    ring: 'focus:ring-emerald-500',
    colorHex: '#059669',
    darkAppBg: 'dark:bg-[#0f0f11]',
    darkCardBg: 'dark:bg-[#18181b] dark:border-white/5',
    activeTabBg: 'bg-emerald-600 text-white shadow-xs font-semibold',
  },
  violet: {
    id: 'violet',
    name: 'Royal Violet',
    bg500: 'bg-violet-600',
    bgHover: 'hover:bg-violet-700',
    textPrimary: 'text-violet-600 dark:text-violet-400',
    hoverText: 'hover:text-violet-600 dark:hover:text-violet-400',
    groupHoverText: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    badgeBg: 'bg-violet-100 dark:bg-violet-950/80',
    badgeText: 'text-violet-800 dark:text-violet-200',
    tagBadge: 'bg-violet-500/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 dark:border-violet-400/20',
    iconBox: 'bg-violet-500/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400',
    iconBoxHover: 'group-hover:bg-violet-500/20 group-hover:text-violet-700 dark:group-hover:text-violet-300',
    iconBoxSelected: 'bg-violet-500/20 text-violet-600 dark:text-violet-400 shadow-2xs',
    bulletDot: 'bg-violet-500 dark:bg-violet-400',
    buttonPrimary: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white shadow-xs',
    border: 'border-violet-500/40 dark:border-violet-400/30',
    hoverBorder: 'hover:border-violet-500/40 dark:hover:border-violet-400/30',
    activeBorder: 'border-violet-500/60 ring-1 ring-violet-500/40',
    ring: 'focus:ring-violet-500',
    colorHex: '#7C3AED',
    darkAppBg: 'dark:bg-[#0f0f11]',
    darkCardBg: 'dark:bg-[#18181b] dark:border-white/5',
    activeTabBg: 'bg-violet-600 text-white shadow-xs font-semibold',
  },
  rose: {
    id: 'rose',
    name: 'Rose Crimson',
    bg500: 'bg-rose-600',
    bgHover: 'hover:bg-rose-700',
    textPrimary: 'text-rose-600 dark:text-rose-400',
    hoverText: 'hover:text-rose-600 dark:hover:text-rose-400',
    groupHoverText: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/80',
    badgeText: 'text-rose-800 dark:text-rose-200',
    tagBadge: 'bg-rose-500/10 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-400/20',
    iconBox: 'bg-rose-500/10 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400',
    iconBoxHover: 'group-hover:bg-rose-500/20 group-hover:text-rose-700 dark:group-hover:text-rose-300',
    iconBoxSelected: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 shadow-2xs',
    bulletDot: 'bg-rose-500 dark:bg-rose-400',
    buttonPrimary: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs',
    border: 'border-rose-500/40 dark:border-rose-400/30',
    hoverBorder: 'hover:border-rose-500/40 dark:hover:border-rose-400/30',
    activeBorder: 'border-rose-500/60 ring-1 ring-rose-500/40',
    ring: 'focus:ring-rose-500',
    colorHex: '#E11D48',
    darkAppBg: 'dark:bg-[#0f0f11]',
    darkCardBg: 'dark:bg-[#18181b] dark:border-white/5',
    activeTabBg: 'bg-rose-600 text-white shadow-xs font-semibold',
  },
};
