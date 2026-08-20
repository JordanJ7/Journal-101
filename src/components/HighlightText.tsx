import React, { useMemo } from 'react';

interface HighlightTextProps {
  text?: string | null;
  highlight?: string;
  className?: string;
}

/**
 * Clean, safe, high-performance component that highlights matching search terms in text in real time.
 * Utilizes useMemo to cache regex construction and text splitting for fast re-rendering.
 */
export const HighlightText: React.FC<HighlightTextProps> = React.memo(({
  text,
  highlight,
  className = '',
}) => {
  if (!text) return null;
  if (!highlight || !highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  const query = highlight.trim();

  const parts = useMemo(() => {
    // Safely escape special regex characters
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.split(regex);
  }, [text, query]);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return isMatch ? (
          <mark
            key={i}
            data-search-match="true"
            className="search-highlight-mark bg-amber-200 dark:bg-amber-500/35 text-stone-950 dark:text-amber-100 font-bold px-0.5 py-0.2 rounded-xs shadow-2xs inline-block"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </span>
  );
});
