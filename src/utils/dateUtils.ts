import { AppState, BulletPoint, WeeklyBlock } from '../types';
import { formatTimestamp, parseDateFromTimestamp, getWeekTitleAndRangeForDate } from './storage';

/**
 * Parses a Date from an entry timestamp string, ISO date string, or custom date string.
 * Uses helper from storage.ts.
 */
export function getEntryDate(timestampStr?: string): Date {
  return parseDateFromTimestamp(timestampStr);
}

/**
 * Sorts an array of bullet entries chronologically (oldest first or newest first).
 */
export function sortBulletsByDate(
  bullets: BulletPoint[],
  direction: 'asc' | 'desc' = 'asc'
): BulletPoint[] {
  return [...bullets].sort((a, b) => {
    const timeA = getEntryDate(a.isoDate || a.createdAt || a.timestamp).getTime();
    const timeB = getEntryDate(b.isoDate || b.createdAt || b.timestamp).getTime();
    if (timeA === timeB) return 0;
    return direction === 'asc' ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Parses a week's startDate into a real Date object.
 * Start dates are stored in formats like:
 * - '2026-08-24' (ISO YYYY-MM-DD)
 * - 'Sep 7, 2026' (Month Day, Year)
 * Never sorts raw strings. Returns null if the date cannot be parsed.
 */
export function parseWeekStartDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. Format: YYYY-MM-DD (e.g. '2026-08-24' or '2026-8-24')
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Format: 'Sep 7, 2026', 'September 7, 2026', 'Sep 7th, 2026'
  const monthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  const textMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (textMatch) {
    const mStr = textMatch[1].toLowerCase().slice(0, 3);
    const mIdx = monthNames.indexOf(mStr);
    if (mIdx !== -1) {
      const day = parseInt(textMatch[2], 10);
      const year = parseInt(textMatch[3], 10);
      const d = new Date(year, mIdx, day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 3. Fallback: standard Date.parse
  const parsedTime = Date.parse(trimmed);
  if (!isNaN(parsedTime)) {
    return new Date(parsedTime);
  }

  return null;
}

/**
 * Comparator for Weekly entries sidebar list:
 * - Pinned weeks always appear at the top of the list above all other weeks, sorted newest-first among themselves.
 * - Sort order: newest first (top) to oldest (bottom), by each week's startDate.
 * - Parses both formats ('2026-08-24' and 'Sep 7, 2026') into real dates before comparing. Never sorts raw strings.
 * - If a date cannot be parsed, puts that week at the bottom.
 */
export function compareWeeksForSidebar(a: WeeklyBlock, b: WeeklyBlock): number {
  const aPinned = Boolean(a.isPinned);
  const bPinned = Boolean(b.isPinned);

  // 1. Pinned weeks always appear at the top above all other weeks
  if (aPinned && !bPinned) return -1;
  if (!aPinned && bPinned) return 1;

  // 2. Both pinned or both unpinned: compare real parsed start dates
  const dateA = parseWeekStartDate(a.startDate);
  const dateB = parseWeekStartDate(b.startDate);

  // If a date can't be parsed, put that week at the bottom
  if (!dateA && !dateB) {
    return a.id.localeCompare(b.id);
  }
  if (!dateA) return 1; // a cannot be parsed -> bottom (after b)
  if (!dateB) return -1; // b cannot be parsed -> bottom (after a)

  // Newest first (top) to oldest (bottom)
  const diff = dateB.getTime() - dateA.getTime();
  if (diff !== 0) return diff;

  return a.id.localeCompare(b.id);
}

/**
 * Automatically sorts an array of weekly blocks for the sidebar list.
 */
export function sortWeeksForSidebar(weeks: WeeklyBlock[]): WeeklyBlock[] {
  return [...weeks].sort(compareWeeksForSidebar);
}

/**
 * Sorts an array of weekly blocks chronologically (newest first by default).
 */
export function sortWeeksChronologically(
  weeks: WeeklyBlock[],
  direction: 'desc' | 'asc' = 'desc'
): WeeklyBlock[] {
  return [...weeks].sort((a, b) => {
    const timeA = getEntryDate(a.createdAt || a.startDate || a.weekTitle).getTime();
    const timeB = getEntryDate(b.createdAt || b.startDate || b.weekTitle).getTime();
    if (timeA === timeB) return 0;
    return direction === 'desc' ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Checks if a given date falls within the start and end range of a weekly block.
 */
export function isDateWithinWeek(date: Date, week: WeeklyBlock): boolean {
  if (!date || isNaN(date.getTime()) || !week) return false;

  const targetTime = date.getTime();

  // 1. Direct check using week's startDate and endDate
  if (week.startDate && week.endDate) {
    const start = parseDateFromTimestamp(week.startDate);
    const end = parseDateFromTimestamp(week.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      if (targetTime >= start.getTime() && targetTime <= end.getTime()) {
        return true;
      }
    }
  }

  // 2. Title and range match for this date's Monday-Sunday week
  const { weekTitle, startDate, endDate } = getWeekTitleAndRangeForDate(date);
  if (week.weekTitle && week.weekTitle.trim().toLowerCase() === weekTitle.trim().toLowerCase()) {
    return true;
  }
  if (
    week.startDate &&
    week.endDate &&
    week.startDate.trim().toLowerCase() === startDate.trim().toLowerCase() &&
    week.endDate.trim().toLowerCase() === endDate.trim().toLowerCase()
  ) {
    return true;
  }

  // 3. Check if week.createdAt or week.startDate falls within the date's standard week interval
  if (week.createdAt || week.startDate) {
    const weekDate = parseDateFromTimestamp(week.createdAt || week.startDate);
    if (!isNaN(weekDate.getTime())) {
      const { weekTitle: wTitle } = getWeekTitleAndRangeForDate(weekDate);
      if (wTitle.toLowerCase() === weekTitle.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Finds an existing week in the provided weeks list that covers the specified date.
 * Matches by startDate/endDate range, week title, or preferredWeekId if valid.
 */
export function findMatchingWeekForDate(
  date: Date,
  weeks: WeeklyBlock[],
  preferredWeekId?: string
): WeeklyBlock | undefined {
  if (!date || isNaN(date.getTime()) || !weeks || weeks.length === 0) return undefined;

  // 1. Check preferredWeekId first if provided
  if (preferredWeekId) {
    const prefWeek = weeks.find((w) => w.id === preferredWeekId);
    if (prefWeek && isDateWithinWeek(date, prefWeek)) {
      return prefWeek;
    }
  }

  const { weekTitle, startDate, endDate } = getWeekTitleAndRangeForDate(date);
  const targetTime = date.getTime();

  // 2. Check each week's [startDate, endDate] boundary
  for (const week of weeks) {
    if (week.startDate && week.endDate) {
      const start = parseDateFromTimestamp(week.startDate);
      const end = parseDateFromTimestamp(week.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (targetTime >= start.getTime() && targetTime <= end.getTime()) {
          return week;
        }
      }
    }
  }

  // 3. Exact match by weekTitle or startDate/endDate strings
  for (const week of weeks) {
    if (
      (week.weekTitle && week.weekTitle.trim().toLowerCase() === weekTitle.trim().toLowerCase()) ||
      (week.startDate &&
        week.endDate &&
        week.startDate.trim().toLowerCase() === startDate.trim().toLowerCase() &&
        week.endDate.trim().toLowerCase() === endDate.trim().toLowerCase())
    ) {
      return week;
    }
  }

  // 4. Any other matching week using isDateWithinWeek
  for (const week of weeks) {
    if (isDateWithinWeek(date, week)) {
      return week;
    }
  }

  return undefined;
}

/**
 * Assigns or moves an entry to its correct week based on its target date.
 * Checks whether a week already exists covering the target date, and reuses it if found.
 * If NO matching week exists, it creates a new week block.
 */
export function relocateBulletToMatchingWeek(
  bullet: BulletPoint,
  sourceWeekId: string,
  weeks: WeeklyBlock[]
): { updatedWeeks: WeeklyBlock[]; targetWeekId: string } {
  const entryDate = getEntryDate(bullet.isoDate || bullet.timestamp || bullet.createdAt);
  const { weekTitle, startDate, endDate } = getWeekTitleAndRangeForDate(entryDate);

  // Check if target week already exists
  let targetWeek = findMatchingWeekForDate(entryDate, weeks, sourceWeekId);

  let updatedWeeks = [...weeks];

  if (!targetWeek) {
    // Create new weekly block only if NO existing week matches the date range
    const newWeekId = 'week-' + Date.now();
    targetWeek = {
      id: newWeekId,
      weekTitle,
      startDate,
      endDate,
      createdAt: bullet.isoDate || bullet.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bullets: [bullet],
      assignments: {
        readBookEnabled: false,
        readBookTitle: '',
        readBookProgress: '',
        watchMovieEnabled: false,
        watchMovieTitle: '',
        watchMovieThoughts: '',
        answerDesQuestionsEnabled: false,
        desQuestions: [],
      },
      therapistSection: {
        title: 'Session Notes',
        notes: '',
        externalLinks: [],
        itemsToShow: [],
      },
    };
    updatedWeeks = sortWeeksChronologically([targetWeek, ...updatedWeeks], 'desc');
    return {
      updatedWeeks,
      targetWeekId: targetWeek.id,
    };
  }

  // If targetWeek is found, remove bullet from sourceWeekId (if different) and place into targetWeek
  updatedWeeks = updatedWeeks.map((w) => {
    if (w.id === sourceWeekId && sourceWeekId !== targetWeek!.id) {
      return {
        ...w,
        updatedAt: new Date().toISOString(),
        bullets: w.bullets.filter((b) => b.id !== bullet.id),
      };
    }
    return w;
  });

  updatedWeeks = updatedWeeks.map((w) => {
    if (w.id === targetWeek!.id) {
      const existing = w.bullets.filter((b) => b.id !== bullet.id);
      const combined = sortBulletsByDate([...existing, bullet], 'asc');
      return {
        ...w,
        updatedAt: new Date().toISOString(),
        bullets: combined,
      };
    }
    return w;
  });

  return {
    updatedWeeks,
    targetWeekId: targetWeek.id,
  };
}

