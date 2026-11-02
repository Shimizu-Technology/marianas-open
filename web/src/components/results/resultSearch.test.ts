import { expect, it } from 'vitest';
import { matchesResultSearch } from './resultSearch';

it.each(['Gabrieli Pessanha', 'Pessanha Gabrieli', '  PESSANHA   gabrieli ', 'pess gab'])(
  'matches all athlete tokens in any order: %s',
  (query) => {
    expect(
      matchesResultSearch(
        query,
        'Gabrieli Pessanha',
        'Infight Japan',
        '[GI] Female Black Adult 18 Heavy'
      )
    ).toBe(true);
  }
);
it('requires every athlete token, while retaining academy and division search', () => {
  expect(
    matchesResultSearch(
      'Pessanha Missing',
      'Gabrieli Pessanha',
      'Infight Japan',
      '[GI] Female Black Adult 18 Heavy'
    )
  ).toBe(false);
  expect(
    matchesResultSearch('infight japan', 'Gabrieli Pessanha', 'Infight Japan', 'Division')
  ).toBe(true);
  expect(
    matchesResultSearch(
      'black adult',
      'Gabrieli Pessanha',
      null,
      '[GI] Female Black Adult 18 Heavy'
    )
  ).toBe(true);
  expect(matchesResultSearch(' ', 'Gabrieli Pessanha', null, 'Division')).toBe(true);
});
