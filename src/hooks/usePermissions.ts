import { useJournalStore } from '../store/useJournalStore';
import { UserRole } from '../types';
import { CurrentUserProfile } from '../lib/firebase';

/**
 * Pure helper function to check if a given role or user profile has edit permissions.
 * Allowed: 'owner' | 'editor'
 */
export function checkCanEdit(userOrRole?: CurrentUserProfile | UserRole | string | null): boolean {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  return role === 'owner' || role === 'editor';
}

/**
 * Pure helper function to check if a given role or user profile has comment permissions.
 * Allowed: 'owner' | 'editor' | 'commenter'
 */
export function checkCanComment(userOrRole?: CurrentUserProfile | UserRole | string | null): boolean {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  return role === 'owner' || role === 'editor' || role === 'commenter';
}

/**
 * Pure helper function to check if a given role or user profile is the owner.
 */
export function checkIsOwner(userOrRole?: CurrentUserProfile | UserRole | string | null): boolean {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  return role === 'owner';
}

/**
 * Pure helper function to check if a given role or user profile is purely a read-only viewer.
 */
export function checkIsViewer(userOrRole?: CurrentUserProfile | UserRole | string | null): boolean {
  if (!userOrRole) return true;
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  return role === 'viewer' || role === 'unauthorized';
}

/**
 * Centralized React hook for Access Control & Role-Based Permissions.
 * Prevents logic drift across components.
 */
export function usePermissions() {
  const currentUser = useJournalStore((state) => state.currentUser);
  const previewGuest = useJournalStore((state) => state.previewGuest);

  if (previewGuest) {
    const previewUser: CurrentUserProfile = {
      ...currentUser,
      email: previewGuest.email,
      role: previewGuest.role,
      displayName: previewGuest.email,
    };
    return {
      currentUser: previewUser,
      role: previewGuest.role,
      isOwner: false,
      isEditor: false,
      isCommenter: false,
      isViewer: true,
      isUnauthorized: false,
      canEdit: false,
      canDelete: false,
      canComment: false,
      isPreviewing: true,
      previewEmail: previewGuest.email,
    };
  }

  const role = currentUser?.role || 'viewer';

  const isOwner = role === 'owner';
  const isEditor = role === 'editor';
  const isCommenter = role === 'commenter';
  const isViewer = role === 'viewer';
  const isUnauthorized = role === 'unauthorized';

  const canEdit = isOwner || isEditor;
  const canDelete = isOwner || isEditor;
  const canComment = isOwner || isEditor || isCommenter;

  return {
    currentUser,
    role,
    isOwner,
    isEditor,
    isCommenter,
    isViewer,
    isUnauthorized,
    canEdit,
    canDelete,
    canComment,
    isPreviewing: false,
    previewEmail: null,
  };
}

export function useCanEdit(): boolean {
  const previewGuest = useJournalStore((state) => state.previewGuest);
  const canEdit = useJournalStore((state) => checkCanEdit(state.currentUser));
  return previewGuest ? false : canEdit;
}

export function useCanComment(): boolean {
  const previewGuest = useJournalStore((state) => state.previewGuest);
  const canComment = useJournalStore((state) => checkCanComment(state.currentUser));
  return previewGuest ? false : canComment;
}

export function useIsOwner(): boolean {
  const previewGuest = useJournalStore((state) => state.previewGuest);
  const isOwner = useJournalStore((state) => checkIsOwner(state.currentUser));
  return previewGuest ? false : isOwner;
}

/**
 * Checks if the given user can view a document or folder restricted by visibleToEmails.
 * - When visibleToEmails is absent, null, or empty array: returns true (standard role checks apply).
 * - When visibleToEmails contains emails:
 *   - Owner ALWAYS has access.
 *   - Other users must have their email explicitly listed in visibleToEmails.
 */
export function canUserViewItem(
  visibleToEmails?: string[] | null,
  user?: CurrentUserProfile | null
): boolean {
  if (!visibleToEmails || !Array.isArray(visibleToEmails) || visibleToEmails.length === 0) {
    return true;
  }
  if (!user) return false;
  if (user.role === 'owner') return true;
  if (!user.email) return false;
  const userEmail = user.email.trim().toLowerCase();
  return visibleToEmails.some((email) => email.trim().toLowerCase() === userEmail);
}

