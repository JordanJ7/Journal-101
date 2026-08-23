import {
  Bold,
  Check,
  CheckSquare,
  Clock,
  CornerDownLeft,
  List,
  Minus,
  Sparkles,
} from 'lucide-react';
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { formatTimestamp } from '../../utils/storage';
import { HighlightText } from '../HighlightText';
import { SaveStatusBadge } from '../SaveStatusBadge';

export interface BulletedNoteEditorRef {
  focus: () => void;
  insertBullet: () => void;
  insertTimestamp: () => void;
}

interface BulletedNoteEditorProps {
  entryId?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minRows?: number;
  autoFocus?: boolean;
  accentColor?: string;
  searchQuery?: string;
  saveStatus?: 'idle' | 'unsaved' | 'saving' | 'saved';
  onSaveImmediate?: () => void;
}

/**
 * Apple-inspired Bulleted Note Editor & Reader
 * - Auto-formats `- `, `* `, or `• ` followed by Space into a native bullet point.
 * - Pressing Enter continues the bulleted list at the current indent level.
 * - Pressing Enter on an empty bullet removes the bullet glyph and exits list.
 * - Pressing Tab / Shift+Tab indents and outdents nested bullets.
 * - Minimalist floating format chips for quick formatting.
 * - Direct Firestore auto-save debounce (600ms) with immediate onBlur and unmount flush.
 */
