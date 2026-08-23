import {
  AlertCircle,
  CheckCircle2,
  Lock,
  LogIn,
  LogOut,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import {
  CurrentUserProfile,
  logoutUser,
  PermissionsDoc,
  savePermissionsDoc,
  signInWithGoogle,
  UserPermission,
  UserRole,
} from '../lib/firebase';
import { useConfirmDelete } from './ConfirmDeleteModal';

interface AccessManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: PermissionsDoc;
  currentUser: CurrentUserProfile;
  onSwitchSimulatedUser: (email: string, role: UserRole) => void;
}

export const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
  isOpen,
  onClose,
  permissions,
  currentUser,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('commenter');
  const [inviteNote, setInviteNote] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwner = currentUser.role === 'owner';
  const { confirmDelete } = useConfirmDelete();

  if (!isOpen) return null;

  const handleToggleGlobalShare = async () => {
    if (!isOwner) return;
    try {
      await savePermissionsDoc({
        ...permissions,
        globalShareEnabled: !permissions.globalShareEnabled,
      });
      setStatusMsg(
        !permissions.globalShareEnabled
          ? 'Sharing enabled'
          : 'Sharing disabled'
      );
      setTimeout(() => setStatusMsg(null), 2500);
    } catch {
      setErrorMsg('Failed to update share setting');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !inviteEmail.trim()) return;

    try {
      const emailKey = inviteEmail.trim().toLowerCase();
      const newUsers = {
        ...permissions.users,
        [emailKey]: {
          email: emailKey,
          role: inviteRole,
          note: inviteNote.trim() || undefined,
          grantedAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        },
      };

      await savePermissionsDoc({
        ...permissions,
        users: newUsers,
      });

      setStatusMsg(`Invited ${emailKey}`);
      setInviteEmail('');
      setInviteNote('');
      setTimeout(() => setStatusMsg(null), 2500);
    } catch {
      setErrorMsg('Failed to invite user');
    }
  };

  const handleRoleChange = async (emailKey: string, newRole: UserRole) => {
    if (!isOwner) return;
    try {
      const cleanKey = emailKey.trim().toLowerCase();
      const usersRecord = (permissions.users || {}) as Record<string, UserPermission>;
      const targetEntry = Object.entries(usersRecord).find(
        ([k, u]) => k.trim().toLowerCase() === cleanKey || (u?.email && u.email.trim().toLowerCase() === cleanKey)
      );
      if (!targetEntry) return;

      const [actualKey, existing] = targetEntry;
      const newUsers: Record<string, UserPermission> = { ...usersRecord };
      newUsers[actualKey] = {
        ...existing,
        role: newRole,
      };

      await savePermissionsDoc({
        ...permissions,
        users: newUsers,
      });

      setStatusMsg(`Updated ${actualKey}`);
      setTimeout(() => setStatusMsg(null), 2000);
    } catch {
      setErrorMsg('Failed to update role');
    }
  };

  const handleRevokeUser = async (emailKey: string) => {
    if (!isOwner) return;
    const cleanKey = emailKey.trim().toLowerCase();

    confirmDelete({
      title: 'Remove Access',
      message: `Remove access for ${cleanKey}?`,
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          const newUsers = { ...permissions.users };
          Object.keys(newUsers).forEach((k) => {
            if (
              k.trim().toLowerCase() === cleanKey ||
              (newUsers[k]?.email && newUsers[k].email.trim().toLowerCase() === cleanKey)
            ) {
              delete newUsers[k];
            }
          });

          await savePermissionsDoc({
            ...permissions,
            users: newUsers,
          });

          setStatusMsg(`Removed ${cleanKey}`);
          setTimeout(() => setStatusMsg(null), 2000);
        } catch {
          setErrorMsg('Failed to remove user');
        }
      },
    });
  };

  return (
    <div
      id="access-management-modal-overlay"
      className="fixed inset-0 z-50 bg-[#0f0f11]/90 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150 transform-gpu will-change-transform isolate"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto relative pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 transform-gpu will-change-transform isolate">
        <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto sm:hidden mb-2 shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <h2 className="text-base sm:text-sm font-bold text-stone-900 dark:text-stone-100">
              Access & Sharing
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Feedback Messages */}
        {statusMsg && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Current Account Row */}
        <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="min-w-0">
            <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
              {currentUser.displayName || currentUser.email}
            </p>
            <p className="text-[11px] text-stone-400 truncate">
              Role: {currentUser.role}
            </p>
          </div>
          {currentUser.isLoggedIn ? (
            <button
              onClick={() => logoutUser()}
              className="min-h-[40px] px-3 py-1.5 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 font-semibold flex items-center gap-1 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="min-h-[40px] px-3.5 py-1.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-semibold rounded-xl flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </button>
          )}
        </div>

        {/* Global Share Mode */}
        <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              Share Mode
            </span>
          </div>

          {isOwner ? (
            <button
              onClick={handleToggleGlobalShare}
              className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                permissions.globalShareEnabled
                  ? 'bg-emerald-500 text-white'
                  : 'bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {permissions.globalShareEnabled ? 'On' : 'Off'}
            </button>
          ) : (
            <span className="text-stone-400 font-semibold">
              {permissions.globalShareEnabled ? 'Active' : 'Disabled'}
            </span>
          )}
        </div>

        {/* Invite User */}
        {isOwner && (
          <form onSubmit={handleInviteUser} className="space-y-2 pt-1">
            <span className="text-xs font-semibold text-stone-400 px-1">Invite</span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 text-base sm:text-xs bg-black/5 dark:bg-white/5 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="px-3 py-2 text-base sm:text-xs bg-black/5 dark:bg-white/5 rounded-xl text-stone-900 dark:text-stone-100 font-semibold focus:outline-none"
              >
                <option value="commenter">Commenter</option>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                type="submit"
                className="min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center"
              >
                Invite
              </button>
            </div>
          </form>
        )}

        {/* Authorized Accounts List */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-stone-400 px-1">Members</span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-black/5 dark:bg-white/5 rounded-xl">
              <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                {permissions.ownerEmail}
              </span>
              <span className="text-[10px] text-stone-400 font-semibold uppercase">
                Owner
              </span>
            </div>

            {Object.entries(permissions.users).map(([emailKey, userPerm]: [string, UserPermission]) => (
              <div
                key={emailKey}
                className="flex items-center justify-between p-2.5 bg-black/5 dark:bg-white/5 rounded-xl"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {userPerm.email}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOwner ? (
                    <select
                      value={userPerm.role}
                      onChange={(e) => handleRoleChange(emailKey, e.target.value as UserRole)}
                      className="py-1 px-2 bg-white dark:bg-[#1C1C1E] rounded-lg text-xs font-semibold text-stone-800 dark:text-stone-200"
                    >
                      <option value="commenter">Commenter</option>
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-semibold uppercase">
                      {userPerm.role}
                    </span>
                  )}

                  {isOwner && (
                    <button
                      onClick={() => handleRevokeUser(emailKey)}
                      className="min-h-[36px] min-w-[36px] p-2 flex items-center justify-center text-stone-400 hover:text-rose-500 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
