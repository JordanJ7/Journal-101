import { CORE_CATEGORIES_CONFIG, INITIAL_COMMENTS, INITIAL_CORE_ITEMS, INITIAL_WEEKS } from '../data/initialData';
import { AppState, CoreTopicItem, SharedSnapshotData, WeeklyBlock } from '../types';

const STORAGE_KEY = 'journal_therapy_tracker_v1';
const BACKUP_KEY = 'journal_backup';
const FAILSAFE_KEY = 'journal_failsafe_backup';

export function formatTimestamp(date = new Date()): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'

  return `${month} ${day}${suffix}, ${year} @ ${hours}:${minutes}${ampm}`;
}

/**
 * Parses any timestamp string (e.g., "August 16th, 2026 @ 11:01pm", ISO string, or Date) into a valid Date object.
 */
export function parseDateFromTimestamp(val?: string | Date | null): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;

  // 1. If standard ISO or parseable by new Date()
  const direct = new Date(val);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  // 2. Parse custom journal format: "Month Day(st/nd/rd/th), Year @ H:MMam/pm"
  try {
    // Example: "August 16th, 2026 @ 11:01pm" or "July 21st, 2026 @ 2:40am"
    const regex = /^([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)?,\s+(\d{4})\s*@\s*(\d+):(\d+)(am|pm)$/i;
    const match = val.trim().match(regex);
    if (match) {
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const monthIndex = monthNames.indexOf(match[1].toLowerCase());
      const day = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      let hours = parseInt(match[4], 10);
      const minutes = parseInt(match[5], 10);
      const ampm = match[6].toLowerCase();

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      if (monthIndex !== -1) {
        const parsed = new Date(year, monthIndex, day, hours, minutes, 0, 0);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  } catch (err) {
    console.warn('Custom timestamp parsing error:', err);
  }

  return new Date();
}

/**
 * Parses a dateTag (e.g. 'August 22nd, 2026 @ 12:47pm', 'Aug 22, 2026', '2026-08-22', etc.).
 * Strips ordinal suffixes (st/nd/rd/th) and normalizes '@' before passing to Date.parse.
 * If parsing fails or dateTag is empty, falls back to the item's createdAt field so sorting never breaks or throws.
 */
export function parseDateTag(dateTag?: string | null, fallbackCreatedAt?: string | null): number {
  if (dateTag && typeof dateTag === 'string' && dateTag.trim()) {
    try {
      // 1. Strip ordinal suffixes from numbers (e.g. "22nd" -> "22", "1st" -> "1", "3rd" -> "3", "4th" -> "4")
      let cleaned = dateTag.replace(/(\d+)(?:st|nd|rd|th)\b/gi, '$1');
      // 2. Normalize the '@' symbol
      cleaned = cleaned.replace(/@/g, ' ').replace(/\s+/g, ' ').trim();

      const parsedTime = Date.parse(cleaned);
      if (!isNaN(parsedTime)) {
        return parsedTime;
      }

      // Secondary check with custom parser
      const customDate = parseDateFromTimestamp(dateTag);
      if (customDate && !isNaN(customDate.getTime())) {
        return customDate.getTime();
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to createdAt
  if (fallbackCreatedAt && typeof fallbackCreatedAt === 'string' && fallbackCreatedAt.trim()) {
    const createdTime = Date.parse(fallbackCreatedAt);
    if (!isNaN(createdTime)) {
      return createdTime;
    }
  }

  return 0;
}

/**
 * Converts a Date object to "YYYY-MM-DDTHH:mm" format for <input type="datetime-local">.
 */
export function toDateTimeLocalString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

/**
 * Given a Date, computes the corresponding ISO week start (Monday) and end (Sunday),
 * and generates the title e.g. "Week of August 17th, 2026".
 */
export function getWeekTitleAndRangeForDate(d: Date): { weekTitle: string; startDate: string; endDate: string } {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  // Calculate Monday of this week
  const diffToMonday = date.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(date);
  monday.setDate(diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const mMonth = months[monday.getMonth()];
  const mDay = monday.getDate();
  const mYear = monday.getFullYear();

  let suffix = 'th';
  if (mDay === 1 || mDay === 21 || mDay === 31) suffix = 'st';
  else if (mDay === 2 || mDay === 22) suffix = 'nd';
  else if (mDay === 3 || mDay === 23) suffix = 'rd';

  const weekTitle = `Week of ${mMonth} ${mDay}${suffix}, ${mYear}`;
  const startDate = `${mMonth.substring(0, 3)} ${mDay}, ${mYear}`;
  const sMonth = months[sunday.getMonth()];
  const sDay = sunday.getDate();
  const sYear = sunday.getFullYear();
  const endDate = `${sMonth.substring(0, 3)} ${sDay}, ${sYear}`;

  return { weekTitle, startDate, endDate };
}

export function loadAppState(): AppState {
  let explicitTheme: 'dark' | 'light' | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      const rawTheme = localStorage.getItem('app_theme');
      if (rawTheme === 'dark' || rawTheme === 'light') {
        explicitTheme = rawTheme;
      }
    }
  } catch {}

  const storageKeysToTry = [STORAGE_KEY, BACKUP_KEY, FAILSAFE_KEY, 'journal_cloud_local_backup'];

  for (const key of storageKeysToTry) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (Array.isArray(parsed.weeks) || Array.isArray(parsed.coreItems))) {
          // Merge subCategories from CORE_CATEGORIES_CONFIG for standard categories if not present
          const rawCategories = Array.isArray(parsed.coreCategories) && parsed.coreCategories.length > 0
            ? parsed.coreCategories
            : CORE_CATEGORIES_CONFIG;

          const mergedCategories = rawCategories.map((cat: any) => {
            const defaultCat = CORE_CATEGORIES_CONFIG.find((c) => c.id === cat.id);
            if (defaultCat && (!cat.subCategories || cat.subCategories.length === 0) && defaultCat.subCategories) {
              return {
                ...cat,
                subCategories: defaultCat.subCategories,
              };
            }
            return cat;
          });

          return {
            weeks: Array.isArray(parsed.weeks) ? parsed.weeks : INITIAL_WEEKS,
            activeWeekId: parsed.activeWeekId || parsed.weeks?.[0]?.id || INITIAL_WEEKS[0]?.id || '',
            coreItems: Array.isArray(parsed.coreItems) ? parsed.coreItems : INITIAL_CORE_ITEMS,
            activeCoreCategory: parsed.activeCoreCategory || 'questions-to-ask-her',
            activeCoreSubCategory: parsed.activeCoreSubCategory,
            theme: explicitTheme || parsed.theme || 'dark',
            accentTheme: parsed.accentTheme || 'amber',
            comments: Array.isArray(parsed.comments) ? parsed.comments : INITIAL_COMMENTS,
            coreCategories: mergedCategories,
            pinnedCategoryIds: Array.isArray(parsed.pinnedCategoryIds) && parsed.pinnedCategoryIds.length > 0
              ? parsed.pinnedCategoryIds
              : ['foods-to-try', 'my-hobbies', 'backstory-stuff', 'things-i-want-to-do'],
            filters: parsed.filters || {
              searchQuery: '',
              hasMediaOnly: false,
              hasTherapistAnswersOnly: false,
              dateRange: 'all',
              sortOrder: 'newest',
            },
          };
        }
      }
    } catch (err) {
      console.error(`Failed to parse state from localStorage key "${key}":`, err);
    }
  }

  return {
    weeks: INITIAL_WEEKS,
    activeWeekId: INITIAL_WEEKS[0]?.id || '',
    coreItems: INITIAL_CORE_ITEMS,
    activeCoreCategory: 'questions-to-ask-her',
    theme: explicitTheme || 'dark',
    accentTheme: 'amber',
    coreCategories: CORE_CATEGORIES_CONFIG,
    pinnedCategoryIds: ['foods-to-try', 'my-hobbies', 'backstory-stuff', 'things-i-want-to-do'],
    comments: INITIAL_COMMENTS,
    filters: {
      searchQuery: '',
      hasMediaOnly: false,
      hasTherapistAnswersOnly: false,
      dateRange: 'all',
      sortOrder: 'newest',
    },
  };
}

