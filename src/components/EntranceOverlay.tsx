import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme, useAccentTheme, useIntroQuotes, useJournalStore } from '../store/useJournalStore';
import { AccentTheme } from '../types';
import { loadAppState } from '../utils/storage';

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

export const DEFAULT_INTRO_QUOTE = 'Love Is A Catalyst for Change';
const ATTRIBUTION = '— Me';
const FIXED_TYPING_DURATION_MS = 1800; // Fixed ~1.8 seconds typing duration
const INITIAL_DELAY_MS = 180; // Initial subtle delay before typing starts
const ATTRIBUTION_PAUSE_MS = 200; // Brief pause before showing attribution
const READING_PAUSE_MS = 2100; // 2100ms post-typing reading pause
const FADE_OUT_DURATION_MS = 600; // 600ms fade transition

/**
 * Select a random quote from the provided quotes array,
 * falling back to DEFAULT_INTRO_QUOTE if empty or invalid.
 */
export const pickRandomQuote = (quotes?: string[], exclude?: string): string => {
  const valid = (quotes || [])
    .map((q) => (typeof q === 'string' ? q.trim() : ''))
    .filter((q) => q.length > 0);

  if (valid.length === 0) {
    return DEFAULT_INTRO_QUOTE;
  }
  if (valid.length === 1) {
    return valid[0];
  }
  const filtered = exclude ? valid.filter((q) => q !== exclude) : valid;
  const pool = filtered.length > 0 ? filtered : valid;
  return pool[Math.floor(Math.random() * pool.length)] || DEFAULT_INTRO_QUOTE;
};

/**
 * On initial page load, pick quote from stored or cached quotes if available, otherwise default.
 */
const getInitialQuote = (): string => {
  try {
    const storeQuotes = useJournalStore.getState().introQuotes;
    if (Array.isArray(storeQuotes) && storeQuotes.length > 0) {
      return pickRandomQuote(storeQuotes);
    }
  } catch {}

  try {
    const cached = loadAppState();
    if (Array.isArray(cached?.introQuotes) && cached.introQuotes.length > 0) {
      return pickRandomQuote(cached.introQuotes);
    }
  } catch {}

  return DEFAULT_INTRO_QUOTE;
};

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

