import React from 'react';
import { Users, Eye, EyeOff, ShieldCheck, UserCheck, ExternalLink } from 'lucide-react';
import { PermissionsDoc, UserPermission, UserRole } from '../lib/firebase';
import { AccentTheme } from '../types';
import { ACCENT_THEMES } from '../utils/theme';

interface WhoCanSeeThisCardProps {
  permissions: PermissionsDoc;
  presenceMap: Record<string, { lastViewedAt: string }>;
  previewGuest: { email: string; role: UserRole } | null;
  onStartPreview: (email: string, role: UserRole) => void;
  onExitPreview: () => void;
  onOpenAccessManagement?: () => void;
  accentTheme?: AccentTheme;
}

function formatRelativePresence(isoString?: string | null): string {
  if (!isoString) return 'not opened yet';
  const timestamp = new Date(isoString).getTime();
  if (isNaN(timestamp)) return 'not opened yet';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return 'viewed just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `viewed ${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `viewed ${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `viewed ${diffDays}d ago`;
  return `viewed ${Math.floor(diffDays / 30)}mo ago`;
}

function getRoleBadgeStyle(role: UserRole): string {
  switch (role) {
    case 'editor':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'commenter':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'viewer':
    default:
      return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700';
  }
}

export const WhoCanSeeThisCard: React.FC<WhoCanSeeThisCardProps> = ({
  permissions,
  presenceMap,
  previewGuest,
  onStartPreview,
  onExitPreview,
  onOpenAccessManagement,
  accentTheme = 'blue',
}) => {
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.blue;

  // Extract invited users from permissions/global
  const invitedUsers = React.useMemo(() => {
    const usersObj = permissions.users || {};
    return (Object.entries(usersObj) as [string, UserPermission][]).map(([emailKey, user]) => {
      const email = (user.email || emailKey).trim().toLowerCase();
      return {
        email,
        role: user.role,
        grantedAt: user.grantedAt,
        note: user.note,
      };
    });
  }, [permissions.users]);

  return (
    <div className="bg-white/80 dark:bg-stone-900/80 rounded-2xl border border-stone-200/90 dark:border-white/10 p-4 shadow-xs backdrop-blur-xs flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
            <Users className="w-4 h-4 text-stone-600 dark:text-stone-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
              Who can see this
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Invited guests & access
            </p>
          </div>
        </div>

        {onOpenAccessManagement && (
          <button
            type="button"
            onClick={onOpenAccessManagement}
            className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:underline flex items-center gap-1 cursor-pointer"
            title="Manage invited users"
          >
            <span>Manage</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Invited List */}
      <div className="space-y-2.5">
        {invitedUsers.length === 0 ? (
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-white/5 text-center space-y-1.5">
            <UserCheck className="w-4 h-4 text-stone-400 mx-auto" />
            <p className="text-xs font-medium text-stone-600 dark:text-stone-300">
              No guests invited yet
            </p>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Invite your therapist or family to collaborate.
            </p>
            {onOpenAccessManagement && (
              <button
                type="button"
                onClick={onOpenAccessManagement}
                className="mt-1 px-3 py-1 rounded-lg text-xs font-semibold bg-stone-200/80 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 transition cursor-pointer"
              >
                Invite Guest
              </button>
            )}
          </div>
        ) : (
          invitedUsers.map((guest) => {
            const presence = presenceMap[guest.email];
            const presenceText = formatRelativePresence(presence?.lastViewedAt);
            const isCurrentlyPreviewing = previewGuest?.email === guest.email;
            const hasOpened = Boolean(presence?.lastViewedAt);

            return (
              <div
                key={guest.email}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrentlyPreviewing
                    ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 shadow-2xs'
                    : 'bg-stone-50/70 dark:bg-stone-800/40 border-stone-200/70 dark:border-white/5 hover:border-stone-300 dark:hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Email and Role Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate max-w-[160px]" title={guest.email}>
                        {guest.email}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getRoleBadgeStyle(
                          guest.role
                        )}`}
                      >
                        {guest.role}
                      </span>
                    </div>

                    {/* Viewed status */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          hasOpened ? 'bg-emerald-500' : 'bg-stone-400 dark:bg-stone-500'
                        }`}
                      />
                      <span
                        className={`${
                          hasOpened
                            ? 'text-stone-600 dark:text-stone-300 font-medium'
                            : 'text-stone-400 dark:text-stone-500 italic'
                        }`}
                      >
                        {presenceText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview Button */}
                <div className="mt-2.5 pt-2 border-t border-stone-200/60 dark:border-white/5 flex items-center justify-end">
                  {isCurrentlyPreviewing ? (
                    <button
                      type="button"
                      onClick={onExitPreview}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-900 text-white dark:bg-white dark:text-stone-900 hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Exit preview</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartPreview(guest.email, guest.role)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-stone-750 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs hover:text-stone-900 dark:hover:text-white"
                      title={`Preview exactly what ${guest.email} sees (read-only)`}
                    >
                      <Eye className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                      <span>Preview exactly what they see</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Share Status Banner */}
      {permissions.globalShareEnabled && (
        <div className="pt-2 border-t border-stone-100 dark:border-white/5 flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>General link sharing is active (read-only)</span>
        </div>
      )}
    </div>
  );
};
