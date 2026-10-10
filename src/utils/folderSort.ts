import { CoreCategoryConfig } from '../types';

/**
 * Sorts folder list:
 * 1. By numeric `order` when present (ascending).
 * 2. Otherwise by the folder's position in the core_categories/settings categories array
 *    (this holds the user's most recent intended order).
 * 3. Otherwise by title (alphabetical).
 */
export function sortFolders(
  folders: CoreCategoryConfig[],
  settingsCategories?: CoreCategoryConfig[] | null
): CoreCategoryConfig[] {
  if (!folders || folders.length <= 1) {
    return folders || [];
  }

  const fallbackIndexMap = new Map<string, number>();
  if (settingsCategories && Array.isArray(settingsCategories)) {
    settingsCategories.forEach((cat, idx) => {
      if (cat && cat.id) {
        fallbackIndexMap.set(cat.id, idx);
      }
    });
  }

  return [...folders].sort((a, b) => {
    const hasOrderA = typeof a.order === 'number' && !isNaN(a.order);
    const hasOrderB = typeof b.order === 'number' && !isNaN(b.order);

    if (hasOrderA && hasOrderB) {
      if (a.order !== b.order) {
        return a.order! - b.order!;
      }
    } else if (hasOrderA) {
      return -1;
    } else if (hasOrderB) {
      return 1;
    }

    // Fallback: position in core_categories/settings categories array
    const posA = fallbackIndexMap.has(a.id) ? fallbackIndexMap.get(a.id)! : -1;
    const posB = fallbackIndexMap.has(b.id) ? fallbackIndexMap.get(b.id)! : -1;

    if (posA !== -1 && posB !== -1) {
      if (posA !== posB) {
        return posA - posB;
      }
    } else if (posA !== -1) {
      return -1;
    } else if (posB !== -1) {
      return 1;
    }

    // Fallback: title (alphabetical)
    const titleA = a.title || '';
    const titleB = b.title || '';
    return titleA.localeCompare(titleB, undefined, { sensitivity: 'base', numeric: true });
  });
}
