import { expect, it, vi } from 'vitest';
import { sharePhoto, publicPhotoLabel } from './EventGalleryActions';
import type { EventGalleryImage } from '../services/api';
const url = 'https://marianasopen.com/events/marianas-open-2026/gallery?photo=3004';
it('copies a deep photo link when Web Share is unavailable', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  expect(
    await sharePhoto(url, 'Marianas Open', { clipboard: { writeText } } as unknown as Navigator)
  ).toBe('copied');
  expect(writeText).toHaveBeenCalledWith(url);
});
it('falls back to copying after a share failure but respects cancellation', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const share = vi.fn().mockRejectedValue(new Error('Unavailable'));
  expect(
    await sharePhoto(url, 'Marianas Open', {
      share,
      clipboard: { writeText },
    } as unknown as Navigator)
  ).toBe('copied');
  writeText.mockClear();
  share.mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
  expect(
    await sharePhoto(url, 'Marianas Open', {
      share,
      clipboard: { writeText },
    } as unknown as Navigator)
  ).toBe('cancelled');
  expect(writeText).not.toHaveBeenCalled();
});
it('surfaces a clipboard failure so the page can offer a selectable link', async () => {
  await expect(
    sharePhoto(url, 'MO', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) },
    } as unknown as Navigator)
  ).rejects.toThrow('Denied');
});
it('uses native sharing when available', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  const writeText = vi.fn();
  expect(
    await sharePhoto(url, 'MO', { share, clipboard: { writeText } } as unknown as Navigator)
  ).toBe('shared');
  expect(share).toHaveBeenCalledWith({ url, title: 'MO' });
  expect(writeText).not.toHaveBeenCalled();
});
it.each(['final-export.jpg', '455A8210s', 'IMG_1234.JPG'])(
  'omits filename caption %s',
  (caption) => {
    expect(publicPhotoLabel({ caption, title: null } as EventGalleryImage)).toBe('');
  }
);
