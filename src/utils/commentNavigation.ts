import { CommentItem, CoreCategoryId, ViewMode } from '../types';

/**
 * Applies smooth scroll and a 1.5 - 2.2s amber outline/glow flash animation
 * to the specified DOM element.
 */
export function scrollToAndHighlightElement(element: HTMLElement) {
  try {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Remove existing animation if present and trigger reflow for instant re-trigger
    element.classList.remove('comment-target-highlight');
    void element.offsetWidth; // trigger reflow
    element.classList.add('comment-target-highlight');

    // Clean up class after animation completes
    setTimeout(() => {
      element.classList.remove('comment-target-highlight');
    }, 2400);
  } catch (err) {
    console.warn('[CommentNavigation] Could not scroll to element:', err);
  }
}

/**
 * Searches for an element matching itemId or targetId/sectionKey in the DOM.
 */
export function findTargetElement(
  itemId?: string,
  sectionKey?: string,
  targetId?: string
): HTMLElement | null {
  if (itemId) {
    // 1. Direct ID matches
    const idCandidates = [
      `bullet-${itemId}`,
      `qa-question-${itemId}`,
      `des-question-${itemId}`,
      `core-item-${itemId}`,
      `deep-question-${itemId}`,
      `topic-item-modal-${itemId}`,
      `item-${itemId}`,
      itemId,
    ];

    for (const id of idCandidates) {
      const el = document.getElementById(id);
      if (el) return el;
    }

    // 2. Data attribute matches
    const attrSelectors = [
      `[data-item-id="${itemId}"]`,
      `[data-bullet-id="${itemId}"]`,
      `[data-entry-id="${itemId}"]`,
      `[data-qa-id="${itemId}"]`,
      `[data-question-id="${itemId}"]`,
    ];

    for (const sel of attrSelectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) return el;
    }
  }

  // 3. Fallback: Search for sectionKey or targetId containers
  if (sectionKey) {
    const normKey = sectionKey.toLowerCase();
    if (normKey.includes('qa') || normKey.includes('q&a') || normKey.includes('des')) {
      const el = document.getElementById('des-qa-section') || document.querySelector<HTMLElement>('[data-section-key="Des Q&A"]');
      if (el) return el;
    }
    if (normKey.includes('homework') || normKey.includes('reading') || normKey.includes('book')) {
      const el = document.getElementById('homework-reading-section') || document.querySelector<HTMLElement>('[data-section-key="Homework & Reading"]');
      if (el) return el;
    }
    if (normKey.includes('therapist') || normKey.includes('show des')) {
      const el = document.getElementById('therapist-notes-section') || document.querySelector<HTMLElement>('[data-section-key="Therapist Notes"]');
      if (el) return el;
    }
    if (normKey.includes('bullet') || normKey.includes('journal')) {
      const el = document.getElementById('journal-bullets-section') || document.querySelector<HTMLElement>('[data-section-key="Journal Bullets"]');
      if (el) return el;
    }
  }

  if (targetId) {
    const targetCandidates = [
      `week-card-${targetId}`,
      `core-category-card-${targetId}`,
      `core-category-${targetId}`,
      `topic-folder-${targetId}`,
      `week-${targetId}`,
    ];
    for (const tid of targetCandidates) {
      const el = document.getElementById(tid);
      if (el) return el;
    }
  }

  return null;
}

export interface NavigationCallbacks {
  onNavigateView: (mode: ViewMode) => void;
  onSelectWeek?: (weekId: string) => void;
  onSelectCoreCategory?: (catId: CoreCategoryId) => void;
  onSelectSectionTag?: (tag?: string) => void;
  setHighlightedItemId?: (itemId: string | null) => void;
}

/**
 * End-to-end handler for comment navigation:
 * 1. Switches to the correct view (weekly vs core).
 * 2. Navigates to target week or topic folder.
 * 3. Expands target section.
 * 4. Locates DOM element (with retry polling for React rendering) and applies smooth scroll + amber flash.
 */
export function navigateToComment(
  comment: CommentItem,
  callbacks: NavigationCallbacks
) {
  // Step 1: Switch tab/view
  const targetView: ViewMode = comment.targetType === 'weekly' ? 'weekly' : 'core';
  callbacks.onNavigateView(targetView);

  // Step 2: Navigate to specific week or category
  if (comment.targetType === 'weekly' && comment.targetId && callbacks.onSelectWeek) {
    callbacks.onSelectWeek(comment.targetId);
  } else if (comment.targetType === 'core' && comment.targetId && callbacks.onSelectCoreCategory) {
    callbacks.onSelectCoreCategory(comment.targetId as CoreCategoryId);
  }

  // Step 3: Set active section tag
  if (comment.sectionKey && callbacks.onSelectSectionTag) {
    callbacks.onSelectSectionTag(comment.sectionKey);
  }

  if (comment.itemId && callbacks.setHighlightedItemId) {
    callbacks.setHighlightedItemId(comment.itemId);
  }

  // Step 4: Retry polling to find and scroll to the element once rendered
  const delays = [30, 100, 220, 450, 750, 1200, 1800];
  let found = false;

  delays.forEach((delay, index) => {
    setTimeout(() => {
      if (found) return;

      const el = findTargetElement(comment.itemId, comment.sectionKey, comment.targetId);
      if (el) {
        found = true;
        scrollToAndHighlightElement(el);
      } else if (index === delays.length - 1) {
        // Ultimate fallback: scroll smoothly to top of main area without erroring
        const mainContent = document.getElementById('main-content-scroll') || document.querySelector('main');
        if (mainContent) {
          mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }, delay);
  });
}
