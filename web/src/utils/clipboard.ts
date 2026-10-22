/** Copy text to the clipboard. Returns true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / non-HTTPS: fall back to a hidden textarea.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Share text with the phone's share sheet when available (Android/iOS),
 * otherwise copy it. Returns 'shared' | 'copied' | 'failed'.
 */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      // User closed the share sheet: not an error worth showing.
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed';
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}
