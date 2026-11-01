import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../components/rankings/divisionLabel';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import SEO from '../components/SEO';
import { officialRankingsApi } from '../services/officialRankingsApi';
import { useRankingRequest } from '../components/rankings/useRankingRequest';
import DivisionPicker, { selectDivision } from '../components/rankings/DivisionPicker';
import RankingState from '../components/rankings/RankingState';
import RankingSource from '../components/rankings/RankingSource';
import RankingEntries from '../components/rankings/RankingEntries';

export default function RankingsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useSearchParams();
  const catalog = useRankingRequest(useCallback((signal: AbortSignal) => officialRankingsApi.getLists(signal), []));
  const seasons = catalog.data?.seasons ?? [];
  const requestedYear = Number(filters.get('season'));
  const season = seasons.includes(requestedYear) ? requestedYear : catalog.data?.current_season;
  const discipline = filters.get('discipline') === 'nogi' ? 'nogi' : 'gi';
  const kind = filters.get('kind') === 'team' ? 'team' : 'individual';
  const lists = catalog.data?.lists.filter(l => l.season_year === season && l.discipline === discipline && l.kind === kind) ?? [];
  const categories = [...new Set(lists.filter(l => l.status === 'available').map(l => l.category))];
  const category = categories.includes(filters.get('category') as 'adult' | 'kids') ? filters.get('category')! : categories.includes('adult') ? 'adult' : categories[0];
  const list = lists.find(l => l.category === category) ?? lists.find(l => l.category === 'adult') ?? lists[0];
  const listId = Number(list?.id);
  const listAvailable = list?.status === 'available';
  const divisionRequest = useCallback((signal: AbortSignal) => officialRankingsApi.getDivisions(listId, signal), [listId]);
  const divisions = useRankingRequest(listAvailable && kind === 'individual' ? divisionRequest : null);
  const division = selectDivision(divisions.data?.divisions ?? [], filters);
  const divisionId = Number(division?.id);
  const parsedPage = Number(filters.get('page') || 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const entryRequest = useCallback((signal: AbortSignal) => officialRankingsApi.getEntries(listId, kind === 'individual' ? divisionId : undefined, page, signal), [listId, kind, divisionId, page]);
  const entries = useRankingRequest(listAvailable && (kind === 'team' || division?.status === 'available') ? entryRequest : null);

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(filters);
    // Write resolved defaults too, so copied links and back navigation retain context.
    if (season) next.set('season', String(season));
    next.set('discipline', discipline);
    next.set('kind', kind);
    if (list) next.set('category', list.category);
    if (division) {
      next.set('gender', division.gender); next.set('age', division.age_group); next.set('belt', division.belt);
    }
    if (!('page' in values)) next.delete('page');
    if (!('division_id' in values) && !('page' in values)) next.delete('division_id');
    Object.entries(values).forEach(([key, value]) => next.set(key, value));
    setFilters(next);
  }

  const state = catalog.loading ? 'loading' : catalog.error ? 'error'
    : !list ? 'unavailable' : list.status !== 'available' ? list.status
      : divisions.loading ? 'loading' : divisions.error ? 'error'
        : kind === 'individual' && !division ? 'empty'
          : kind === 'individual' && division?.status !== 'available' ? division!.status
            : entries.loading ? 'loading' : entries.error ? 'error' : !entries.data?.entries.length ? 'empty' : null;
  const retry = catalog.error ? catalog.retry : divisions.error ? divisions.retry : entries.retry;
  const buttonClass = 'min-h-11 min-w-0 flex-1 rounded-md px-3 py-2 text-sm font-medium active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-gold-500';

  return <div className="min-h-svh pt-24 pb-20">
    <SEO title={t('officialRankings.seoTitle')} description={t('officialRankings.subtitle')} path="/rankings" image="/images/podium-1.webp" />
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="mb-7 border-b border-white/10 pb-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold-400"><Trophy size={18} aria-hidden="true" />{t('officialRankings.badge')}</p>
        <h1 className="font-heading text-3xl font-bold sm:text-5xl">{season ? t('officialRankings.title', { year: season }) : t('officialRankings.seoTitle')}</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">{t('officialRankings.subtitle')}</p>
        {list && <RankingSource list={list} syncedAt={kind === 'individual' && division ? division.last_synced_at : list.last_synced_at} />}
      </header>
      {catalog.data && <section aria-label={t('officialRankings.filters')} className="mb-5 space-y-4 rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2fr)]">
          <label className="text-sm text-text-secondary"><span className="mb-2 block">{t('officialRankings.season')}</span>
            <select value={season ?? ''} onChange={e => update({ season: e.target.value })} className="min-h-11 w-full rounded-md border border-white/15 bg-dark px-3 text-base text-white">
              {seasons.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          {([
            { key: 'discipline', value: discipline, options: ['gi', 'nogi'] },
            { key: 'kind', value: kind, options: ['individual', 'team'] },
          ] as const).map(control => <fieldset key={control.key} className={`min-w-0 ${control.key === 'kind' ? 'col-span-2 sm:col-span-1' : ''}`}><legend className="mb-2 text-sm text-text-secondary">{t(`officialRankings.${control.key}`)}</legend>
            <div className="flex gap-1 rounded-lg bg-dark p-1">{control.options.map(option => <button key={option} aria-pressed={option === control.value}
              className={`${buttonClass} ${option === control.value ? 'bg-gold-500/15 text-gold-400' : 'text-text-secondary'}`}
              onClick={() => update({ [control.key]: option })}>{t(`officialRankings.${option}`)}</button>)}</div>
          </fieldset>)}
        </div>
        {kind === 'team' && categories.length > 1 && <fieldset><legend className="mb-2 text-sm text-text-secondary">{t('officialRankings.category')}</legend>
          <div className="flex max-w-sm gap-1 rounded-lg bg-dark p-1">{categories.map(value => <button key={value} aria-pressed={value === list?.category}
            onClick={() => update({ category: value })} className={`${buttonClass} ${value === list?.category ? 'bg-gold-500/15 text-gold-400' : 'text-text-secondary'}`}>{t(`officialRankings.${value}`)}</button>)}</div>
        </fieldset>}
        {kind === 'individual' && division && <DivisionPicker divisions={divisions.data!.divisions} selected={division} onChange={update} />}
      </section>}
      <section aria-label={t('officialRankings.standings')} aria-busy={state === 'loading'} className="overflow-hidden rounded-xl border border-white/10 bg-surface">
        {list && <div className="border-b border-white/10 px-4 py-4 sm:px-5">
          <h2 className="font-heading text-lg font-semibold">{t(`officialRankings.${discipline}`)} · {t(`officialRankings.${kind}`)}{kind === 'team' && ` · ${t(`officialRankings.${list.category}`)}`}</h2>
          {division && kind === 'individual' && <p className="mt-1 text-sm text-text-secondary">{[division.gender, division.age_group, division.belt].map(value => divisionLabel(value, t)).join(' · ')}</p>}
        </div>}
        {state ? <RankingState state={state} retry={retry} /> : <RankingEntries entries={entries.data!.entries} team={kind === 'team'} />}
        {!entries.error && entries.data && (page > 1 || page * entries.data.per_page < entries.data.total) && <nav aria-label={t('officialRankings.pagination')} className="flex items-center justify-between gap-2 border-t border-white/10 p-4">
          <button className={`${buttonClass} border border-white/15 disabled:opacity-40`} disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>{t('officialRankings.previous')}</button>
          <span className="shrink-0 text-sm text-text-secondary">{t('officialRankings.page', { page })}</span>
          <button className={`${buttonClass} border border-white/15 disabled:opacity-40`} disabled={page * entries.data.per_page >= entries.data.total} onClick={() => update({ page: String(page + 1) })}>{t('officialRankings.next')}</button>
        </nav>}
      </section>
    </div>
  </div>;
}
