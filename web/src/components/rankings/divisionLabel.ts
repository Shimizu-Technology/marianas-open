import type { TFunction } from 'i18next';

const weightKeys: Record<string, string> = {
  rooster: 'rooster',
  lightfeather: 'lightFeather',
  feather: 'feather',
  light: 'light',
  middle: 'middle',
  mediumheavy: 'mediumHeavy',
  heavy: 'heavy',
  superheavy: 'superHeavy',
  ultraheavy: 'ultraHeavy',
  openweight: 'openWeight',
};

export function divisionLabel(value: string, t: TFunction) {
  const age = value.match(/^(Adult|Master|Juvenile|Kid)\s+(\d+(?:-\d+)?)$/i);
  if (age) return t(`officialRankings.values.${age[1].toLowerCase()}Age`, { age: age[2] });
  const key = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (weightKeys[key]) return t(`watch.weight.${weightKeys[key]}`);
  return t(`officialRankings.values.${key}`, value);
}
