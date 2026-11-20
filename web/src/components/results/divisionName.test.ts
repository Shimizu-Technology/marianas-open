import { describe, expect, it } from 'vitest';
import { parseDivisionName } from './divisionName';

describe('ASJJF division labels (MO and Hong Kong production results)', () => {
  it.each([
    ['[GI] Female Black Adult 18 Heavy', 'gi', 'Female · Black · Adult 18 · Heavy'],
    ['[GI] FEMALE BLACK ADULT 18 HEAVY', 'gi', 'Female · Black · Adult 18 · Heavy'],
    ['[NOGI] Male White Master 36 Light', 'nogi', 'Male · White · Master 36 · Light'],
    ['[NO-GI] MALE PURPLE ADULT 18 OPEN WEIGHT', 'nogi', 'Male · Purple · Adult 18 · Open Weight'],
    ['[GI] Female Black Master 41 Feather', 'gi', 'Female · Black · Master 41 · Feather'],
    ['[NOGI] Male Gray Kid 6 Light Feather', 'nogi', 'Male · Gray · Kid 6 · Light Feather'],
    [
      '[GI] Male Blue Juvenile 16-17 Medium Heavy',
      'gi',
      'Male · Blue · Juvenile 16-17 · Medium Heavy',
    ],
  ])('parses %s without losing its source', (raw, discipline, label) => {
    expect(parseDivisionName(raw)).toMatchObject({ raw, discipline, label });
  });
  it.each([
    'Adult Black',
    '[GI] Para Mixed Invitational',
    '[NO-GI] MALE BLACK ADULT OPEN',
    '[GI] MALE BLACK ADULT 18 FUTURE WEIGHT',
    '',
  ])('keeps unfamiliar source %s intact', (raw) => {
    expect(parseDivisionName(raw)).toMatchObject({ raw, label: raw, belt: null, age: null });
  });
  it('does not treat an unknown prefix as a recognized discipline', () => {
    expect(parseDivisionName('[OTHER] Male Black Adult 18 Heavy').discipline).toBe('unknown');
  });
});
