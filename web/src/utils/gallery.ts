import type { EventGalleryImage } from '../services/api';

/** Camera/file IDs are useful to editors, but are not public photo captions. */
export function isGeneratedImageName(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const name = value.trim().replace(/\.(?:jpe?g|png|webp|avif|heic|tiff?|cr2|cr3|nef)$/i, '');
  return /^(?:(?=[a-f0-9]*\d)[a-f0-9]{6,}|[\d_-]*\d{4,}[\d_-]*|(?:IMG|DSC|DSCF|DSCN|_MG)[_-]?\d+[a-z]?|\d{3}[a-z]\d{4}[a-z]?)$/i.test(name);
}

export function getPublicImageLabel(image: Pick<EventGalleryImage, 'caption' | 'title'> & Partial<Pick<EventGalleryImage, 'original_filename'>>): string {
  const filename = image.original_filename?.trim().toLocaleLowerCase();
  const stem = filename?.replace(/\.[^.]+$/, '');
  for (const value of [image.caption, image.title]) {
    const text = value?.trim();
    if (text && !isGeneratedImageName(text) && text.toLocaleLowerCase() !== filename && text.toLocaleLowerCase() !== stem) return text;
  }
  return '';
}
