import { expect, it } from 'vitest';
import { getLocalImageSrcSet } from './responsiveImages';

it('provides width candidates only for known local assets and preserves uploaded originals', () => {
  expect(getLocalImageSrcSet('/images/hero-podium.jpg')).toContain('hero-podium-640.webp 640w');
  expect(getLocalImageSrcSet('/images/hero-podium.jpg')).toContain('/images/hero-podium.jpg 1920w');
  expect(getLocalImageSrcSet('https://example.s3.amazonaws.com/hero.jpg')).toBeUndefined();
  expect(getLocalImageSrcSet('/rails/active_storage/blobs/redirect/signed/hero.jpg')).toBeUndefined();
});
