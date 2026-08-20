import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  BookOpen, 
  UserCheck, 
  Sparkles,
  KeyRound
} from 'lucide-react';
import { 
  PermissionsDoc, 
  CurrentUserProfile, 
  loginWithEmail, 
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
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean) {
      setErrorMsg('Please enter your email address to sign in.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const user = await loginWithEmail(clean, undefined, false);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
        `Access Denied: "${clean}" is not authorized. Please request access from the owner (${permissions.ownerEmail}).`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle(permissions.ownerEmail);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSignIn = async (email: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await loginWithEmail(email);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err?.message || `Failed to sign in as ${email}.`);
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
            Private & confidential personal journal. Only authorized accounts are permitted to view or edit.
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
        <button
          id="google-signin-btn"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 font-semibold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
          <span>Sign In as Journal Owner ({permissions.ownerEmail})</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-200 dark:border-stone-800 w-full" />
          <span className="bg-white dark:bg-stone-900 px-3 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Or Sign In with Email
          </span>
        </div>

        {/* Email Sign In Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="auth-email-input"
              type="email"
              placeholder="e.g., therapist@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isLoading}
              className={`w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-2xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 ${currentAccent.ring} font-medium`}
            />
          </div>

          <button
            id="auth-email-submit-btn"
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 ${currentAccent.buttonPrimary} text-white font-semibold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50`}
          >
            <span>Verify & Enter Journal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Authorized Quick Access / Role Testing Selector */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-stone-400" />
              Quick Authorized Demo Access
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Owner Button */}
            <button
              type="button"
              onClick={() => handleQuickSignIn(permissions.ownerEmail)}
              className={`p-2.5 rounded-xl border ${currentAccent.calloutBorder} ${currentAccent.calloutBg} hover:opacity-90 text-left transition-colors flex flex-col`}
            >
              <span className={`font-bold ${currentAccent.textPrimary}`}>Owner</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{permissions.ownerEmail}</span>
            </button>

            {/* Dr. Des Therapist */}
            <button
              type="button"
              onClick={() => handleQuickSignIn('therapist@example.com')}
              className="p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-purple-900 dark:text-purple-200">Dr. Des (Commenter)</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate">therapist@example.com</span>
            </button>

            {/* Editor Guest */}
            <button
              type="button"
              onClick={() => handleQuickSignIn('guest@example.com')}
              className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-amber-900 dark:text-amber-200">Editor</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate">guest@example.com</span>
            </button>

            {/* Viewer Guest */}
            <button
              type="button"
              onClick={() => handleQuickSignIn('viewer@example.com')}
              className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 text-left transition-colors flex flex-col"
            >
              <span className="font-bold text-stone-800 dark:text-stone-200">Viewer</span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate">viewer@example.com</span>
            </button>
          </div>
        </div>

        {/* Security Badge Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Role-Based Access Control • End-to-End Private</span>
        </div>

      </div>
    </div>
  );
};