// Palette themes: the amber scale and --accent / --on-accent are re-tinted by src/palettes.css.
function paletteTokens(accentHex: string): ThemeColorTokens {
  const n = parseInt(accentHex.slice(1), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  return {
    glowDark: `rgba(${rgb},0.10)`,
    glowLight: `rgba(${rgb},0.16)`,
    cursorDark: 'bg-(--accent)',
    cursorLight: 'bg-(--accent)',
    sparkleDark: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
    sparkleLight: 'text-amber-700 bg-amber-500/10 border-amber-500/25',
    activePillDark: 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-xs font-semibold',
    activePillLight: 'bg-(--accent) text-(--on-accent) shadow-xs font-semibold',
    skipHoverDark: 'hover:border-amber-400/40 hover:text-amber-300',
    skipHoverLight: 'hover:border-amber-500/40 hover:text-amber-700',
  };
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
  espresso: paletteTokens('#F4C9D6'),
  nox: paletteTokens('#7E49B3'),
  crimson: paletteTokens('#B5BEDD'),
  lavender: paletteTokens('#F8769C'),
  bloom: paletteTokens('#EA6B7E'),
  lagoon: paletteTokens('#75DDDD'),
  boreal: paletteTokens('#E9DB00'),
  velvet: paletteTokens('#FEEAF6'),
};

export const EntranceOverlay: React.FC<EntranceOverlayProps> = ({
  forcePlay = false,
  onDismiss,
}) => {
  const theme = useTheme(); // 'dark' | 'light' (defaults to 'dark')
  const accentTheme = useAccentTheme(); // palette or classic accent id (defaults to 'espresso')
  const introQuotes = useIntroQuotes();

  // Ref storing the latest intro quotes so replay handlers read the newest quotes without re-registering
  const introQuotesRef = useRef(introQuotes);
  useEffect(() => {
    introQuotesRef.current = introQuotes;
  }, [introQuotes]);

  const [isVisible, setIsVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<string>(getInitialQuote);
  const [displayedQuote, setDisplayedQuote] = useState('');
  const [showAttribution, setShowAttribution] = useState(false);
  const [selectedFont, setSelectedFont] = useState<FontPersonality>(() => getRandomFont());
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [replayTrigger, setReplayTrigger] = useState(0);

  const rafIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme !== 'light';
  const tokens = THEME_COLOR_MAP[accentTheme] || THEME_COLOR_MAP.espresso;

  // Show-on-mount logic: runs EXACTLY ONCE per page load / mount
  useEffect(() => {
    setIsVisible(true);
    setIsDismissing(false);
    setSelectedFont(getRandomFont());

    const handleReplayEvent = () => {
      // Cancel any ongoing frame or timers
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }

      setIsDismissing(false);
      setIsVisible(true);
      setSelectedFont((prev) => getRandomFont(prev));
      // Read latest quotes from ref without re-registering listener
      setCurrentQuote((prev) => pickRandomQuote(introQuotesRef.current, prev));
      setReplayTrigger((t) => t + 1);
    };

    window.addEventListener('replay-intro', handleReplayEvent);
    return () => {
      window.removeEventListener('replay-intro', handleReplayEvent);
    };
  }, []); // Run exactly once per page load; introQuotes updates never restart the animation

  const handleDismiss = useCallback(() => {
    if (isDismissing) return;
    setIsDismissing(true);

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    // Wait for the 600ms fade transition before unmounting
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, FADE_OUT_DURATION_MS);
  }, [isDismissing, onDismiss]);

  // RequestAnimationFrame typing loop based on elapsed time (fixed ~1.8 seconds duration)
  useEffect(() => {
    if (!isVisible || isDismissing) return;

    setDisplayedQuote('');
    setShowAttribution(false);
    setIsTypingComplete(false);

    const targetQuote = currentQuote || DEFAULT_INTRO_QUOTE;
    const totalChars = targetQuote.length;

    // Initial subtle delay before typing starts
    timerRef.current = setTimeout(() => {
      let startTime: number | null = null;

      const step = (now: number) => {
        if (startTime === null) {
          startTime = now;
        }

        const elapsed = now - startTime;
        // characters shown = quote length × elapsed / target duration
        const charsToShow = Math.min(
          totalChars,
          Math.floor((totalChars * elapsed) / FIXED_TYPING_DURATION_MS)
        );

        setDisplayedQuote(targetQuote.slice(0, charsToShow));

        if (elapsed < FIXED_TYPING_DURATION_MS) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          // Finished typing: guarantee full quote is rendered
          setDisplayedQuote(targetQuote);
          setIsTypingComplete(true);

          // Brief pause before showing attribution
          timerRef.current = setTimeout(() => {
            setShowAttribution(true);

            // Post-typing reading pause before auto-dismissing
            dismissTimerRef.current = setTimeout(() => {
              handleDismiss();
            }, READING_PAUSE_MS);
          }, ATTRIBUTION_PAUSE_MS);
        }
      };

      rafIdRef.current = requestAnimationFrame(step);
    }, INITIAL_DELAY_MS);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [isVisible, isDismissing, currentQuote, replayTrigger, handleDismiss]);

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

  return (
    <div
      id="entrance-overlay"
      role="region"
      aria-label="Welcome quote"
      className={`intro-root fixed inset-0 z-[100] select-none bg-(--j-ground) text-(--j-ink) transition-opacity duration-600 ease-out ${
        isDismissing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/*
        The intro: the line draws down and across, the cream stop lights, the session stop arrives,
        then today's quote types in. Portrait (closed, or open and half folded like a desk): mark and
        quote in the top half, controls at the bottom. Landscape (open like a book, tent): mark on the
        left half, quote on the right, so nothing sits on the fold.
      */}
      <main className="intro-layout relative z-10 h-full w-full">
        <svg className="intro-mark" viewBox="16 8 76 86" aria-hidden="true">
          <path className="intro-rail" d="M30 18 V70 a12 12 0 0 0 12 12 H80" />
          <circle className="intro-now" cx="30" cy="34" r="8" />
          <circle className="intro-dest" cx="74" cy="82" r="10" />
        </svg>
        <div className="intro-quote">
          <h1 className={`text-[28px] sm:text-[34px] leading-[1.18] font-normal ${getFontFamilyClass()}`}>
            “{displayedQuote}”
            <span
              className={`inline-block w-0.5 h-[0.9em] ml-1 align-middle rounded-full bg-(--j-tag) ${isTypingComplete ? 'animate-pulse' : ''}`}
              aria-hidden="true"
            />
          </h1>
          <p className={`mt-4 text-[14px] font-semibold text-(--j-ink2) transition-all duration-500 ${showAttribution ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            {ATTRIBUTION} · {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </main>

      <button
        type="button"
        onClick={handleDismiss}
        className="intro-skip absolute z-10 min-h-[44px] px-5 rounded-full text-[15px] font-semibold bg-(--j-chip) text-(--j-ink) active:scale-95 transition-transform"
        aria-label="Skip intro and open journal immediately"
      >
        Skip
      </button>

      {/* Bottom Bar: Curated 5-Font Typography Roster */}
      <footer className="intro-fonts absolute z-10 flex">
        <div
          className="flex flex-wrap items-center gap-0.5 p-1 rounded-full bg-(--j-chip) max-w-[calc(100vw-2rem)]"
        >
          <button
            type="button"
            onClick={() => setSelectedFont('serif')}
            className={`min-h-[32px] px-3 rounded-full text-[12px] font-serif transition-all ${
              selectedFont === 'serif' ? 'bg-(--j-ground) text-(--j-ink) shadow-xs font-semibold' : 'text-(--j-ink2) hover:text-(--j-ink)'
            }`}
          >
            Editorial Serif
          </button>
          <button
            type="button"
            onClick={() => setSelectedFont('sans')}
            className={`min-h-[32px] px-3 rounded-full text-[12px] font-sans transition-all ${
              selectedFont === 'sans' ? 'bg-(--j-ground) text-(--j-ink) shadow-xs font-semibold' : 'text-(--j-ink2) hover:text-(--j-ink)'
            }`}
          >
            Jakarta Sans
          </button>
          <button
            type="button"
            onClick={() => setSelectedFont('grotesk')}
            className={`min-h-[32px] px-3 rounded-full text-[12px] font-['Space_Grotesk',_sans-serif] transition-all ${
              selectedFont === 'grotesk' ? 'bg-(--j-ground) text-(--j-ink) shadow-xs font-semibold' : 'text-(--j-ink2) hover:text-(--j-ink)'
            }`}
          >
            Neo Grotesk
          </button>
          <button
            type="button"
            onClick={() => setSelectedFont('display')}
            className={`min-h-[32px] px-3 rounded-full text-[12px] font-['Cinzel',_serif] transition-all ${
              selectedFont === 'display' ? 'bg-(--j-ground) text-(--j-ink) shadow-xs font-semibold' : 'text-(--j-ink2) hover:text-(--j-ink)'
            }`}
          >
            Display
          </button>
          <button
            type="button"
            onClick={() => setSelectedFont('mono')}
            className={`min-h-[32px] px-3 rounded-full text-[12px] font-mono transition-all ${
              selectedFont === 'mono' ? 'bg-(--j-ground) text-(--j-ink) shadow-xs font-semibold' : 'text-(--j-ink2) hover:text-(--j-ink)'
            }`}
          >
            Monospace
          </button>
        </div>
      </footer>
    </div>
  );
};
