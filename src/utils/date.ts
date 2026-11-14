/**
 * Date helpers.
 *
 * Dates in this app are stored as local "YYYY-MM-DD" strings. Using
 * `toISOString()` would convert to UTC first, which can shift the date by a day
 * for users east or west of UTC (e.g. logging a memory late at night).
 */

export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Validates both the shape (YYYY-MM-DD) and that the calendar date exists. */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}