export function saveAppState(state: AppState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(BACKUP_KEY, serialized);
    localStorage.setItem(FAILSAFE_KEY, serialized);
    localStorage.setItem('journal_backup_timestamp', new Date().toISOString());
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function generateMarkdownExport(weeks: WeeklyBlock[], coreItems: CoreTopicItem[]): string {
  let md = `# Personal Journal & Therapy Notebook\n\n`;
  md += `*Exported on ${formatTimestamp()}*\n\n`;
  md += `---\n\n`;

  // Weekly Journal Section
  md += `## 1. Weekly Journaling Engine (Timeline)\n\n`;
  weeks.forEach((week) => {
    md += `### ${week.weekTitle}\n`;
    md += `*Period: ${week.startDate} to ${week.endDate}*\n\n`;

    // Assignments
    const assign = week.assignments;
    if (assign.readBookEnabled || assign.watchMovieEnabled || assign.answerDesQuestionsEnabled) {
      md += `#### Weekly Homework & Switches:\n`;
      if (assign.readBookEnabled) {
        md += `- **Reading Book**: ${assign.readBookTitle || 'N/A'}\n`;
        md += `  - *Notes/Progress*: ${assign.readBookProgress || 'In progress'}\n`;
      }
      if (assign.watchMovieEnabled) {
        md += `- **Watching Movie**: ${assign.watchMovieTitle || 'N/A'}\n`;
        md += `  - *Thoughts*: ${assign.watchMovieThoughts || 'None'}\n`;
      }
      if (assign.answerDesQuestionsEnabled && assign.desQuestions.length > 0) {
        md += `- **Des Q&A Questions**:\n`;
        assign.desQuestions.forEach((q) => {
          md += `  - **Q**: ${q.question}\n`;
          md += `    - **A**: ${q.answer} *(stamped: ${q.timestamp})*\n`;
        });
      }
      md += `\n`;
    }

    // Therapist Section
    const ts = week.therapistSection;
    if (ts) {
      md += `#### Therapist Card: "${ts.title}"\n`;
      if (ts.notes) md += `*Notes*: ${ts.notes}\n\n`;
      if (ts.externalLinks?.length) {
        md += `*External Links / Photos Albums*:\n`;
        ts.externalLinks.forEach((link) => {
          md += `- [${link.title}](${link.url})\n`;
        });
        md += `\n`;
      }
      if (ts.itemsToShow?.length) {
        md += `*Items to Show Des*:\n`;
        ts.itemsToShow.forEach((item) => {
          const prefix = item.isHighlightedAnswer ? `> **[Therapist Answer]** ` : `- `;
          md += `${prefix}${item.text} *(${item.timestamp})*\n`;
        });
        md += `\n`;
      }
    }

    // Bullets
    md += `#### Journal Entries:\n`;
    week.bullets.forEach((bullet) => {
      const indentSpaces = '  '.repeat(bullet.indent);
      const highlightTag = bullet.isAnswerHighlight ? ` **[Therapist Answer]**` : '';
      const completedCheck = bullet.completed ? '[x] ' : '';
      md += `${indentSpaces}- ${completedCheck}${bullet.text}${highlightTag} *(${bullet.timestamp})*\n`;
      if (bullet.mediaUrl) {
        md += `${indentSpaces}  - ![Media](${bullet.mediaUrl}) ${bullet.mediaCaption ? `*(${bullet.mediaCaption})*` : ''}\n`;
      }
    });
    md += `\n---\n\n`;
  });

  // Core Sections
  md += `## 2. Core Persistent Topics Dashboard\n\n`;
  const groupedByCategory: Record<string, CoreTopicItem[]> = {};
  coreItems.forEach((item) => {
    if (!groupedByCategory[item.categoryId]) {
      groupedByCategory[item.categoryId] = [];
    }
    groupedByCategory[item.categoryId].push(item);
  });

  Object.entries(groupedByCategory).forEach(([catId, items]) => {
    md += `### Category: ${catId.replace(/-/g, ' ').toUpperCase()}\n\n`;
    items.forEach((item) => {
      md += `#### ${item.title}\n`;
      md += `*Stamped: ${item.timestamp}* ${item.dateTag ? `| *Tag: ${item.dateTag}*` : ''} ${item.status ? `| *Status: ${item.status}*` : ''}\n\n`;
      md += `${item.content}\n\n`;
      if (item.answers) {
        md += `> **Notes / Answers**: ${item.answers}\n\n`;
      }
      if (item.mediaUrl) {
        md += `![Attachment](${item.mediaUrl})\n\n`;
      }
    });
  });

  return md;
}

export async function createShareableLink(data: SharedSnapshotData): Promise<string> {
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: data.title || 'Personal Journal & Therapy Tracker',
        data,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const result = await res.json();
    return result.shareUrl || `${window.location.origin}?shareId=${result.shareId}`;
  } catch (err) {
    console.warn('API share failed, falling back to URL payload encoding:', err);
    // Fallback URL hash compression or stringification
    const encoded = encodeURIComponent(JSON.stringify(data));
    return `${window.location.origin}?data=${encoded.substring(0, 1500)}`;
  }
}
