import { getDateLocale } from '../../utils/dateLocale';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import type { OfficialRankingList } from '../../services/officialRankingsApi';

export default function RankingSource({ list, syncedAt = list.last_synced_at }: { list: OfficialRankingList; syncedAt?: string | null }) {
  const { t, i18n } = useTranslation();
  const date = syncedAt ? new Date(syncedAt) : null;
  return <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary">
    <a href={list.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-gold-400 underline underline-offset-4">
      {t('officialRankings.source')} <ExternalLink size={13} aria-hidden="true" />
    </a>
    <span>{date && !Number.isNaN(date.getTime())
      ? t('officialRankings.lastSync', { date: date.toLocaleString(getDateLocale(i18n.language)) })
      : t('officialRankings.neverSynced')}</span>
  </div>;
}
