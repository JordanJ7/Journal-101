export type ViewMode = 'home' | 'weekly' | 'core' | 'media' | 'shared';
export type AccentTheme = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
export type UserRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface CommentItem {
  id: string;
  targetType: 'weekly' | 'core';
  targetId: string; // weekId or coreCategoryId
  itemId?: string; // specific bullet ID, question ID, or core topic ID
  sectionKey?: string; // e.g. "General", "Des Q&A", "Therapist Notes", "Book Assignment", "Core Topic"
  authorName: string;
  authorEmail?: string;
  authorRole: UserRole;
  content: string;
  timestamp: string; // e.g. "August 13th, 2026 @ 2:30pm"
  resolved?: boolean;
}

export interface Attachment {
  id: string;
  url: string; // Persistent Base64 Data URL or Firebase Storage URL
  type: 'image' | 'video';
  name: string;
  createdAt: string;
  size?: number;
  caption?: string;
}

export interface BulletPoint {
  id: string;
  text: string;
  indent: number; // 0 = root, 1 = sub, 2 = deep sub
  bulletStyle: 'disc' | 'circle' | 'dash';
  timestamp: string; // e.g., "July 21st, 2026 @ 2:40am"
  isoDate?: string; // Optional strict ISO timestamp e.g. "2026-08-17T18:09:00.000Z"
  createdAt?: string; // ISO 8601 creation date
  updatedAt?: string; // ISO 8601 last update date
  isCustomDate?: boolean; // True if manually set/backdated
  isEdited?: boolean;
  isAnswerHighlight?: boolean; // therapist highlight callout box
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'link';
  mediaCaption?: string;
  attachments?: Attachment[]; // Multi-media persistent attachments
  completed?: boolean;
  pinnedToLearned?: boolean;
  pinnedLearnedId?: string;
}

export interface DesQuestion {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  isoDate?: string;
  isCustomDate?: boolean;
  highlightAnswer?: boolean;
}

export interface AssignmentSwitches {
  readBookEnabled: boolean;
  readBookTitle: string;
  readBookProgress: string;
  watchMovieEnabled: boolean;
  watchMovieTitle: string;
  watchMovieThoughts: string;
  answerDesQuestionsEnabled: boolean;
  desQuestions: DesQuestion[];
}

export interface ExternalLink {
  id: string;
  title: string;
  url: string;
  category?: string; // 'Apple Photos', 'TikTok', 'Video', 'Article', 'Reading Material', etc.
  notes?: string;
  thumbnailUrl?: string;
  addedAt?: string;
}

export interface TherapistShowItem {
  id: string;
  text: string;
  mediaUrl?: string;
  isHighlightedAnswer: boolean;
  timestamp: string;
}

export interface TherapistSection {
  title: string;
  notes: string;
  externalLinks: ExternalLink[];
  itemsToShow: TherapistShowItem[];
}

export interface WeeklyBlock {
  id: string;
  weekTitle: string; // e.g. "Week of July 6th, 2026"
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  timestamp?: string; // Formatted human-readable timestamp e.g. "August 19th, 2026 @ 8:15pm"
  isCustomDate?: boolean; // True if manually customized/backdated
  bullets: BulletPoint[];
  assignments: AssignmentSwitches;
  therapistSection: TherapistSection;
}

export type CoreCategoryId = string;

export type ItemActivityStatus =
  | 'Draft'
  | 'Ready to Send'
  | 'Sent'
  | 'Decided Not To Send'
  | 'Completed'
  | 'Pending'
  | 'In Progress'
  | 'To Watch/Read'
  | 'Done Alone'
  | 'Done Together';

export interface CoreTopicItem {
  id: string;
  categoryId: CoreCategoryId;
  subCategoryId?: string;
  title: string;
  content: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
  dateTag?: string;
  status?: ItemActivityStatus;
  priority?: 'Low' | 'Medium' | 'High';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'link';
  mediaCaption?: string;
  attachments?: Attachment[];
  linkUrl?: string;
  location?: string;
  tags?: string[];
  notes?: string;
  answers?: string;
  isHighlightedAnswer?: boolean;
  pinnedFromWeekId?: string;
  pinnedFromWeekTitle?: string;
  pinnedFromBulletId?: string;
  pinnedBulletId?: string;
}

export interface CoreSubCategoryConfig {
  id: string;
  label: string;
  description?: string;
}

export interface CoreCategoryConfig {
  id: CoreCategoryId;
  title: string;
  iconName: string;
  description: string;
  notes?: string;
  subCategories?: CoreSubCategoryConfig[];
  hasDraftTracking?: boolean;
  hasChecklist?: boolean;
  hasMediaGrid?: boolean;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
  order?: number;
}

export interface FilterOptions {
  searchQuery: string;
  hasMediaOnly: boolean;
  hasTherapistAnswersOnly: boolean;
  dateRange: 'all' | 'past-month' | 'past-week';
  selectedCategory?: string;
}

export interface AppState {
  weeks: WeeklyBlock[];
  activeWeekId: string;
  coreItems: CoreTopicItem[];
  activeCoreCategory: CoreCategoryId;
  activeCoreSubCategory?: string;
  theme: 'light' | 'dark';
  accentTheme: AccentTheme;
  coreCategories: CoreCategoryConfig[];
  pinnedCategoryIds?: string[];
  filters: FilterOptions;
  comments?: CommentItem[];
}

export interface SharedSnapshotData {
  title: string;
  createdAt: string;
  weeks: WeeklyBlock[];
  coreItems: CoreTopicItem[];
  comments?: CommentItem[];
}
