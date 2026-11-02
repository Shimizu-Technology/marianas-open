import { formatNumber } from '../../utils/numbers';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from './divisionLabel';
import { officialRankingsApi } from '../../services/officialRankingsApi';
import { useRankingRequest } from './useRankingRequest';
import RankingState from './RankingState';
import RankingSource from './RankingSource';

export default function CompetitorStandings({ competitorId }: { competitorId?: number }) {
  const { t, i18n } = useTranslation();
  const request = useCallback((signal: AbortSignal) => officialRankingsApi.getStandings(competitorId!, signal), [competitorId]);
  const standings = useRankingRequest(competitorId ? request : null);
  return <section className="mb-6 overflow-hidden rounded-xl border border-white/10 bg-surface">
    <div className="border-b border-white/10 p-4">
      <h2 className="font-heading text-lg font-semibold">{standings.data ? t('officialRankings.profileTitle', { year: standings.data.season_year }) : t('officialRankings.currentStandings')}</h2>
    </div>
    {!competitorId ? <RankingState state="unmatched" />
      : standings.loading ? <RankingState state="loading" />
        : standings.error ? <RankingState state="error" retry={standings.retry} />
          : !standings.data?.standings.length ? <RankingState state="noStanding" />
            : <ul className="divide-y divide-white/10">{standings.data.standings.map(standing => {
              const { list, division } = standing;
              const query = new URLSearchParams({ season: String(list.season_year), discipline: list.discipline, kind: 'individual', category: list.category, division_id: String(division.id), gender: division.gender, age: division.age_group, belt: division.belt });
              return <li key={`${list.id}-${division.id}`} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-text-secondary">{t(`officialRankings.${list.discipline}`)}</p>
                    <Link to={`/rankings?${query}`} className="break-words font-medium text-white underline underline-offset-4 hover:text-gold-400">
                      {[division.gender, division.age_group, division.belt].map(value => divisionLabel(value, t)).join(' · ')}
                    </Link>
                  </div>
                  <dl className="flex shrink-0 gap-5 text-right">
                    <div><dt className="text-xs text-text-secondary">{t('officialRankings.position')}</dt><dd className="text-xl font-bold tabular-nums text-gold-400">#{formatNumber(standing.position, i18n.language)}</dd></div>
                    <div><dt className="text-xs text-text-secondary">{t('officialRankings.points')}</dt><dd className="text-xl font-bold tabular-nums text-white">{formatNumber(standing.points, i18n.language)}</dd></div>
                  </dl>
                </div>
                <RankingSource list={list} syncedAt={division.last_synced_at} />
              </li>;
            })}</ul>}
  </section>;
}
