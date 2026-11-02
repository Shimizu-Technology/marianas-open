import { useTranslation } from 'react-i18next';
import { parseDivisionName } from './divisionName';

export default function DivisionLabel({ name }: { name: string }) {
  const { t } = useTranslation();
  const parsed = parseDivisionName(name);
  return <span title={name} className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 [overflow-wrap:anywhere]">
    {parsed.discipline !== 'unknown' && <span className="bg-gold-500/10 px-2 py-0.5 text-sm font-medium text-gold-400">{t(`officialRankings.${parsed.discipline}`)}</span>}
    <span>{parsed.label}</span>
  </span>;
}
