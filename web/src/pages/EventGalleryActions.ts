import { getPublicImageLabel } from '../utils/gallery';
import type { EventGalleryImage } from '../services/api';

export function publicPhotoLabel(image: EventGalleryImage): string {
  for (const value of [image.caption, image.title]) {
    // Reject each candidate before choosing, so a filename caption cannot hide a useful title.
    if (
      /\.(?:jpe?g|png|webp|gif|avif|heic|heif|tiff?|cr2|cr3|nef)(?:\s*\(\d+\))?$/i.test(
        value?.trim() || ''
      )
    )
      continue;
    const label = getPublicImageLabel({ ...image, caption: value, title: null });
    if (label) return label;
  }
  return '';
}

export async function sharePhoto(
  url: string,
  title: string,
  browser: Pick<Navigator, 'share' | 'clipboard'> = navigator
): Promise<'shared' | 'copied' | 'cancelled'> {
  if (browser.share) {
    try {
      await browser.share({ url, title });
      return 'shared';
    } catch (error) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'AbortError'
      )
        return 'cancelled';
    }
  }
  await browser.clipboard.writeText(url);
  return 'copied';
}

const downloadExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/tiff': 'tiff',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif',
};

export function photoDownloadExtension(contentType: string): string {
  return downloadExtensions[contentType.split(';')[0].trim().toLowerCase()] || 'bin';
}

export function isLightboxTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, select')) return true;
  const editable = target.closest('[contenteditable]');
  return editable !== null && editable.getAttribute('contenteditable')?.toLowerCase() !== 'false';
}

export async function downloadPhoto(url: string, filenameStem: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Photo unavailable');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${filenameStem}.${photoDownloadExtension(blob.type)}`;
  document.body.append(link);
  link.click();
  link.remove();
  // Allow the browser to consume the object URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
