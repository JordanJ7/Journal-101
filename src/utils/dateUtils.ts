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

