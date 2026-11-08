/** Opens a short-lived download link in a new tab without leaving the app. */
export function openLink(url: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
