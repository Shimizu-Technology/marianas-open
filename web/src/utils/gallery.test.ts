import { describe, expect, it } from 'vitest';
import { getPublicImageLabel, isGeneratedImageName } from './gallery';

describe('public gallery labels', () => {
  it.each(['455A8210s', '455A8210.JPG', 'IMG_1234', 'IMG_1234.jpg', 'DSC01234', '_MG_1234', 'DSCF1234', 'a3b4c5d6e7', '20261024_123456', ' 455a8210s '])('hides generated file name %s', name => {
    expect(isGeneratedImageName(name)).toBe(true);
    expect(getPublicImageLabel({ title: name, caption: name })).toBe('');
  });
  it.each(['Black belt final', 'Day 1 — podium', '決勝戦', 'Guam 2026', 'Family photo', 'Decade'])('keeps descriptive text %s', name => {
    expect(isGeneratedImageName(name)).toBe(false);
    expect(getPublicImageLabel({ title: 'IMG_1234', caption: name })).toBe(name);
  });
  it('falls back from a generated caption to a real title', () => {
    expect(getPublicImageLabel({ caption: '455A8210s', title: 'Adult final' })).toBe('Adult final');
    expect(isGeneratedImageName(null)).toBe(false);
  });
});
