import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useTheme, useAccentTheme } from '../store/useJournalStore';
import { AccentTheme } from '../types';

interface EntranceOverlayProps {
  forcePlay?: boolean;
  onDismiss?: () => void;
}

export type FontPersonality = 'serif' | 'sans' | 'grotesk' | 'display' | 'mono';

const ALL_FONTS: FontPersonality[] = ['serif', 'sans', 'grotesk', 'display', 'mono'];

const getRandomFont = (exclude?: FontPersonality): FontPersonality => {
  const available = exclude ? ALL_FONTS.filter((f) => f !== exclude) : ALL_FONTS;
  return available[Math.floor(Math.random() * available.length)] || 'serif';
};

const FULL_QUOTE = 'Love Is A Catalyst for Change';
const ATTRIBUTION = '— Me';
const TYPING_INTERVAL_MS = 30; // Fast 30ms typing cadence
const READING_PAUSE_MS = 2100; // 2100ms post-typing reading pause

interface ThemeColorTokens {
  glowDark: string;
  glowLight: string;
  cursorDark: string;
  cursorLight: string;
  sparkleDark: string;
  sparkleLight: string;
  activePillDark: string;
  activePillLight: string;
  skipHoverDark: string;
  skipHoverLight: string;
}

const THEME_COLOR_MAP: Record<AccentTheme, ThemeColorTokens> = {
  amber: {
    glowDark: 'rgba(245,158,11,0.09)',
    glowLight: 'rgba(245,158,11,0.12)',
    cursorDark: 'bg-amber-400',
    cursorLight: 'bg-amber-500',
    sparkleDark: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    sparkleLight: 'text-amber-600 bg-amber-500/10 border-amber-500/25',
    activePillDark: 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-xs font-semibold',
    activePillLight: 'bg-amber-500 text-white shadow-xs font-semibold',
    skipHoverDark: 'hover:border-amber-400/40 hover:text-amber-300',
    skipHoverLight: 'hover:border-amber-500/40 hover:text-amber-700',
  },
  blue: {
    glowDark: 'rgba(37,99,235,0.09)',
    glowLight: 'rgba(37,99,235,0.12)',
    cursorDark: 'bg-blue-400',
    cursorLight: 'bg-blue-600',
    sparkleDark: 'text-blue-400 bg-blue-400/10 border-blue-400/25',
    sparkleLight: 'text-blue-600 bg-blue-500/10 border-blue-500/25',
    activePillDark: 'bg-blue-500/20 text-blue-300 border-blue-400/40 shadow-xs font-semibold',
    activePillLight: 'bg-blue-600 text-white shadow-xs font-semibold',
    skipHoverDark: 'hover:border-blue-400/40 hover:text-blue-300',
    skipHoverLight: 'hover:border-blue-500/40 hover:text-blue-700',
  },
  emerald: {
    glowDark: 'rgba(5,150,105,0.09)',
    glowLight: 'rgba(5,150,105,0.12)',
    cursorDark: 'bg-emerald-400',
    cursorLight: 'bg-emerald-600',
    sparkleDark: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
    sparkleLight: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/25',
    activePillDark: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-xs font-semibold',
    activePillLight: 'bg-emerald-600 text-white shadow-xs font-semibold',
    skipHoverDark: 'hover:border-emerald-400/40 hover:text-emerald-300',
    skipHoverLight: 'hover:border-emerald-500/40 hover:text-emerald-700',
  },
  violet: {
    glowDark: 'rgba(124,58,237,0.09)',
    glowLight: 'rgba(124,58,237,0.12)',
    cursorDark: 'bg-violet-400',
    cursorLight: 'bg-violet-600',
    sparkleDark: 'text-violet-400 bg-violet-400/10 border-violet-400/25',
    sparkleLight: 'text-violet-600 bg-violet-500/10 border-violet-500/25',
    activePillDark: 'bg-violet-500/20 text-violet-300 border-violet-400/40 shadow-xs font-semibold',
    activePillLight: 'bg-violet-600 text-white shadow-xs font-semibold',
    skipHoverDark: 'hover:border-violet-400/40 hover:text-violet-300',
    skipHoverLight: 'hover:border-violet-500/40 hover:text-violet-700',
  },
  rose: {
    glowDark: 'rgba(225,29,72,0.09)',
    glowLight: 'rgba(225,29,72,0.12)',
    cursorDark: 'bg-rose-400',
    cursorLight: 'bg-rose-600',
    sparkleDark: 'text-rose-400 bg-rose-400/10 border-rose-400/25',
    sparkleLight: 'text-rose-600 bg-rose-500/10 border-rose-500/25',
    activePillDark: 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-xs font-semibold',
    activePillLight: 'bg-rose-600 text-white shadow-xs font-semibold',
    skipHoverDark: 'hover:border-rose-400/40 hover:text-rose-300',
    skipHoverLight: 'hover:border-rose-500/40 hover:text-rose-700',
  },
};

