export interface GalleryImagePolicy {
  content_types: string[];
  extensions: string[];
  type_label: string;
}
export const GALLERY_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
// Safe while config loads or when it cannot be fetched. No image/* wildcard:
// iOS needs HEIC omitted explicitly to offer automatic JPEG conversion.
export const DEFAULT_GALLERY_IMAGE_POLICY: GalleryImagePolicy = {
  content_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff'],
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tif', '.tiff'],
  type_label: 'JPEG, PNG, WebP, GIF, TIFF',
};
const optionalTypes: Record<string, string> = { '.heic': 'image/heic', '.heif': 'image/heif', '.avif': 'image/avif' };

export function galleryImageAccept(policy = DEFAULT_GALLERY_IMAGE_POLICY) {
  return [...policy.content_types, ...policy.extensions].join(',');
}
export function isSupportedGalleryImage(file: File, policy = DEFAULT_GALLERY_IMAGE_POLICY) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  // A supported MIME type must not bypass an explicitly unsupported extension,
  // or vice versa (some browsers send application/octet-stream for HEIC).
  const optional = Object.entries(optionalTypes).find(([extension, contentType]) => name.endsWith(extension) || type === contentType);
  if (optional && !policy.content_types.includes(optional[1])) return false;
  return (policy.content_types.includes(type) || policy.extensions.some(extension => name.endsWith(extension))) &&
    file.size > 0 && file.size <= GALLERY_IMAGE_MAX_BYTES;
}
export function galleryImageError(file: File | undefined, policy = DEFAULT_GALLERY_IMAGE_POLICY) {
  const optional = file && Object.entries(optionalTypes).find(([extension, type]) => file.name.toLowerCase().endsWith(extension) || file.type.toLowerCase() === type);
  if (optional && !policy.content_types.includes(optional[1])) {
    return `This photo is ${optional[0].slice(1).toUpperCase()}. iPhone photos upload automatically as JPEG when chosen from the photo picker; for ZIPs, export as JPEG.`;
  }
  return `Choose ${policy.type_label} images up to 50 MB each.`;
}
