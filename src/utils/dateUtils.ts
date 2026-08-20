import { AppState, BulletPoint, WeeklyBlock } from '../types';
import { formatTimestamp, parseDateFromTimestamp, getWeekTitleAndRangeForDate } from './storage';

/**
 * Parses a Date from an entry timestamp string or ISO string.
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
    const timeA = getEntryDate(a.timestamp).getTime();
    const timeB = getEntryDate(b.timestamp).getTime();
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
  // If week has startDate / endDate in ISO or parseable format
  if (week.startDate && week.endDate) {
    const start = new Date(week.startDate);
    const end = new Date(week.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      // Set to boundaries of the days
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const targetTime = date.getTime();
      return targetTime >= start.getTime() && targetTime <= end.getTime();
    }
  }

  // Fallback: check week start using standard Monday-Sunday ISO week range
  const { startDate, endDate } = getWeekTitleAndRangeForDate(date);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

/**
 * Assigns or moves an entry to its correct week based on its target date.
 * If the matching week doesn't exist, it creates a new week block.
 */
export function relocateBulletToMatchingWeek(
  bullet: BulletPoint,
  sourceWeekId: string,
  weeks: WeeklyBlock[]
): { updatedWeeks: WeeklyBlock[]; targetWeekId: string } {
  const entryDate = getEntryDate(bullet.timestamp);
  const { weekTitle, startDate, endDate } = getWeekTitleAndRangeForDate(entryDate);

  // Check if target week already exists
  let targetWeek = weeks.find((w) => {
    if (w.id === sourceWeekId && isDateWithinWeek(entryDate, w)) {
      return true;
    }
    return (
      (w.startDate === startDate && w.endDate === endDate) ||
      w.weekTitle.toLowerCase() === weekTitle.toLowerCase() ||
      isDateWithinWeek(entryDate, w)
    );
  });

  let updatedWeeks = [...weeks];

  if (!targetWeek) {
    // Create new weekly block for this historical date
    const newWeekId = 'week-' + entryDate.getFullYear() + '-' + (entryDate.getMonth() + 1) + '-' + entryDate.getDate();
    targetWeek = {
      id: newWeekId,
      weekTitle,
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bullets: [],
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
    updatedWeeks = [targetWeek, ...updatedWeeks];
  }

  // Remove from all weeks first
  updatedWeeks = updatedWeeks.map((w) => {
    if (w.id === sourceWeekId) {
      return {
        ...w,
        updatedAt: new Date().toISOString(),
        bullets: w.bullets.filter((b) => b.id !== bullet.id),
      };
    }
    return w;
  });

  // Add into target week and sort chronologically
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
