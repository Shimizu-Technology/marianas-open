import { describe, expect, it } from 'vitest';
import { DEFAULT_GALLERY_IMAGE_POLICY, galleryImageAccept, galleryImageError, isSupportedGalleryImage } from './galleryImagePolicy';

const enabled = {
  content_types: [...DEFAULT_GALLERY_IMAGE_POLICY.content_types, 'image/heic', 'image/heif', 'image/avif'],
  extensions: [...DEFAULT_GALLERY_IMAGE_POLICY.extensions, '.heic', '.heif', '.avif'],
  type_label: 'JPEG, HEIC, HEIF, AVIF',
};
describe.each(['heic', 'heif', 'avif'])('%s runtime capability', format => {
  it('omits unsupported formats from the picker and client validation', () => {
    expect(galleryImageAccept()).not.toContain(format);
    for (const type of [`image/${format}`, 'application/octet-stream', 'image/jpeg', '']) {
      const file = new File(['photo'], `IMG_0001.${format.toUpperCase()}`, { type });
      expect(isSupportedGalleryImage(file)).toBe(false);
      expect(galleryImageError(file)).toContain(`This photo is ${format.toUpperCase()}`);
      expect(galleryImageError(file)).toContain('for ZIPs, export as JPEG');
    }
    expect(isSupportedGalleryImage(new File(['photo'], 'disguised.jpg', { type: `image/${format}` }))).toBe(false);
  });
  it('accepts the format when the processor supports it', () => {
    expect(galleryImageAccept(enabled)).toContain(`.${format}`);
    expect(galleryImageAccept(enabled)).toContain(`image/${format}`);
    expect(isSupportedGalleryImage(new File(['photo'], `photo.${format}`, { type: 'application/octet-stream' }), enabled)).toBe(true);
  });
});
it('preserves JPEG selection, size limits and safe loading defaults', () => {
  expect(isSupportedGalleryImage(new File(['photo'], 'phone.JPG', { type: 'image/jpeg' }))).toBe(true);
  expect(isSupportedGalleryImage(new File([], 'empty.jpg', { type: 'image/jpeg' }))).toBe(false);
  expect(galleryImageAccept()).not.toContain('image/*');
});
