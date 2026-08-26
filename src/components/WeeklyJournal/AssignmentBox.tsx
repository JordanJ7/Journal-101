import { BookOpen, Calendar, Clock, Edit2, Film, HelpCircle, MessageSquare, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { AccentTheme, AssignmentSwitches, DesQuestion } from '../../types';
import { ACCENT_THEMES } from '../../utils/theme';
import { formatTimestamp } from '../../utils/storage';
import { useConfirmDelete } from '../ConfirmDeleteModal';
import { HighlightText } from '../HighlightText';
import { useJournalStore, useSaveStatus } from '../../store/useJournalStore';
import { TimestampPickerPopover } from './TimestampPickerPopover';
import { SaveStatusBadge } from '../SaveStatusBadge';

const AssignmentSaveBadge = React.memo(() => {
  const saveStatus = useSaveStatus();
  return <SaveStatusBadge status={saveStatus === 'unsaved' ? 'countdown' : saveStatus} secondsRemaining={2} />;
});
AssignmentSaveBadge.displayName = 'AssignmentSaveBadge';

interface AssignmentBoxProps {
  assignments: AssignmentSwitches;
  onUpdate: (updated: AssignmentSwitches) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onOpenCommentSection?: (sectionTag: string) => void;
  activeCommentSectionTag?: string;
  searchQuery?: string;
  accentTheme?: AccentTheme;
}

export const AssignmentBox: React.FC<AssignmentBoxProps> = React.memo(({
  assignments,
  onUpdate,
  canEdit = false,
  canDelete = false,
  onOpenCommentSection,
  activeCommentSectionTag,
  searchQuery,
  accentTheme = 'amber',
}) => {
  const [newQuestionText, setNewQuestionText] = useState('');
  const [activeDateEditingQuestionId, setActiveDateEditingQuestionId] = useState<string | null>(null);
  const currentAccent = ACCENT_THEMES[accentTheme] || ACCENT_THEMES.amber;

  const isHomeworkHighlighted =
    activeCommentSectionTag === 'Homework' ||
    activeCommentSectionTag === 'Homework & Reading' ||
    activeCommentSectionTag?.toLowerCase().includes('homework') ||
    activeCommentSectionTag?.toLowerCase().includes('book') ||
    activeCommentSectionTag?.toLowerCase().includes('movie');

  const isDesQAHighlighted =
    activeCommentSectionTag === 'Des Q&A' ||
    activeCommentSectionTag?.toLowerCase().includes('des q&a') ||
    activeCommentSectionTag?.toLowerCase().includes('des question');

  const toggleSwitch = (key: keyof AssignmentSwitches) => {
    if (!canEdit) return;
    onUpdate({
      ...assignments,
      [key]: !assignments[key],
    });
  };

  const updateField = (key: keyof AssignmentSwitches, value: any) => {
    if (!canEdit) return;
    onUpdate({
      ...assignments,
      [key]: value,
    });
  };

  const addDesQuestion = () => {
    if (!canEdit || !newQuestionText.trim()) return;
    const newQ: DesQuestion = {
      id: 'q-' + Date.now(),
      question: newQuestionText.trim(),
      answer: '',
      timestamp: formatTimestamp(),
    };
    onUpdate({
      ...assignments,
      desQuestions: [...assignments.desQuestions, newQ],
    });
    setNewQuestionText('');
  };

  const updateDesQuestion = (id: string, answerText: string, highlight?: boolean) => {
    if (!canEdit) return;
    const updated = assignments.desQuestions.map((q) =>
      q.id === id
        ? {
            ...q,
            answer: answerText,
            timestamp: q.timestamp || formatTimestamp(),
            highlightAnswer: highlight !== undefined ? highlight : q.highlightAnswer,
          }
        : q
    );
    onUpdate({ ...assignments, desQuestions: updated });
  };

  const updateDesQuestionTimestamp = (id: string, newTimestamp: string, newIsoDate: string, isCustom: boolean) => {
    if (!canEdit) return;
    const updated = assignments.desQuestions.map((q) =>
      q.id === id
        ? {
            ...q,
            timestamp: newTimestamp,
            isoDate: newIsoDate,
            isCustomDate: isCustom,
          }
        : q
    );
    onUpdate({ ...assignments, desQuestions: updated });
  };

  const { confirmDelete } = useConfirmDelete();

  const deleteDesQuestion = (id: string) => {
    if (!canEdit) return;
    confirmDelete({
      title: 'Delete Question?',
      message: 'Are you sure you want to delete this question and your response? This cannot be undone.',
      confirmText: 'Delete Question',
      onConfirm: () => {
        const updated = assignments.desQuestions.filter((q) => q.id !== id);
        onUpdate({ ...assignments, desQuestions: updated });
      },
    });
  };

  return (
    <div
      id="section-assignments"
      className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs transition-all duration-300 ${
        isHomeworkHighlighted || isDesQAHighlighted
          ? 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/50 shadow-md'
          : 'bg-stone-50/50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800'
      }`}
    >
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>Weekly Homework & Task Switches</span>
          </h3>
          {(isHomeworkHighlighted || isDesQAHighlighted) && (
            <span className="text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <MessageSquare className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
              Active Comment Area
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AssignmentSaveBadge />
          {onOpenCommentSection && (
            <button
              type="button"
              onClick={() => onOpenCommentSection('Homework & Reading')}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3 h-3 text-[#2563EB]" />
              <span>Comment on Tasks</span>
            </button>
          )}
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono font-semibold">Therapy Prep</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Switch 1: Read a Book */}
        <div
          className={`p-3.5 rounded-xl border transition-all duration-200 ${
            activeCommentSectionTag?.toLowerCase().includes('book')
              ? `${currentAccent.iconBoxSelected} ${currentAccent.activeBorder}`
              : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
              <BookOpen className={`w-4 h-4 ${currentAccent.textPrimary}`} />
              <span>Need to read a book before next session?</span>
            </label>
            <input
              type="checkbox"
              checked={assignments.readBookEnabled}
              onChange={() => toggleSwitch('readBookEnabled')}
              disabled={!canEdit}
              className={`w-4 h-4 rounded ${currentAccent.textPrimary} cursor-pointer disabled:opacity-50`}
            />
          </div>

          {assignments.readBookEnabled && (
            <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Attached by Amir Levine"
                  value={assignments.readBookTitle}
                  onChange={(e) => updateField('readBookTitle', e.target.value)}
                  readOnly={!canEdit}
                  className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-medium placeholder-stone-500 dark:placeholder-stone-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Progress & Notes
                </label>
                <div
                  className="w-full relative transform-gpu typing-isolation-container"
                  style={{
                    contain: 'layout paint',
                    willChange: 'contents',
                    transform: 'translateZ(0)',
                  }}
                >
                  <textarea
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(52, el.scrollHeight)}px`;
                      }
                    }}
                    placeholder="Chapter notes, key takeaways, pages read..."
                    value={assignments.readBookProgress}
                    onChange={(e) => {
                      updateField('readBookProgress', e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onBlur={() => useJournalStore.getState().flushAutoSave()}
                    readOnly={!canEdit}
                    rows={2}
                    className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-medium placeholder-stone-500 dark:placeholder-stone-400 min-h-[52px] resize-none overflow-hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Switch 2: Watch a Movie */}
        <div
          className={`p-3.5 rounded-xl border transition-all duration-200 ${
            activeCommentSectionTag?.toLowerCase().includes('movie')
              ? `${currentAccent.iconBoxSelected} ${currentAccent.activeBorder}`
              : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
              <Film className={`w-4 h-4 ${currentAccent.textPrimary}`} />
              <span>Need to watch a movie before next session?</span>
            </label>
            <input
              type="checkbox"
              checked={assignments.watchMovieEnabled}
              onChange={() => toggleSwitch('watchMovieEnabled')}
              disabled={!canEdit}
              className={`w-4 h-4 rounded ${currentAccent.textPrimary} cursor-pointer disabled:opacity-50`}
            />
          </div>

          {assignments.watchMovieEnabled && (
            <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Movie Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Good Will Hunting"
                  value={assignments.watchMovieTitle}
                  onChange={(e) => updateField('watchMovieTitle', e.target.value)}
                  onBlur={() => useJournalStore.getState().flushAutoSave()}
                  readOnly={!canEdit}
                  className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-medium placeholder-stone-500 dark:placeholder-stone-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Thoughts & Emotional Reactions
                </label>
                <div
                  className="w-full relative transform-gpu typing-isolation-container"
                  style={{
                    contain: 'layout paint',
                    willChange: 'contents',
                    transform: 'translateZ(0)',
                  }}
                >
                  <textarea
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(52, el.scrollHeight)}px`;
                      }
                    }}
                    placeholder="What resonated with you? Character dynamics..."
                    value={assignments.watchMovieThoughts}
                    onChange={(e) => {
                      updateField('watchMovieThoughts', e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onBlur={() => useJournalStore.getState().flushAutoSave()}
                    readOnly={!canEdit}
                    rows={2}
                    className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-medium placeholder-stone-500 dark:placeholder-stone-400 min-h-[52px] resize-none overflow-hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Switch 3: Answer Questions from Des */}
        <div
          className={`p-3.5 rounded-xl border transition-all duration-200 ${
            isDesQAHighlighted
              ? `${currentAccent.iconBoxSelected} ${currentAccent.activeBorder}`
              : 'bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
              <HelpCircle className={`w-4 h-4 ${currentAccent.textPrimary}`} />
              <span>Need to answer questions from Des?</span>
            </label>
            <div className="flex items-center gap-2">
              {onOpenCommentSection && (
                <button
                  type="button"
                  onClick={() => onOpenCommentSection('Des Q&A')}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md flex items-center gap-1 transition-colors"
                >
                  <MessageSquare className={`w-3 h-3 ${currentAccent.textPrimary}`} />
                  <span>Comment</span>
                </button>
              )}
              <input
                type="checkbox"
                checked={assignments.answerDesQuestionsEnabled}
                onChange={() => toggleSwitch('answerDesQuestionsEnabled')}
                disabled={!canEdit}
                className={`w-4 h-4 rounded ${currentAccent.textPrimary} cursor-pointer disabled:opacity-50`}
              />
            </div>
          </div>

          {assignments.answerDesQuestionsEnabled && (
            <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3">
              {/* Question List */}
              <div className="space-y-3">
                {assignments.desQuestions.map((q) => {
                  const isThisQuestionActive =
                    activeCommentSectionTag?.toLowerCase().includes(q.question.slice(0, 15).toLowerCase()) ||
                    (isDesQAHighlighted && assignments.desQuestions.length === 1);

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-lg border transition-all duration-200 relative ${
                        activeDateEditingQuestionId === q.id ? 'z-30' : 'z-0'
                      } ${
                        isThisQuestionActive
                          ? `ring-2 ${currentAccent.iconBoxSelected} ${currentAccent.activeBorder} shadow-sm`
                          : q.highlightAnswer
                          ? `${currentAccent.iconBoxSelected} ${currentAccent.hoverBorder} shadow-2xs`
                          : 'bg-stone-50 dark:bg-stone-900 border-stone-300 dark:border-stone-700'
                      }`}
                    >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                        Q: <HighlightText text={q.question} highlight={searchQuery} />
                      </p>
                      {canDelete && (
                        <button
                          onClick={() => deleteDesQuestion(q.id)}
                          title="Delete this question"
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 rounded text-xs font-semibold flex items-center gap-1 border border-rose-200 dark:border-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Delete</span>
                        </button>
                      )}
                    </div>

                    <div
                      className="w-full relative transform-gpu typing-isolation-container"
                      style={{
                        contain: 'layout paint',
                        willChange: 'contents',
                        transform: 'translateZ(0)',
                      }}
                    >
                      <textarea
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${Math.max(52, el.scrollHeight)}px`;
                          }
                        }}
                        placeholder="Type your reflection or answer here..."
                        value={q.answer}
                        onChange={(e) => {
                          updateDesQuestion(q.id, e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onBlur={() => useJournalStore.getState().flushAutoSave()}
                        readOnly={!canEdit}
                        rows={2}
                        className="w-full p-2.5 text-xs sm:text-sm bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-medium placeholder-stone-500 dark:placeholder-stone-400 focus:outline-none min-h-[52px] resize-none overflow-hidden"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2.5 text-xs">
                      <div className={`relative inline-block ${activeDateEditingQuestionId === q.id ? 'z-[9999]' : 'z-10'}`}>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDateEditingQuestionId(
                                activeDateEditingQuestionId === q.id ? null : q.id
                              )
                            }
                            title="Click to edit timestamp"
                            className="text-stone-600 dark:text-stone-400 font-mono text-[11px] font-semibold flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/5 min-h-[44px] px-2.5 py-1.5 rounded-xl cursor-pointer group transition-colors"
                          >
                            <Clock className={`w-3.5 h-3.5 ${currentAccent.textPrimary} shrink-0 group-hover:scale-110 transition-transform`} />
                            <span className="underline decoration-stone-300 dark:decoration-stone-700 underline-offset-2">
                              {q.timestamp}
                            </span>
                            {q.isCustomDate && (
                              <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                Custom
                              </span>
                            )}
                            <Edit2 className="w-3 h-3 text-stone-400 transition-colors" />
                          </button>
                        ) : (
                          <span className="text-stone-600 dark:text-stone-400 font-mono text-[11px] font-semibold flex items-center gap-1.5 min-h-[44px] px-2.5 py-1.5">
                            <Clock className={`w-3.5 h-3.5 ${currentAccent.textPrimary} shrink-0`} />
                            {q.timestamp}
                          </span>
                        )}

                        {activeDateEditingQuestionId === q.id && canEdit && (
                          <TimestampPickerPopover
                            currentTimestamp={q.timestamp}
                            isoDate={q.isoDate}
                            onSave={(ts, iso, isCustom) => {
                              updateDesQuestionTimestamp(q.id, ts, iso, isCustom);
                              setActiveDateEditingQuestionId(null);
                            }}
                            onClose={() => setActiveDateEditingQuestionId(null)}
                            align="left"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenCommentSection && (
                          <button
                            type="button"
                            onClick={() => onOpenCommentSection(`Des Q&A: "${q.question.slice(0, 25)}..."`)}
                            className="px-2 py-1 rounded-md text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center gap-1 transition-colors"
                            title="Add comment or feedback on this question"
                          >
                            <MessageSquare className={`w-3 h-3 ${currentAccent.textPrimary}`} />
                            <span className="text-[10px]">Comment</span>
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => updateDesQuestion(q.id, q.answer, !q.highlightAnswer)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border ${
                              q.highlightAnswer
                                ? `${currentAccent.bg500} text-white ${currentAccent.activeBorder}`
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {q.highlightAnswer ? 'Highlighted Answer' : 'Highlight Answer'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

              {/* Add New Des Question */}
              {canEdit && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Type a new question given by Des..."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addDesQuestion()}
                    className="flex-1 p-2.5 text-xs sm:text-sm bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-medium placeholder-stone-500 dark:placeholder-stone-400 focus:outline-none"
                  />
                  <button
                    onClick={addDesQuestion}
                    className={`px-4 py-2.5 text-white font-semibold text-xs rounded-md flex items-center gap-1 shrink-0 shadow-2xs ${currentAccent.buttonPrimary}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
