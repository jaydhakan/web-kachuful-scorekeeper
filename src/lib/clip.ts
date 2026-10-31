/** Copies text; false when the browser refuses (no permission, insecure page). */
export async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

/** The system share sheet for a link, where there is one. */
export const canShareLink = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';
export async function shareLink(url: string, text?: string) {
  try {
    await navigator.share({ url, text });
  } catch {
    /* dismissed */
  }
}
