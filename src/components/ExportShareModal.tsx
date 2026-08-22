import { Check, Copy, Download, FileDown, FileText, Printer, Share2, X } from 'lucide-react';
import React, { useState } from 'react';
import { CoreCategoryConfig, CoreTopicItem, WeeklyBlock } from '../types';
import { exportCoreCategoryToPDF, exportWeekToPDF } from '../utils/pdfExport';
import { createShareableLink, formatTimestamp, generateMarkdownExport } from '../utils/storage';

interface ExportShareModalProps {
  weeks: WeeklyBlock[];
  coreItems: CoreTopicItem[];
  coreCategories: CoreCategoryConfig[];
  onClose: () => void;
}

export const ExportShareModal: React.FC<ExportShareModalProps> = ({
  weeks,
  coreItems,
  coreCategories,
  onClose,
}) => {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState<string>(weeks[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(coreCategories[0]?.id || '');

  const handleGenerateShareLink = async () => {
    setIsGenerating(true);
    try {
      const link = await createShareableLink({
        title: 'Personal Journal & Therapy Tracker - Shared View',
        createdAt: formatTimestamp(),
        weeks,
        coreItems,
      });
      setShareUrl(link);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownExport(weeks, coreItems);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Journal_Therapy_Export_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const data = JSON.stringify({ weeks, coreItems, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Journal_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSelectedWeekPDF = () => {
    const targetWeek = weeks.find((w) => w.id === selectedWeekId);
    if (targetWeek) {
      exportWeekToPDF(targetWeek);
    }
  };

  const handleExportSelectedCategoryPDF = () => {
    const targetCat = coreCategories.find((c) => c.id === selectedCategoryId);
    if (targetCat) {
      exportCoreCategoryToPDF(targetCat, coreItems);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="export-share-modal-overlay"
      className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150 transform-gpu will-change-transform isolate"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-2xl max-w-lg w-full space-y-4 max-h-[90dvh] overflow-y-auto relative pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 transform-gpu will-change-transform isolate">
        <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-600 mx-auto sm:hidden mb-2 shrink-0" />
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-600" />
            <span>Export & Share Journal</span>
          </h3>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Individual PDF Export for Therapy Review */}
        <div className="bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/70 space-y-3 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
            <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Export PDF for Therapy Review</span>
          </h4>

          <div className="space-y-3 pt-1 min-w-0">
            {/* Week PDF Selector */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-blue-950 dark:text-blue-200 block">
                Select Week
              </label>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center min-w-0">
                <div className="flex-1 min-w-0">
                  <select
                    value={selectedWeekId}
                    onChange={(e) => setSelectedWeekId(e.target.value)}
                    className="w-full min-w-0 truncate p-2.5 text-base sm:text-xs bg-white dark:bg-stone-900 border border-blue-300 dark:border-blue-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {weeks.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.weekTitle} ({w.startDate})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleExportSelectedWeekPDF}
                  className="min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-2xs whitespace-nowrap"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export Week</span>
                </button>
              </div>
            </div>

            {/* Core Topic Category PDF Selector */}
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] font-semibold text-blue-950 dark:text-blue-200 block">
                Select Topic Folder
              </label>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center min-w-0">
                <div className="flex-1 min-w-0">
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full min-w-0 truncate p-2.5 text-base sm:text-xs bg-white dark:bg-stone-900 border border-blue-300 dark:border-blue-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {coreCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleExportSelectedCategoryPDF}
                  className="min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-2xs whitespace-nowrap"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export Topic</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Generate Shareable Link */}
        <div className="bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2.5">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
            Shareable View-Only Link
          </h4>

          {shareUrl ? (
            <div className="space-y-2 pt-1">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full p-2.5 text-xs font-mono bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="w-full min-h-[44px] py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Link Copied to Clipboard!' : 'Copy Share Link'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateShareLink}
              disabled={isGenerating}
              className="w-full min-h-[44px] py-2.5 bg-stone-800 dark:bg-stone-700 hover:bg-stone-900 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              {isGenerating ? 'Generating Link...' : 'Generate View-Only Link'}
            </button>
          )}
        </div>

        {/* Section 3: Download Markdown & JSON */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
            Backup Files & Print
          </h4>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadMarkdown}
              className="min-h-[48px] p-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-2xl border border-stone-200 dark:border-stone-700 flex flex-col items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Markdown (.md)</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="min-h-[48px] p-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-2xl border border-stone-200 dark:border-stone-700 flex flex-col items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>JSON Backup (.json)</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="w-full min-h-[44px] py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Print Entire Journal</span>
          </button>
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="min-h-[44px] px-4 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:underline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
