export type ShareOutcome = 'shared' | 'saved' | 'cancelled' | 'failed';

export const canShareFiles = (file: File): boolean =>
  typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Shares the image through the system sheet when the browser can share files; otherwise downloads it
 * and copies the text summary. Must be called from a click handler (browsers require a user gesture).
 */
export async function shareScores(
  blob: Blob,
  text: string,
  title = 'Kachuful scores',
): Promise<ShareOutcome> {
  const file = new File([blob], 'kachuful-scores.png', { type: 'image/png' });
  try {
    if (canShareFiles(file)) {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    }
    download(blob, file.name);
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    return 'saved';
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

export async function copySummary(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
