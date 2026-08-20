/**
 * Security & Input Sanitization Utilities
 */

/**
 * Sanitizes URLs to prevent Cross-Site Scripting (XSS) via javascript: or data: URIs.
 * Returns a safe URL or '#' if invalid/malicious.
 */
export function sanitizeUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // Allow standard relative paths, http, https, and mailto
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }

  // Detect and neutralize dangerous protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    console.warn(`[Security Warning] Blocked malicious/unsafe URI protocol: ${trimmed}`);
    return '#';
  }

  // Auto-prefix naked domain URLs with https:// if valid domain pattern
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Strips dangerous HTML tags and script injections from raw user text strings.
 */
export function sanitizeText(input?: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}
