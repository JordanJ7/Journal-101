import { CoreCategoryConfig, CoreTopicItem, WeeklyBlock } from '../types';

export const CORE_CATEGORIES_CONFIG: CoreCategoryConfig[] = [
  {
    id: 'questions-to-ask-her',
    title: 'Questions To Ask Her',
    iconName: 'HelpCircle',
    description: 'Categorized questions for deeper mutual understanding.',
    order: 0,
    subCategories: [
      {
        id: 'questions-to-ask-her-understand',
        label: 'Questions To Ask Her (Do These to Understand Her, Not To Just Answer)',
        description: 'Empathetic listening prompts designed to understand her perspective.',
      },
      {
        id: 'my-answers-deep',
        label: 'My Answer To The Deep Questions',
        description: 'Personal responses and self-reflection on deep relationship topics.',
      },
      {
        id: 'deep-questions',
        label: 'Deep Questions',
        description: 'Profound questions regarding values, relationship vision, and growth.',
      },
      {
        id: 'casual-questions',
        label: 'Casual Questions',
        description: 'Lighthearted, fun, and everyday catch-up questions.',
      },
    ],
  },
  {
    id: 'things-to-tell-talk-about',
    title: 'Things To Tell / Things To Talk About',
    iconName: 'MessageCircle',
    description: 'Updates, stories, and thoughts grouped by tone and context.',
    order: 1,
    subCategories: [
      {
        id: 'casual-things',
        label: 'Casual Things',
        description: 'Fun daily updates, funny moments, and movie/music recs.',
      },
      {
        id: 'serious-things',
        label: 'Serious Things',
        description: 'Important reflections, feelings, and relationship boundaries.',
      },
      {
        id: 'already-told-or-canceled',
        label: "Things I Already Told Her or Didn't Want to Anymore",
        description: 'Archived updates or topics no longer needed.',
      },
    ],
  },
  {
    id: 'topics-to-talk-about-with-her',
    title: 'Topics To Talk About With Her / Show Her',
    iconName: 'BookOpenCheck',
    description: 'Core relationship growth, self-awareness, and accountability topics.',
    order: 2,
    subCategories: [
      {
        id: 'things-ive-done-wrong-breakup',
        label: "Things To Tell Her I've Done Wrong / Why I Think She Broke Up With Me",
        description: 'Honest accountability and reflections on personal missteps.',
      },
      {
        id: 'things-shes-done-wrong',
        label: "Things She's Done Wrong In My Eyes",
        description: 'Constructive observations for healthy communication.',
      },
      {
        id: 'things-learned-about-myself',
        label: 'Things I Learned About Myself',
        description: 'Key insights from therapy and introspection.',
      },
      {
        id: 'things-want-to-change',
        label: 'Things I Want To Change / Changed About Myself',
        description: 'Actionable steps toward becoming a better partner and individual.',
      },
      {
        id: 'learned-since-breakup',
        label: 'What Have I Learned About Myself Since The Breakup',
        description: 'Post-breakup personal breakthroughs and emotional maturity.',
      },
    ],
  },
  {
    id: 'what-to-text-her',
    title: 'What To Text Her',
    iconName: 'MessageSquareText',
    description: 'Draft text messages with status tags and date logs.',
    order: 3,
    hasDraftTracking: true,
  },
  {
    id: 'things-i-want-to-do-together',
    title: 'Things I Want To Do Together',
    iconName: 'HeartHandshake',
    description: 'Checklist of places to visit, trips, and activities for us.',
    order: 4,
    hasChecklist: true,
  },
  {
    id: 'things-i-did-got',
    title: 'Things I Did / Got',
    iconName: 'ShoppingBag',
    description: 'Date logs and attached photos of recent accomplishments, gifts, and purchases.',
    order: 5,
    hasMediaGrid: true,
  },
  {
    id: 'foods-to-try',
    title: 'Foods To Try',
    iconName: 'Utensils',
    description: 'Restaurants, dishes, and recipes to taste together or solo.',
    order: 6,
  },
  {
    id: 'things-i-want-to-do',
    title: 'Things I Want To Do',
    iconName: 'Compass',
    description: 'Personal goals, travel ambitions, and self-improvement milestones.',
    order: 7,
  },
  {
    id: 'why-i-want-her-back',
    title: 'Why I Want Her Back',
    iconName: 'Heart',
    description: 'Deep reflections on her qualities, our connection, and genuine feelings.',
    order: 8,
  },
  {
    id: 'things-i-miss',
    title: 'Things I Miss',
    iconName: 'Sparkles',
    description: 'Special memories, daily routines, and small details missed.',
    order: 9,
  },
  {
    id: 'backstory-stuff',
    title: 'Backstory Stuff',
    iconName: 'History',
    description: 'Key relationship milestones, timeline memories, and foundation history.',
    order: 10,
  },
  {
    id: 'problems-june-talk',
    title: 'Problems She Talked About During Our Talk In June / Things To Know About The Relationship',
    iconName: 'AlertCircle',
    description: 'Notes from the crucial June conversation and core relationship needs.',
    order: 11,
  },
  {
    id: 'problems-that-i-had',
    title: 'Problems That I Had or Other Deep Things',
    iconName: 'ShieldAlert',
    description: 'Personal struggles, anxieties, and inner healing progress.',
    order: 12,
  },
  {
    id: 'things-to-know-about-her',
    title: 'Things To Know About Her',
    iconName: 'UserCheck',
    description: "Her preferences, boundaries, favorite things, and love languages.",
    order: 13,
  },
  {
    id: 'my-hobbies',
    title: 'My Hobbies',
    iconName: 'Activity',
    description: 'Creative projects, fitness, reading, and personal passions.',
    order: 14,
  },
];

export const INITIAL_WEEKS: WeeklyBlock[] = [];

export const INITIAL_CORE_ITEMS: CoreTopicItem[] = [];

export const INITIAL_COMMENTS: any[] = [];


