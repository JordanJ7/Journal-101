import React, { useState } from 'react';
import {
  Globe,
  Lock,
  Shield,
  User,
  Plus,
  X,
  Check,
  Info,
} from 'lucide-react';
import { useJournalStore } from '../store/useJournalStore';

interface VisibilityRestrictionPickerProps {
  visibleToEmails?: string[];
  onChange: (emails: string[]) => void;
  label?: string;
  helperText?: string;
}

export const VisibilityRestrictionPicker: React.FC<VisibilityRestrictionPickerProps> = ({
  visibleToEmails = [],
  onChange,
  label = 'Who can see this?',
  helperText = 'Default behavior is visible to anyone with access. You can restrict visibility to specific invited people.',
}) => {
  const permissions = useJournalStore((s) => s.permissions);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailInputError, setEmailInputError] = useState<string | null>(null);

  const ownerEmail = (permissions?.ownerEmail || 'saojmj123456@gmail.com').toLowerCase();
  const invitedUsers = permissions?.users || {};
  const isRestricted = Array.isArray(visibleToEmails) && visibleToEmails.length > 0;

  // Normalized list of currently selected emails (lowercased, without owner)
  const selectedEmails = (visibleToEmails || [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const handleSetMode = (restricted: boolean) => {
    if (!restricted) {
      onChange([]);
    } else {
      // By default when activating restriction, select owner (and keep any pre-existing or start empty)
      if (selectedEmails.length === 0) {
        onChange([ownerEmail]);
      }
    }
  };

  const handleToggleEmail = (email: string) => {
    const norm = email.trim().toLowerCase();
    if (norm === ownerEmail) return; // Owner cannot be deselected

    let updated: string[];
    if (selectedEmails.includes(norm)) {
      updated = selectedEmails.filter((e) => e !== norm);
    } else {
      updated = [...selectedEmails, norm];
    }
    // Ensure owner is preserved
    if (!updated.includes(ownerEmail)) {
      updated = [ownerEmail, ...updated];
    }
    onChange(updated);
  };

  const handleAddCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean) return;

    if (!clean.includes('@') || !clean.includes('.')) {
      setEmailInputError('Please enter a valid email address.');
      return;
    }

    if (clean === ownerEmail) {
      setEmailInputError('Owner always has access.');
      return;
    }

    if (selectedEmails.includes(clean)) {
      setEmailInputError('This email is already selected.');
      return;
    }

    setEmailInputError(null);
    const updated = selectedEmails.includes(ownerEmail)
      ? [...selectedEmails, clean]
      : [ownerEmail, ...selectedEmails, clean];

    onChange(updated);
    setNewEmailInput('');
  };

  // Compile list of unique emails to show (invited users from permissions + any extra currently selected)
  const knownEmails = Object.keys(invitedUsers).map((e) => e.toLowerCase());
  const allDisplayEmails = Array.from(
    new Set([...knownEmails, ...selectedEmails.filter((e) => e !== ownerEmail)])
  );

  return (
    <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            {isRestricted ? (
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            )}
            <span>{label}</span>
          </label>
          {helperText && (
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              {helperText}
            </p>
          )}
        </div>

        {isRestricted && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Restricted ({selectedEmails.length} {selectedEmails.length === 1 ? 'person' : 'people'})
          </span>
        )}
      </div>

      {/* Mode Selector Segmented Cards */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleSetMode(false)}
          className={`p-2.5 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
            !isRestricted
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 text-blue-950 dark:text-blue-100 ring-1 ring-blue-400/30'
              : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <div className="mt-0.5 p-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold leading-tight">Everyone with access</div>
            <div className="text-[10px] opacity-75 mt-0.5 leading-tight">Default: All invited roles can see this</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleSetMode(true)}
          className={`p-2.5 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
            isRestricted
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 ring-1 ring-amber-400/30'
              : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
          }`}
        >
          <div className="mt-0.5 p-1 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold leading-tight">Specific people only</div>
            <div className="text-[10px] opacity-75 mt-0.5 leading-tight">Only owner & chosen emails can view</div>
          </div>
        </button>
      </div>

      {/* Restricted Email Picker List */}
      {isRestricted && (
        <div className="p-3 bg-stone-50 dark:bg-stone-900/80 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 pb-1 border-b border-stone-200 dark:border-stone-800">
            <span>Select who is allowed to view:</span>
            <span className="text-[10px]">Owner always has access</span>
          </div>

          {/* Owner Entry (Always Included & Checked) */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-4 h-4 rounded bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                  <span>{ownerEmail}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    Owner
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">Permanent</span>
          </div>

          {/* Invited / Permitted Users List */}
          {allDisplayEmails.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {allDisplayEmails.map((email) => {
                const isSelected = selectedEmails.includes(email);
                const userMeta = invitedUsers[email];
                const roleLabel = userMeta?.role
                  ? userMeta.role.charAt(0).toUpperCase() + userMeta.role.slice(1)
                  : 'Invited';

                return (
                  <button
                    key={email}
                    type="button"
                    onClick={() => handleToggleEmail(email)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-stone-900 dark:text-stone-100'
                        : 'bg-white dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/80 text-stone-600 dark:text-stone-400 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-stone-300 dark:border-stone-600 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{email}</div>
                      </div>
                    </div>

                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600">
                      {roleLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-2.5 text-center text-xs text-stone-500 dark:text-stone-400 bg-white/50 dark:bg-stone-800/50 rounded-lg border border-dashed border-stone-200 dark:border-stone-700">
              No other invited people in this journal yet. You can add specific emails below.
            </div>
          )}

          {/* Add Another Email Form */}
          <form onSubmit={handleAddCustomEmail} className="pt-1">
            <div className="flex items-center gap-1.5">
              <input
                type="email"
                value={newEmailInput}
                onChange={(e) => {
                  setNewEmailInput(e.target.value);
                  setEmailInputError(null);
                }}
                placeholder="Add another email to grant access..."
                className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            {emailInputError && (
              <p className="text-[10px] text-rose-500 mt-1">{emailInputError}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
