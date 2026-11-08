const LOCALE = 'en-IN';

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const fullDateFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const rupeeFormat = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** "10:30 am" in the viewer's own time zone. */
export const formatTime = (iso: string | Date): string => timeFormat.format(new Date(iso));

/** "10:30 am to 11:00 am" */
export const formatTimeRange = (startIso: string, endIso: string): string =>
  `${formatTime(startIso)} to ${formatTime(endIso)}`;

/** "Tuesday, 4 November" */
export const formatFullDate = (iso: string | Date): string => fullDateFormat.format(new Date(iso));

/** "₹500" */
export const formatRupees = (amount: number): string => rupeeFormat.format(amount);

/** "Dr. Anita Sharma" -> "AS" (the "Dr." prefix is skipped). */
export function getInitials(name: string): string {
  const parts = name
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
