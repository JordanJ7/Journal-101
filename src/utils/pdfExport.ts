import { CoreCategoryConfig, CoreTopicItem, WeeklyBlock } from '../types';

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
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
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
  const subtitle = `Period: ${week.startDate} to ${week.endDate} • ${week.bullets.length} entries`;

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
      tSec.externalLinks.forEach((l) => {
        html += `<li><strong>${escapeHtml(l.title)}</strong>: ${escapeHtml(l.url)}</li>`;
      });
      html += `</ul></div>`;
    }

    if (tSec.itemsToShow.length > 0) {
      tSec.itemsToShow.forEach((item) => {
        html += `
          <div class="item-box ${item.isHighlightedAnswer ? 'highlight' : ''}">
            <div class="item-content"><strong>• ${escapeHtml(item.text)}</strong></div>
            <div class="item-meta">${item.timestamp} ${item.isHighlightedAnswer ? '• [Therapist Callout]' : ''}</div>
          </div>
        `;
      });
    }

    html += `</div>`;
  }

  // 3. Chronological Bullet Entries
  html += `
    <div class="section-card">
      <h2 class="section-title">📝 Journal Entries & Daily Bullets (${week.bullets.length})</h2>
  `;

  if (week.bullets.length === 0) {
    html += `<p style="font-style: italic; color: #78716c; text-align: center;">No bullet entries for this week.</p>`;
  } else {
    html += `<div class="bullet-list">`;
    week.bullets.forEach((b) => {
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
          ${b.mediaUrl ? `<div style="margin-top: 4px; font-size: 8.5pt; color: #2563eb;">[Attached Photo: ${escapeHtml(b.mediaUrl)}]</div>` : ''}
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
  const categoryItems = items.filter((i) => i.categoryId === category.id);
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
        </div>
      `;
    });
  }

  html += `</div>`;

  printHtmlDocument(`Core Topic: ${category.title}`, subtitle, html);
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
