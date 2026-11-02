import { afterEach, expect, it, vi } from 'vitest';
import { downloadPhoto, photoDownloadExtension, isLightboxTextTarget } from './EventGalleryActions';

const supported = [
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/tiff', 'tiff'],
  ['image/heic', 'heic'],
  ['image/heif', 'heif'],
  ['image/avif', 'avif'],
];
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it.each([
  ...supported,
  ['', 'bin'],
  ['application/octet-stream', 'bin'],
  ['IMAGE/TIFF; charset=binary', 'tiff'],
])(
  'downloads %s using the fetched blob MIME type, not record metadata',
  async (mime, extension) => {
    const blob = new Blob(['original bytes'], { type: mime });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => blob }));
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:original'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(window, 'setTimeout').mockReturnValue(1);
    let filename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      filename = this.download;
    });
    await downloadPhoto('https://example.com/photo', 'event-3004');
    expect(filename).toBe(`event-3004.${extension}`);
    expect(document.querySelector('a[download]')).toBeNull();
  }
);
it('has a mapping for every supported gallery upload type', () => {
  expect(supported.map(([mime]) => photoDownloadExtension(mime))).not.toContain('bin');
});
it.each(['input', 'textarea', 'select'])('recognizes %s as a typing target', (tag) => {
  expect(isLightboxTextTarget(document.createElement(tag))).toBe(true);
});
it('recognizes contentEditable descendants and excludes buttons and explicit non-editable regions', () => {
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.setAttribute('contenteditable', 'true');
  const text = editor.appendChild(document.createElement('span'));
  expect(isLightboxTextTarget(text)).toBe(true);
  editor.setAttribute('contenteditable', 'plaintext-only');
  expect(isLightboxTextTarget(text)).toBe(true);
  text.setAttribute('contenteditable', 'false');
  expect(isLightboxTextTarget(text)).toBe(false);
  expect(isLightboxTextTarget(document.createElement('button'))).toBe(false);
  expect(isLightboxTextTarget(null)).toBe(false);
});
