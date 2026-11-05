import { Attachment, CoreCategoryConfig, CoreTopicItem, WeeklyBlock } from '../types';
import { formatWeekDateRange } from './dateUtils';
import { getNormalizedAttachments, isPdfMedia, isVideoMedia } from './mediaUtils';

const isImageUrl = (url: string) =>
  /^data:image\//i.test(url) || /\.(png|jpe?g|gif|webp|avif|heic|bmp)(\?|$)/i.test(url) || /%2Fimages%2F/i.test(url);

/**
 * Renders an item's photos and videos inline so they appear in the PDF under the entry they belong to.
 * Videos can't play inside a printed PDF, so they show a still frame (the stored thumbnail, or the
 * video's own first frame) labelled as a video.
 */
function renderMediaHtml(attachments: Attachment[]): string {
  const media = attachments.filter((a) => a && a.url);
  if (media.length === 0) return '';
  const figures = media.map((a) => {
    const caption = escapeHtml(a.caption || (a.name && a.name !== 'Attached Media' ? a.name : ''));
    if (a.type === 'pdf' || isPdfMedia(a.url)) {
      return `<div class="media-file">📄 PDF attachment${caption ? `: ${caption}` : ''}</div>`;
    }
    if (a.type === 'video' || isVideoMedia(a.url)) {
      const poster = a.thumbnailUrl ? ` poster="${escapeAttr(a.thumbnailUrl)}"` : '';
      return `<figure class="media-item">
          <div class="media-frame"><video src="${escapeAttr(a.url)}#t=0.5"${poster} preload="auto" muted playsinline></video><span class="video-badge">▶ Video</span></div>
          ${caption ? `<figcaption>${caption}</figcaption>` : ''}
        </figure>`;
    }
    return `<figure class="media-item">
        <div class="media-frame"><img src="${escapeAttr(a.url)}" alt="${caption}" /></div>
        ${caption ? `<figcaption>${caption}</figcaption>` : ''}
      </figure>`;
  });
  return `<div class="media-grid${media.length === 1 ? ' single' : ''}">${figures.join('')}</div>`;
}

/**
 * Opens a print-formatted window that converts cleanly to PDF via browser print.
 */
