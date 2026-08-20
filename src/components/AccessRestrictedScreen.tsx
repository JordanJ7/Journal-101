import React from 'react';
import { ShieldAlert, LogOut, Mail, Lock } from 'lucide-react';
import { CurrentUserProfile, logoutUser, PermissionsDoc } from '../lib/firebase';

interface AccessRestrictedScreenProps {
  currentUser: CurrentUserProfile;
  permissions: PermissionsDoc;
  onLogout: () => void;
}

export const AccessRestrictedScreen: React.FC<AccessRestrictedScreenProps> = ({
  currentUser,
  permissions,
  onLogout,
}) => {
  const handleSignOut = async () => {
    await logoutUser();
    onLogout();
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-stone-100 via-stone-50 to-rose-50/20 dark:from-stone-950 dark:via-stone-900 dark:to-rose-950/20 text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-xl border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        
        {/* Restrict Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 shadow-xs mx-auto">
          <ShieldAlert className="w-8 h-8 stroke-[1.75]" />
        </div>

        {/* Heading & Notice */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
            Access Restricted
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-xs mx-auto">
            You are not authorized to view this notebook. This private journal is restricted to authorized accounts only.
          </p>
        </div>

        {/* Account Info Card */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 rounded-2xl text-left space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400">
            <span>Signed In Account</span>
            <span className="flex items-center gap-1 text-rose-500 font-bold">
              <Lock className="w-3 h-3" /> Unauthorized
            </span>
          </div>
          <p className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200 truncate flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">{currentUser.email}</span>
          </p>
        </div>

        {/* Contact Owner Helper */}
        <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
          To request access, please contact the journal owner at{' '}
          <span className="font-semibold text-stone-700 dark:text-stone-300 select-all">
            {permissions.ownerEmail}
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            id="restricted-sign-out-btn"
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 font-semibold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
};
