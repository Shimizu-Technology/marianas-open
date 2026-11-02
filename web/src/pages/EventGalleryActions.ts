import { getPublicImageLabel } from '../utils/gallery';
import type { EventGalleryImage } from '../services/api';

export function publicPhotoLabel(image: EventGalleryImage): string {
  const label = getPublicImageLabel(image);
  return /\.(?:jpe?g|png|webp|avif|heic|tiff?|cr2|cr3|nef)(?:\s*\(\d+\))?$/i.test(label)
    ? ''
    : label;
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

export async function downloadPhoto(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Photo unavailable');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Allow the browser to consume the object URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