export const EntranceOverlay: React.FC<EntranceOverlayProps> = ({
  forcePlay = false,
  onDismiss,
}) => {
  const theme = useTheme(); // 'dark' | 'light' (defaults to 'dark')
  const accentTheme = useAccentTheme(); // 'amber' | 'blue' | 'emerald' | 'violet' | 'rose' (defaults to 'amber')

  const [isVisible, setIsVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);
  const [displayedQuote, setDisplayedQuote] = useState('');
  const [showAttribution, setShowAttribution] = useState(false);
  const [selectedFont, setSelectedFont] = useState<FontPersonality>(() => getRandomFont());
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = useRef(0);

  const isDark = theme !== 'light';
  const tokens = THEME_COLOR_MAP[accentTheme] || THEME_COLOR_MAP.amber;

  // Always show on mount / refresh & listen for manual replay events
  useEffect(() => {
    setIsVisible(true);
    setIsDismissing(false);
    setSelectedFont(getRandomFont());

    const handleReplayEvent = () => {
      setIsDismissing(false);
      setIsVisible(true);
      setSelectedFont((prev) => getRandomFont(prev));
    };

    window.addEventListener('replay-intro', handleReplayEvent);
    return () => {
      window.removeEventListener('replay-intro', handleReplayEvent);
    };
  }, [forcePlay]);

  const handleDismiss = useCallback(() => {
    if (isDismissing) return;
    setIsDismissing(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    // Wait for the 600ms fade transition before unmounting
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 600);
  }, [isDismissing, onDismiss]);

  // Start typing sequence when visible
  useEffect(() => {
    if (!isVisible || isDismissing) return;

    charIndexRef.current = 0;
    setDisplayedQuote('');
    setShowAttribution(false);
    setIsTypingComplete(false);

    const typeNextChar = () => {
      if (charIndexRef.current < FULL_QUOTE.length) {
        charIndexRef.current += 1;
        setDisplayedQuote(FULL_QUOTE.slice(0, charIndexRef.current));
        timerRef.current = setTimeout(typeNextChar, TYPING_INTERVAL_MS);
      } else {
        // Quote finished typing
        setIsTypingComplete(true);
        // Brief pause before showing attribution
        timerRef.current = setTimeout(() => {
          setShowAttribution(true);
          // Post-typing reading pause before auto-dismissing
          dismissTimerRef.current = setTimeout(() => {
            handleDismiss();
          }, READING_PAUSE_MS);
        }, 200);
      }
    };

    // Initial subtle delay before typing starts
    timerRef.current = setTimeout(typeNextChar, 180);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [isVisible, isDismissing, handleDismiss]);

  if (!isVisible) return null;

  // Font family class helper with expanded 5-font typography roster
  const getFontFamilyClass = () => {
    switch (selectedFont) {
      case 'serif':
        return 'font-serif tracking-normal';
      case 'sans':
        return 'font-["Plus_Jakarta_Sans",_sans-serif] tracking-wide';
      case 'grotesk':
        return 'font-["Space_Grotesk",_sans-serif] tracking-tight';
      case 'display':
        return 'font-["Cinzel",_serif] tracking-widest uppercase font-medium text-lg sm:text-xl md:text-2xl';
      case 'mono':
        return 'font-mono tracking-tight text-lg md:text-xl';
    }
  };

  const glowColor = isDark ? tokens.glowDark : tokens.glowLight;

  return (
    <div
      id="entrance-overlay"
      role="region"
      aria-label="Welcome Quote"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center select-none transition-all duration-600 ease-out ${
        isDismissing
          ? 'bg-transparent opacity-0 pointer-events-none'
          : isDark
          ? 'bg-[#0f0f11] opacity-100 text-neutral-100'
          : 'bg-[#f8f9fa] opacity-100 text-neutral-900'
      }`}
    >
      {/* Ambient subtle dynamic vignette / radiant depth based on theme */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* Top Bar: Skip Button */}
      <header className="absolute top-0 right-0 p-5 sm:p-7 z-10">
        <button
          type="button"
          onClick={handleDismiss}
          className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer shadow-xs active:scale-95 border ${
            isDark
              ? `text-neutral-400 hover:text-neutral-100 bg-white/5 hover:bg-white/10 border-white/10 ${tokens.skipHoverDark}`
              : `text-neutral-600 hover:text-neutral-900 bg-black/5 hover:bg-black/10 border-neutral-300/70 ${tokens.skipHoverLight}`
          }`}
          title="Skip intro and open journal immediately"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </header>

      {/* Main Center Container */}
      <main className="relative z-10 flex flex-col items-center justify-center max-w-xl mx-auto px-6 py-12 text-center">
        {/* Decorative sparkle themed badge */}
        <div
          className={`mb-5 inline-flex items-center justify-center w-9 h-9 rounded-full border shadow-xs animate-in fade-in duration-300 transition-colors ${
            isDark ? tokens.sparkleDark : tokens.sparkleLight
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </div>

        {/* The Animated Quote */}
        <div className="min-h-[72px] sm:min-h-[84px] flex items-center justify-center">
          <h1
            className={`text-xl sm:text-2xl md:text-3xl font-light leading-relaxed drop-shadow-xs transition-all duration-200 ${
              isDark ? 'text-neutral-100' : 'text-neutral-900'
            } ${getFontFamilyClass()}`}
          >
            “{displayedQuote}”
            {/* Blinking Typewriter Cursor matching theme color */}
            <span
              className={`inline-block w-0.5 h-5 sm:h-6 md:h-7 ml-1.5 align-middle rounded-full ${
                isDark ? tokens.cursorDark : tokens.cursorLight
              } ${isTypingComplete ? 'animate-pulse' : 'opacity-100'}`}
              aria-hidden="true"
            />
          </h1>
        </div>

        {/* Attribution with smooth fade-in */}
        <div
          className={`transition-all duration-500 ease-out mt-4 sm:mt-5 ${
            showAttribution ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <span
            className={`text-xs uppercase tracking-[0.25em] font-medium ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            {ATTRIBUTION}
          </span>
        </div>
      </main>

      {/* Bottom Bar: Curated 5-Font Typography Roster */}
      <footer className="absolute bottom-6 inset-x-0 z-10 flex flex-col items-center gap-2 px-4">
        <div
          className={`flex flex-wrap justify-center items-center gap-1 p-1 rounded-2xl sm:rounded-full border shadow-xs max-w-[95vw] transition-colors ${
            isDark ? 'bg-[#18181b] border-white/10' : 'bg-stone-100 border-neutral-300/70'
          }`}
        >
          <button
            type="button"
            onClick={() => setSelectedFont('serif')}
            className={`px-3 py-1 rounded-xl sm:rounded-full text-xs font-serif transition-all ${
              selectedFont === 'serif'
                ? isDark
                  ? tokens.activePillDark
                  : tokens.activePillLight
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Editorial Serif
          </button>
          <button
            type="button"
            onClick={() => setSelectedFont('sans')}
            className={`px-3 py-1 rounded-xl sm:rounded-full text-xs font-sans transition-all ${
              selectedFont === 'sans'
                ? isDark
                  ? tokens.activePillDark
                  : tokens.activePillLight
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Jakarta Sans
          </button>
          <button
            type="button"
            onClick={() => setSelectedFont('grotesk')}
            className={`px-3 py-1 rounded-xl sm:rounded-full text-xs font-['Space_Grotesk',_sans-serif] transition-all ${
              selectedFont === 'grotesk'
                ? isDark
                  ? tokens.activePillDark
                  : tokens.activePillLight
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Neo Grotesk
          </button>
          <button
            type="button"
            onClick={() => setSelectedFont('display')}
            className={`px-3 py-1 rounded-xl sm:rounded-full text-xs font-['Cinzel',_serif] transition-all ${
              selectedFont === 'display'
                ? isDark
                  ? tokens.activePillDark
                  : tokens.activePillLight
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Display
          </button>
          <button
            type="button"
            onClick={() => setSelectedFont('mono')}
            className={`px-3 py-1 rounded-xl sm:rounded-full text-xs font-mono transition-all ${
              selectedFont === 'mono'
                ? isDark
                  ? tokens.activePillDark
                  : tokens.activePillLight
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Monospace
          </button>
        </div>
      </footer>
    </div>
  );
};