export const BulletedNoteEditor = React.forwardRef<BulletedNoteEditorRef, BulletedNoteEditorProps>(
  (
    {
      entryId,
      value,
      onChange,
      placeholder = 'Type notes, thoughts, or type - or • to start a bulleted list...',
      readOnly = false,
      minRows = 6,
      autoFocus = false,
      accentColor = '#2563EB',
      searchQuery = '',
      saveStatus = 'idle',
      onSaveImmediate,
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);
    const lastEmittedValueRef = useRef(value);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-resize textarea to fit content dynamically (no inner scrollbars)
    const adjustTextareaHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, minRows * 24)}px`;
    }, [minRows]);

    // Adjust height on value changes or resize
    useEffect(() => {
      adjustTextareaHeight();
    }, [localValue, adjustTextareaHeight]);

    // Sync external value changes only when not actively focused to prevent cursor jump / rubber-banding
    useEffect(() => {
      const isActivelyFocused =
        isFocused ||
        (typeof document !== 'undefined' && document.activeElement === textareaRef.current);
      if (!isActivelyFocused) {
        setLocalValue(value);
        lastEmittedValueRef.current = value;
      }
    }, [value, isFocused]);

    const flushChange = useCallback(
      (newVal?: string) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        const valToEmit = newVal !== undefined ? newVal : localValue;
        if (valToEmit !== lastEmittedValueRef.current) {
          lastEmittedValueRef.current = valToEmit;
          onChange(valToEmit);
        }
      },
      [localValue, onChange]
    );

    const scheduleChange = useCallback(
      (nextText: string) => {
        setLocalValue(nextText);
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          if (nextText !== lastEmittedValueRef.current) {
            lastEmittedValueRef.current = nextText;
            onChange(nextText);
          }
        }, 600);
      },
      [onChange]
    );

    // Handle immediate flush on unmount
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        if (lastEmittedValueRef.current !== value) {
          onSaveImmediate?.();
        }
      };
    }, [onSaveImmediate, value]);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
      insertBullet: () => {
        handleInsertBullet();
      },
      insertTimestamp: () => {
        handleInsertTimestamp();
      },
    }));

    // Auto-indent & bullet navigation keyboard handler
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd, value: currentText } = textarea;

      // Handle Tab / Shift+Tab for Indent / Outdent
      if (e.key === 'Tab') {
        e.preventDefault();
        const startOfLine = currentText.lastIndexOf('\n', selectionStart - 1) + 1;

        if (e.shiftKey) {
          // Shift + Tab: Outdent
          if (currentText.substring(startOfLine, startOfLine + 2) === '  ') {
            const nextText =
              currentText.substring(0, startOfLine) + currentText.substring(startOfLine + 2);
            scheduleChange(nextText);
            setTimeout(() => {
              const newPos = Math.max(startOfLine, selectionStart - 2);
              textarea.setSelectionRange(newPos, newPos);
            }, 0);
          }
        } else {
          // Tab: Indent by 2 spaces
          const nextText =
            currentText.substring(0, startOfLine) + '  ' + currentText.substring(startOfLine);
          scheduleChange(nextText);
          setTimeout(() => {
            textarea.setSelectionRange(selectionStart + 2, selectionStart + 2);
          }, 0);
        }
        return;
      }

      // Handle Enter Key for Auto-continuing or Exiting Bullet Lists
      if (e.key === 'Enter') {
        const startOfLine = currentText.lastIndexOf('\n', selectionStart - 1) + 1;
        const endOfLine = currentText.indexOf('\n', selectionStart);
        const lineEnd = endOfLine === -1 ? currentText.length : endOfLine;
        const currentLine = currentText.substring(startOfLine, lineEnd);

        // Match indentation + bullet/checkbox prefix
        const bulletMatch = currentLine.match(/^(\s*)([•\-\*]|\[ \]|\[x\])\s*(.*)$/);

        if (bulletMatch) {
          const indent = bulletMatch[1];
          const bulletGlyph = bulletMatch[2];
          const contentAfter = bulletMatch[3].trim();

          // Case 1: Empty bullet line -> Exit list / remove bullet
          if (!contentAfter) {
            e.preventDefault();
            const nextText =
              currentText.substring(0, startOfLine) + currentText.substring(lineEnd);
            scheduleChange(nextText);
            setTimeout(() => {
              textarea.setSelectionRange(startOfLine, startOfLine);
            }, 0);
            return;
          }

          // Case 2: Content exists -> Continue bullet on next line
          e.preventDefault();
          const nextBullet = bulletGlyph === '[ ]' || bulletGlyph === '[x]' ? '[ ] ' : '• ';
          const insertion = '\n' + indent + nextBullet;
          const nextText =
            currentText.substring(0, selectionStart) +
            insertion +
            currentText.substring(selectionEnd);

          scheduleChange(nextText);
          setTimeout(() => {
            const newPos = selectionStart + insertion.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
          return;
        }
      }

      // Handle Space Key to auto-format "- " or "* " to "• "
      if (e.key === ' ') {
        const startOfLine = currentText.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineBeforeCursor = currentText.substring(startOfLine, selectionStart);

        // If line is "- " or "* "
        if (/^(\s*)([\-\*])$/.test(lineBeforeCursor)) {
          e.preventDefault();
          const match = lineBeforeCursor.match(/^(\s*)([\-\*])$/);
          const indent = match ? match[1] : '';
          const replacement = indent + '• ';

          const nextText =
            currentText.substring(0, startOfLine) +
            replacement +
            currentText.substring(selectionEnd);

          scheduleChange(nextText);
          setTimeout(() => {
            const newPos = startOfLine + replacement.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
          return;
        }

        // If line is "[]" or "[ ]"
        if (/^(\s*)(\[\])$/.test(lineBeforeCursor)) {
          e.preventDefault();
          const match = lineBeforeCursor.match(/^(\s*)(\[\])$/);
          const indent = match ? match[1] : '';
          const replacement = indent + '[ ] ';

          const nextText =
            currentText.substring(0, startOfLine) +
            replacement +
            currentText.substring(selectionEnd);

          scheduleChange(nextText);
          setTimeout(() => {
            const newPos = startOfLine + replacement.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
          return;
        }
      }

      // Cmd+B / Ctrl+B: Toggle Bold
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleBold();
        return;
      }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      scheduleChange(val);
    };

    // Format Helpers
    const handleInsertBullet = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart, value: currentText } = textarea;
      const startOfLine = currentText.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = currentText.substring(startOfLine, selectionStart);

      // Check if already has bullet
      if (/^\s*[•\-\*]/.test(currentLine)) {
        return;
      }

      const insertion = '• ';
      const nextText =
        currentText.substring(0, startOfLine) +
        insertion +
        currentText.substring(startOfLine);

      flushChange(nextText);
      setLocalValue(nextText);
      setTimeout(() => {
        textarea.focus();
        const newPos = selectionStart + insertion.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }, [flushChange]);

    const handleInsertCheckbox = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart, value: currentText } = textarea;
      const startOfLine = currentText.lastIndexOf('\n', selectionStart - 1) + 1;
      const insertion = '[ ] ';
      const nextText =
        currentText.substring(0, startOfLine) +
        insertion +
        currentText.substring(startOfLine);

      flushChange(nextText);
      setLocalValue(nextText);
      setTimeout(() => {
        textarea.focus();
        const newPos = selectionStart + insertion.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }, [flushChange]);

    const handleToggleBold = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart, selectionEnd, value: currentText } = textarea;

      if (selectionStart === selectionEnd) {
        // No selection: insert **text** and position in middle
        const insertion = '****';
        const nextText =
          currentText.substring(0, selectionStart) +
          insertion +
          currentText.substring(selectionEnd);
        flushChange(nextText);
        setLocalValue(nextText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(selectionStart + 2, selectionStart + 2);
        }, 0);
      } else {
        // Selection: wrap with **
        const selected = currentText.substring(selectionStart, selectionEnd);
        const wrapped = `**${selected}**`;
        const nextText =
          currentText.substring(0, selectionStart) +
          wrapped +
          currentText.substring(selectionEnd);
        flushChange(nextText);
        setLocalValue(nextText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(selectionStart + 2, selectionEnd + 2);
        }, 0);
      }
    }, [flushChange]);

    const handleInsertTimestamp = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart, selectionEnd, value: currentText } = textarea;
      const stamp = `[${formatTimestamp()}] `;
      const nextText =
        currentText.substring(0, selectionStart) +
        stamp +
        currentText.substring(selectionEnd);

      flushChange(nextText);
      setLocalValue(nextText);
      setTimeout(() => {
        textarea.focus();
        const newPos = selectionStart + stamp.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }, [flushChange]);

    // Render formatted read-only view for viewers or formatted preview
    if (readOnly) {
      if (!localValue.trim()) {
        return (
          <div className="py-6 px-4 text-center text-stone-400 dark:text-stone-500 text-xs italic">
            No notes or bullet entries recorded for this topic.
          </div>
        );
      }

      return (
        <div className="space-y-1.5 py-1 text-stone-800 dark:text-stone-200 text-sm leading-relaxed select-text font-normal">
          {localValue.split('\n').map((line, idx) => {
            const indentSpaces = line.match(/^(\s*)/)?.[1].length || 0;
            const indentLevel = Math.min(Math.floor(indentSpaces / 2), 3);
            const trimmed = line.trim();

            if (!trimmed) {
              return <div key={idx} className="h-2" />;
            }

            const isBullet = /^[•\-\*]/.test(trimmed);
            const isTodo = /^\[([ xX])\]/.test(trimmed);
            const isChecked = /^\[[xX]\]/.test(trimmed);

            let contentText = trimmed;
            if (isBullet) {
              contentText = trimmed.replace(/^[•\-\*]\s*/, '');
            } else if (isTodo) {
              contentText = trimmed.replace(/^\[([ xX])\]\s*/, '');
            }

            const paddingClass =
              indentLevel === 0
                ? 'pl-0'
                : indentLevel === 1
                ? 'pl-5 sm:pl-6 border-l-2 border-black/5 dark:border-white/5 ml-1'
                : indentLevel === 2
                ? 'pl-10 sm:pl-12 border-l-2 border-black/5 dark:border-white/5 ml-1'
                : 'pl-14 sm:pl-16 border-l-2 border-black/5 dark:border-white/5 ml-1';

            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 min-h-[24px] ${paddingClass}`}
              >
                {isTodo ? (
                  <span
                    className={`mt-1 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      isChecked
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-stone-400 dark:border-stone-600 bg-transparent'
                    }`}
                  >
                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                ) : isBullet ? (
                  <span
                    className={`shrink-0 select-none ${
                      indentLevel === 0
                        ? 'text-blue-600 dark:text-blue-400 font-bold text-base leading-none mt-1'
                        : indentLevel === 1
                        ? 'text-stone-400 dark:text-stone-500 text-sm leading-none mt-1'
                        : 'text-stone-300 dark:text-stone-600 text-xs leading-none mt-1.5'
                    }`}
                  >
                    {indentLevel === 0 ? '•' : indentLevel === 1 ? '◦' : '▪'}
                  </span>
                ) : null}

                <div
                  className={`flex-1 break-words ${
                    isChecked ? 'line-through text-stone-400 dark:text-stone-500' : ''
                  }`}
                >
                  <FormattedLineText text={contentText} searchQuery={searchQuery} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="relative group w-full flex flex-col rounded-2xl transition-all">
        {/* Subtle Apple-style Formatting Bar (Visible on focus or hover) */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-black/5 dark:border-white/5 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleInsertBullet}
              className="px-2 py-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 font-medium transition-colors"
              title="Insert bullet point"
            >
              <span className="text-blue-600 dark:text-blue-400 font-bold">•</span>
              <span className="text-[11px]">Bullet</span>
            </button>

            <button
              type="button"
              onClick={handleInsertCheckbox}
              className="px-2 py-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 font-medium transition-colors"
              title="Insert checklist item"
            >
              <CheckSquare className="w-3 h-3 text-stone-400" />
              <span className="text-[11px]">Todo</span>
            </button>

            <button
              type="button"
              onClick={handleToggleBold}
              className="px-2 py-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 font-bold transition-colors"
              title="Bold selection (⌘B)"
            >
              <Bold className="w-3 h-3" />
              <span className="text-[11px]">Bold</span>
            </button>

            <button
              type="button"
              onClick={handleInsertTimestamp}
              className="px-2 py-1 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1 font-medium transition-colors"
              title="Insert current date & time"
            >
              <Clock className="w-3 h-3 text-stone-400" />
              <span className="text-[11px] hidden sm:inline">Timestamp</span>
            </button>
          </div>

          {/* Auto-save Telemetry */}
          <div className="flex items-center gap-2 pr-1">
            <SaveStatusBadge status={saveStatus || 'idle'} />
          </div>
        </div>

        {/* Textarea with Fluid Auto-Expanding Height & Clean Typography inside Locked Compositor Layer */}
        <div
          className="w-full relative transform-gpu typing-isolation-container"
          style={{
            contain: 'layout paint',
            willChange: 'contents',
            transform: 'translateZ(0)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleTextChange}
            onInput={(e) => {
              const target = e.currentTarget;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              flushChange();
              onSaveImmediate?.();
            }}
            placeholder={placeholder}
            rows={minRows}
            autoFocus={autoFocus}
            className="w-full h-auto min-h-[350px] resize-none overflow-hidden bg-transparent border-0 focus:outline-none focus:ring-0 text-base leading-relaxed text-stone-900 dark:text-neutral-100 placeholder:text-neutral-500 font-normal selection:bg-blue-500/20 py-2 px-1"
          />
        </div>

        {/* Keyboard Tip Footer */}
        <div className="flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500 pt-1 border-t border-black/5 dark:border-white/5">
          <span>Type <code className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">-</code> or <code className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">•</code> + <kbd className="font-sans">Space</kbd> for bullets</span>
          <span><kbd className="font-sans">Tab</kbd> to indent • <kbd className="font-sans">Enter</kbd> to continue</span>
        </div>
      </div>
    );
  }
);

/**
 * Formats inline bold (**text**) and search highlighting
 */
const FormattedLineText: React.FC<{ text: string; searchQuery?: string }> = React.memo(
  ({ text, searchQuery = '' }) => {
    // Parse markdown **bold**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldContent = part.slice(2, -2);
            return (
              <strong key={i} className="font-bold text-stone-900 dark:text-stone-100">
                <HighlightText text={boldContent} highlight={searchQuery} />
              </strong>
            );
          }
          return <HighlightText key={i} text={part} highlight={searchQuery} />;
        })}
      </span>
    );
  }
);
