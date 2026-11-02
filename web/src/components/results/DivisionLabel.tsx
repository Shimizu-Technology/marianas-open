import { useTranslation } from 'react-i18next';
import { Chip } from '../ui';
import { parseDivisionName } from './divisionName';

export default function DivisionLabel({ name }: { name: string }) {
  const { t } = useTranslation();
  const parsed = parseDivisionName(name);
  return (
    <span
      title={name}
      className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 [overflow-wrap:anywhere]"
    >
      {parsed.discipline !== 'unknown' && <Chip>{t(`officialRankings.${parsed.discipline}`)}</Chip>}
      <span>{parsed.label}</span>
    </span>
  );
}
