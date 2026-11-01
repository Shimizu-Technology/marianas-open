import type { TFunction } from 'i18next';

export function divisionLabel(value: string, t: TFunction) {
  const age = value.match(/^(Adult|Master|Juvenile|Kid)\s+(\d+(?:-\d+)?)$/i);
  if (age) return t(`officialRankings.values.${age[1].toLowerCase()}Age`, { age: age[2] });
  return t(`officialRankings.values.${value.toLowerCase().replace(/[^a-z0-9]/g, '')}`, value);
}
