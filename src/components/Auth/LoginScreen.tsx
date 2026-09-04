import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  AlertCircle,
  Users
} from 'lucide-react';
import { 
  PermissionsDoc, 
  CurrentUserProfile, 
  signInWithGoogle 
} from '../../lib/firebase';
import { AccentTheme } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';

interface LoginScreenProps {
  permissions: PermissionsDoc;
  onLoginSuccess: (user: CurrentUserProfile) => void;
  accentTheme?: AccentTheme;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  permissions,
  onLoginSuccess,
  accentTheme = 'amber',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setErrorMsg(err?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] dark:bg-[#0f0f11] text-stone-900 dark:text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-xl border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand & Security Header */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${currentAccent.iconBox} mb-2 shadow-xs`}>
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
            Therapy & Reflection Journal
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-xs mx-auto leading-relaxed">
            Private & confidential personal journal. Access is restricted to the journal owner and authorized guests.
          </p>
        </div>

        {/* Error Alert Message */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">
              {errorMsg}
            </div>
          </div>
        )}

        {/* Google Primary Sign In */}
        <div className="space-y-3 pt-2">
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 font-semibold text-sm rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading ? 'Signing in...' : 'Sign In with Google'}</span>
          </button>
        </div>

        {/* Invited Guests Info Note */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/60 dark:border-stone-800 text-xs space-y-1.5 text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-200">
            <Users className="w-3.5 h-3.5 text-stone-500" />
            <span>Invited Collaborators</span>
          </div>
          <p className="leading-relaxed text-[11px] text-stone-500 dark:text-stone-400">
            If you were invited as an editor, commenter, or viewer, sign in with the Google account associated with your invited email.
          </p>
        </div>

        {/* Security Badge Footer */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Role-Based Access Control • Authenticated with Firebase</span>
        </div>

      </div>
    </div>
  );
};
