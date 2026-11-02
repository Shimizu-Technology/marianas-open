import { describe, expect, it } from 'vitest';
import en from './en.json';
import ja from './ja.json';
import ko from './ko.json';
import pt from './pt.json';
import tl from './tl.json';
import zh from './zh.json';
import zhHant from './zh-Hant.json';
import identical from './intentional-identical.json';
import manifest from '../content/publicCopy.json';
import { readFileSync } from 'node:fs';

function flatten(value: unknown, path = ''): Record<string, string> {
  if (typeof value === 'string') return { [path]: value };
  return Object.fromEntries(Object.entries(value as object).flatMap(([key, child]) =>
    Object.entries(flatten(child, path ? `${path}.${key}` : key))));
}
const source = flatten(en);
const placeholders = (value: string) => [...value.matchAll(/{{\s*([^}]+)\s*}}/g)].map(match => match[1].trim()).sort();
for (const [locale, resource] of Object.entries({ ja, ko, pt, tl, zh, 'zh-Hant': zhHant })) {
  describe(locale, () => {
    const target = flatten(resource);
    const allowed = identical[locale as keyof typeof identical] as Record<string, string>;
    it('contains every English leaf, including array items, with matching interpolation', () => {
      expect(Object.keys(source).filter(key => !(key in target))).toEqual([]);
      for (const key of Object.keys(source)) {
        expect(target[key]?.trim(), key).toBeTruthy();
        expect(placeholders(target[key] || ''), key).toEqual(placeholders(source[key]));
      }
    });
    it('requires an explicit reason for text identical to English', () => {
      expect(Object.keys(source).filter(key => source[key] === target[key] && !allowed[key])).toEqual([]);
      for (const [key, reason] of Object.entries(allowed)) {
        expect(reason.length).toBeGreaterThan(15);
        expect(target[key], `stale allowlist: ${key}`).toBe(source[key]);
      }
    });
  });
}
it('ships the same defaults used by every editable-copy locale fallback', () => {
  const seeds = JSON.parse(readFileSync('../api/db/data/public_copy.json', 'utf8')) as { key: string; [key: string]: string }[];
  for (const [key, entry] of Object.entries(manifest)) {
    const seed = seeds.find(seed => seed.key === entry.key);
    expect(seed, key).toBeTruthy();
    for (const [locale, resource] of Object.entries({ en, ja, ko, pt, tl, zh, 'zh-Hant': zhHant })) {
      expect(seed?.[`value_${locale.replace('-', '_').toLowerCase()}`], `${key}: ${locale}`).toBe(flatten(resource)[key]);
    }
  }
});
