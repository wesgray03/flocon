export function money(n?: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/**
 * Format a date string for display (prevents timezone conversion issues)
 * @param d - ISO date string (YYYY-MM-DD) or full ISO datetime
 * @returns Formatted date string or '—' if null/undefined
 */
export function dateStr(d?: string | null): string {
  if (!d) return '—';

  // If it's just a date (YYYY-MM-DD), parse it as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [year, month, day] = d.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  }

  // For full ISO datetime strings, use standard parsing
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

/**
 * Convert a date to YYYY-MM-DD format for database storage
 * Handles timezone issues by using local date components
 * @param date - Date object or date string
 * @returns YYYY-MM-DD string
 */
export function toDateString(date?: Date | string | null): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date as YYYY-MM-DD string
 */
export function todayString(): string {
  return toDateString(new Date());
}

/**
 * Parse a date string (YYYY-MM-DD) into a Date object without timezone issues
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object set to local midnight, or null if invalid
 */
export function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}
