/** "7 Nov 2026, 10:30 am IST" in the given IANA time zone. */
export function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(date);
}

/** "7 Nov 2026" in the given IANA time zone. */
export function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(date);
}
