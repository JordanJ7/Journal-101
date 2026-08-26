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
  };
}

export function useCanEdit(): boolean {
  return useJournalStore((state) => checkCanEdit(state.currentUser));
}

export function useCanComment(): boolean {
  return useJournalStore((state) => checkCanComment(state.currentUser));
}

export function useIsOwner(): boolean {
  return useJournalStore((state) => checkIsOwner(state.currentUser));
}