function printHtmlDocument(title: string, subtitle: string, bodyContentHtml: string) {
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    // Fallback if popups are blocked
    window.print();
    return;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${title} - Therapy Review PDF</title>
        <style>
          @page {
            size: letter;
            margin: 18mm 16mm;
          }
          *, *:before, *:after {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1c1917;
            background: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            font-size: 10.5pt;
          }
          .media-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-top: 8px;
          }
          .media-grid.single {
            grid-template-columns: minmax(0, 62%);
          }
          .media-item {
            margin: 0;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .media-frame {
            position: relative;
            border: 1px solid #e7e5e4;
            border-radius: 8px;
            overflow: hidden;
            background: #f5f5f4;
          }
          .media-frame img,
          .media-frame video {
            display: block;
            width: 100%;
            max-height: 3.6in;
            object-fit: contain;
          }
          .video-badge {
            position: absolute;
            left: 6px;
            bottom: 6px;
            font-size: 8pt;
            font-weight: 700;
            color: #ffffff;
            background: rgba(0, 0, 0, 0.6);
            padding: 2px 7px;
            border-radius: 999px;
          }
          .media-item figcaption {
            font-size: 8.5pt;
            color: #57534e;
            margin-top: 3px;
          }
          .media-file {
            font-size: 9pt;
            color: #44403c;
            margin-top: 6px;
          }
          .media-loading {
            position: fixed;
            top: 8px;
            right: 8px;
            font-size: 9pt;
            background: #1c1917;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 999px;
          }
          @media print {
            .media-loading { display: none; }
          }
          .header {
            border-bottom: 2.5px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-title {
            margin: 0;
            font-size: 18pt;
            font-weight: 800;
            color: #1e3a8a;
            line-height: 1.2;
          }
          .header-subtitle {
            margin: 4px 0 0 0;
            font-size: 10pt;
            color: #57534e;
            font-weight: 500;
          }
          .doc-badge {
            display: inline-block;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1e40af;
            font-size: 8.5pt;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .section-card {
            border: 1px solid #e7e5e4;
            border-radius: 10px;
            padding: 14px 16px;
            margin-bottom: 16px;
            background: #fafaf9;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 12pt;
            font-weight: 700;
            color: #1c1917;
            margin: 0 0 10px 0;
            padding-bottom: 6px;
            border-bottom: 1.5px solid #e7e5e4;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .item-box {
            background: #ffffff;
            border: 1px solid #d6d3d1;
            border-radius: 8px;
            padding: 10px 12px;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          .item-box.highlight {
            background: #f0f9ff;
            border: 1.5px solid #3b82f6;
          }
          .item-title {
            font-weight: 700;
            font-size: 11pt;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .item-meta {
            font-size: 8.5pt;
            color: #78716c;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            margin-bottom: 6px;
          }
          .item-content {
            font-size: 10pt;
            color: #292524;
            white-space: pre-wrap;
            line-height: 1.5;
          }
          .therapist-callout {
            margin-top: 8px;
            padding: 8px 10px;
            background: #eff6ff;
            border-left: 3.5px solid #2563eb;
            border-radius: 4px;
            font-size: 9.5pt;
            color: #1e3a8a;
          }
          .therapist-callout-title {
            font-weight: 700;
            font-size: 9pt;
            color: #1d4ed8;
            margin-bottom: 2px;
          }
          .bullet-list {
            margin: 0;
            padding-left: 0;
            list-style: none;
          }
          .bullet-entry {
            margin-bottom: 8px;
            padding: 8px 10px;
            background: #ffffff;
            border-left: 3px solid #78716c;
            border-radius: 4px;
            page-break-inside: avoid;
          }
          .bullet-entry.indent-1 {
            margin-left: 18px;
            border-left-color: #3b82f6;
          }
          .bullet-entry.indent-2 {
            margin-left: 36px;
            border-left-color: #8b5cf6;
          }
          .bullet-entry.highlight {
            background: #eff6ff;
            border-left: 4px solid #2563eb;
          }
          .footer {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #e7e5e4;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8.5pt;
            color: #a8a29e;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="header-title">${title}</h1>
            <p class="header-subtitle">${subtitle}</p>
          </div>
          <div class="doc-badge">Therapy Review Document</div>
        </div>

        ${bodyContentHtml}

        <div class="footer">
          <span>Personal Journal & Therapy Review</span>
          <span>Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>Confidential</span>
        </div>

        <script>
          // Print only once photos and video frames have loaded (or failed), so they appear in the PDF.
          function mediaReady(el) {
            return new Promise(function(resolve) {
              if (el.tagName === 'IMG') {
                if (el.complete) return resolve();
                el.addEventListener('load', resolve, { once: true });
                el.addEventListener('error', resolve, { once: true });
              } else {
                if (el.readyState >= 2) return resolve();
                el.addEventListener('loadeddata', resolve, { once: true });
                el.addEventListener('error', resolve, { once: true });
              }
            });
          }
          window.onload = function() {
            var els = Array.prototype.slice.call(document.querySelectorAll('img, video'));
            var banner = null;
            if (els.length) {
              banner = document.createElement('div');
              banner.className = 'media-loading';
              banner.textContent = 'Loading ' + els.length + ' photo' + (els.length === 1 ? '' : 's') + ' and videos…';
              document.body.appendChild(banner);
            }
            var timeout = new Promise(function(resolve) { setTimeout(resolve, 20000); });
            Promise.race([Promise.all(els.map(mediaReady)), timeout]).then(function() {
              if (banner) banner.remove();
              setTimeout(function() { window.print(); }, 300);
            });
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(fullHtml);
  printWindow.document.close();
}

/**
 * Export an individual weekly journal block as a clean PDF for therapy review.
 */
export function exportWeekToPDF(week: WeeklyBlock) {
  // Entries in Recently Deleted are kept with a deletedAt stamp; they don't belong in the export.
  const bullets = week.bullets.filter((b) => !b.deletedAt);
  const subtitle = `Period: ${formatWeekDateRange(week.startDate, week.endDate)} • ${bullets.length} entries`;

  let html = '';

  // 1. Homework & Assignments Section
  const assign = week.assignments;
  if (assign.readBookEnabled || assign.watchMovieEnabled || (assign.answerDesQuestionsEnabled && assign.desQuestions.length > 0)) {
    html += `
      <div class="section-card">
        <h2 class="section-title">📘 Weekly Homework & Prep Tasks</h2>
    `;

    if (assign.readBookEnabled && assign.readBookTitle) {
      html += `
        <div class="item-box">
          <div class="item-title">Book Reading: ${escapeHtml(assign.readBookTitle)}</div>
          ${assign.readBookProgress ? `<div class="item-content">${escapeHtml(assign.readBookProgress)}</div>` : ''}
        </div>
      `;
    }

    if (assign.watchMovieEnabled && assign.watchMovieTitle) {
      html += `
        <div class="item-box">
          <div class="item-title">Movie Watch: ${escapeHtml(assign.watchMovieTitle)}</div>
          ${assign.watchMovieThoughts ? `<div class="item-content">${escapeHtml(assign.watchMovieThoughts)}</div>` : ''}
        </div>
      `;
    }

    if (assign.answerDesQuestionsEnabled && assign.desQuestions.length > 0) {
      html += `<div style="margin-top: 10px; font-weight: 700; font-size: 10pt; color: #1c1917;">Questions from Therapist Des:</div>`;
      assign.desQuestions.forEach((q) => {
        html += `
          <div class="item-box ${q.highlightAnswer ? 'highlight' : ''}">
            <div class="item-title">Q: ${escapeHtml(q.question)}</div>
            <div class="item-meta">Recorded: ${q.timestamp} ${q.highlightAnswer ? '• [HIGHLIGHTED ANSWER]' : ''}</div>
            <div class="item-content">${q.answer ? escapeHtml(q.answer) : '<em>No answer written yet.</em>'}</div>
          </div>
        `;
      });
    }

    html += `</div>`;
  }

  // 2. Therapist Desk: "Things to Show Des"
  const tSec = week.therapistSection;
  if (tSec.itemsToShow.length > 0 || tSec.externalLinks.length > 0) {
    html += `
      <div class="section-card">
        <h2 class="section-title">⭐ ${escapeHtml(tSec.title)} (Therapist Desk)</h2>
    `;

    if (tSec.externalLinks.length > 0) {
      html += `<div style="margin-bottom: 10px; font-size: 9.5pt;"><strong>Shared Photo Albums & External Links:</strong><ul>`;
      const embeddable = tSec.externalLinks.filter((l) => isImageUrl(l.url) || (isVideoMedia(l.url) && !/youtu|vimeo/i.test(l.url)));
      tSec.externalLinks
        .filter((l) => !embeddable.includes(l))
        .forEach((l) => {
          html += `<li><strong>${escapeHtml(l.title)}</strong>: ${escapeHtml(l.url)}</li>`;
        });
      html += `</ul>`;
      html += renderMediaHtml(
        embeddable.map((l) => ({
          id: l.id,
          url: l.url,
          type: isVideoMedia(l.url) ? 'video' : 'image',
          name: l.title,
          caption: l.title,
          thumbnailUrl: l.thumbnailUrl,
          createdAt: l.addedAt || '',
        }))
      );
      html += `</div>`;
    }

    if (tSec.itemsToShow.length > 0) {
      tSec.itemsToShow.forEach((item) => {
        html += `
          <div class="item-box ${item.isHighlightedAnswer ? 'highlight' : ''}">
            <div class="item-content"><strong>• ${escapeHtml(item.text)}</strong></div>
            <div class="item-meta">${item.timestamp} ${item.isHighlightedAnswer ? '• [Therapist Callout]' : ''}</div>
            ${renderMediaHtml(getNormalizedAttachments({ mediaUrl: item.mediaUrl }))}
          </div>
        `;
      });
    }

    html += `</div>`;
  }

  // 3. Chronological Bullet Entries
  html += `
    <div class="section-card">
      <h2 class="section-title">📝 Journal Entries & Daily Bullets (${bullets.length})</h2>
  `;

  if (bullets.length === 0) {
    html += `<p style="font-style: italic; color: #78716c; text-align: center;">No bullet entries for this week.</p>`;
  } else {
    html += `<div class="bullet-list">`;
    bullets.forEach((b) => {
      const indentClass = b.indent === 1 ? 'indent-1' : b.indent === 2 ? 'indent-2' : '';
      const highlightClass = b.isAnswerHighlight ? 'highlight' : '';
      const checkMark = b.completed ? '✓ ' : '';

      html += `
        <div class="bullet-entry ${indentClass} ${highlightClass}">
          <div style="font-size: 10pt; color: #1c1917;">
            ${checkMark}<strong>${escapeHtml(b.text)}</strong>
          </div>
          <div class="item-meta" style="margin-top: 3px; margin-bottom: 0;">
            ${b.timestamp} ${b.isAnswerHighlight ? '• [THERAPIST HIGHLIGHT ANSWER]' : ''}
          </div>
          ${renderMediaHtml(getNormalizedAttachments(b))}
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;

  printHtmlDocument(week.weekTitle, subtitle, html);
}

/**
 * Export an individual Core Topic Category as a clean PDF for therapy review.
 */
export function exportCoreCategoryToPDF(category: CoreCategoryConfig, items: CoreTopicItem[]) {
  const categoryItems = items.filter((i) => i.categoryId === category.id && !i.deletedAt);
  const subtitle = `Category: ${category.title} • ${categoryItems.length} entries recorded`;

  let html = `
    <div class="section-card">
      <div style="font-size: 11pt; color: #44403c; margin-bottom: 12px; font-weight: 500;">
        ${escapeHtml(category.description)}
      </div>
  `;

  if (categoryItems.length === 0) {
    html += `<p style="font-style: italic; color: #78716c; text-align: center; padding: 20px;">No entries saved under this topic yet.</p>`;
  } else {
    categoryItems.forEach((item, index) => {
      const highlightClass = item.isHighlightedAnswer ? 'highlight' : '';
      html += `
        <div class="item-box ${highlightClass}" style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div class="item-title">#${index + 1}. ${escapeHtml(item.title)}</div>
            ${item.status ? `<span style="font-size: 8pt; font-weight: bold; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px;">${escapeHtml(item.status)}</span>` : ''}
          </div>

          <div class="item-meta">
            Recorded: ${item.timestamp} ${item.dateTag ? `• Date Tag: ${escapeHtml(item.dateTag)}` : ''} ${item.location ? `• Location: ${escapeHtml(item.location)}` : ''} ${item.priority ? `• Priority: ${escapeHtml(item.priority)}` : ''}
          </div>

          ${item.content ? `<div class="item-content" style="margin-top: 6px;">${escapeHtml(item.content)}</div>` : ''}

          ${item.answers ? `
            <div class="therapist-callout">
              <div class="therapist-callout-title">Therapist Des Feedback / Answer:</div>
              <div>${escapeHtml(item.answers)}</div>
            </div>
          ` : ''}

          ${item.notes ? `<div style="margin-top: 6px; font-size: 9pt; color: #57534e; font-style: italic;">Notes: ${escapeHtml(item.notes)}</div>` : ''}

          ${renderMediaHtml(getNormalizedAttachments(item))}
        </div>
      `;
    });
  }

  html += `</div>`;

  printHtmlDocument(`Core Topic: ${category.title}`, subtitle, html);
}

export interface SessionPrepExportItem {
  id: string;
  text: string;
  timestamp?: string;
  weekTitle?: string;
  discussed?: boolean;
}

export function exportSessionPrepToPDF(options: {
  nextSessionAt?: string | null;
  items: SessionPrepExportItem[];
  notes?: string;
}) {
  const { nextSessionAt, items, notes } = options;
  const toDiscuss = items.filter((i) => !i.discussed);
  const alreadyDiscussed = items.filter((i) => i.discussed);

  let sessionSubtitle = 'Session Agenda & Preparation';
  if (nextSessionAt) {
    const d = new Date(nextSessionAt);
    if (!isNaN(d.getTime())) {
      sessionSubtitle = `Next Session: ${d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    }
  }

  let html = `
    <div class="section-card">
      <div style="font-size: 13pt; font-weight: 700; color: #1c1917; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <span>Items to Discuss in Session (${toDiscuss.length})</span>
        <span style="font-size: 9pt; font-weight: 600; color: #6b7280; text-transform: uppercase;">Checklist</span>
      </div>
  `;

  if (toDiscuss.length === 0) {
    html += `<p style="font-style: italic; color: #78716c; padding: 12px 0;">No pending items marked for this session.</p>`;
  } else {
    toDiscuss.forEach((item) => {
      html += `
        <div class="item-box" style="margin-bottom: 10px; padding: 10px 12px;">
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #4b5563; border-radius: 3px; margin-top: 2px; flex-shrink: 0;"></span>
            <div style="flex: 1;">
              <div style="font-size: 10.5pt; font-weight: 600; color: #1f2937;">${escapeHtml(item.text)}</div>
              <div class="item-meta" style="margin-top: 4px;">
                ${item.weekTitle ? `From: ${escapeHtml(item.weekTitle)}` : ''} ${item.timestamp ? `• ${escapeHtml(item.timestamp)}` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }

  html += `</div>`;

  if (notes && notes.trim()) {
    html += `
      <div class="section-card" style="margin-top: 16px;">
        <div style="font-size: 12pt; font-weight: 700; color: #1c1917; margin-bottom: 8px;">
          Anything else to remember to say?
        </div>
        <div style="font-size: 10pt; line-height: 1.6; color: #374151; white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">
          ${escapeHtml(notes.trim())}
        </div>
      </div>
    `;
  }

  if (alreadyDiscussed.length > 0) {
    html += `
      <div class="section-card" style="margin-top: 16px;">
        <div style="font-size: 11pt; font-weight: 700; color: #4b5563; margin-bottom: 8px;">
          Already Discussed (${alreadyDiscussed.length})
        </div>
    `;
    alreadyDiscussed.forEach((item) => {
      html += `
        <div class="item-box" style="margin-bottom: 6px; padding: 8px 10px; background: #fafafa; opacity: 0.85;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #10b981; font-weight: bold;">✓</span>
            <span style="font-size: 9.5pt; text-decoration: line-through; color: #6b7280;">${escapeHtml(item.text)}</span>
            ${item.weekTitle ? `<span style="font-size: 8.5pt; color: #9ca3af; margin-left: auto;">(${escapeHtml(item.weekTitle)})</span>` : ''}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  printHtmlDocument('Therapy Session Prep', sessionSubtitle, html);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str: string): string {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
