import { useState, useEffect, useMemo, useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { formatNumber } from '../utils/numbers';
import { divisionLabel } from './rankings/divisionLabel';
import { matchesResultSearch } from './results/resultSearch';
import CountryFlag from './CountryFlag';
import { Button, Card, Chip, SectionHeading } from './ui';
import DivisionLabel from './results/DivisionLabel';
import FilterSheet from './results/FilterSheet';
import { parseDivisionName, titleCase, type Discipline } from './results/divisionName';
import { api } from '../services/api';
import type { EventResult, EventResultDivision, EventResultsSummary } from '../services/api';

const beltOrder = [
  'Black',
  'Brown',
  'Purple',
  'Blue',
  'Green',
  'Orange',
  'Yellow',
  'Gray',
  'Grey',
  'White',
];
const medalColor = ['text-text-primary', 'text-gold-400', 'text-gray-300', 'text-orange-300'];

function PlacementCard({ result, beltKnown }: { result: EventResult; beltKnown: boolean }) {
  const { t, i18n } = useTranslation();
  // #116's API serializes the canonical display name in competitor_name.
  const path = result.competitor_id
    ? `/competitors/${result.competitor_id}`
    : `/competitors/profile?result_id=${result.id}`;
  return (
    <Card className={`min-w-0 p-4 ${result.placement === 1 ? 'bg-gold-500/5' : ''}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`font-heading text-2xl font-semibold tabular-nums ${medalColor[result.placement] || medalColor[0]}`}
        >
          {result.placement <= 3
            ? t(`results.placementBadge${result.placement}`)
            : `#${formatNumber(result.placement, i18n.language)}`}
        </span>
        {result.country_code && <CountryFlag code={result.country_code} />}
      </div>
      <Link
        to={path}
        className="block break-words font-heading text-lg font-semibold text-text-primary underline-offset-4 hover:text-gold-400 hover:underline"
      >
        {result.competitor_name}
      </Link>
      {result.academy && (
        <p className="mt-1 break-words text-sm text-text-secondary">{result.academy}</p>
      )}
      {!beltKnown && result.belt_rank && (
        <Chip className="mt-3">{divisionLabel(titleCase(result.belt_rank), t)}</Chip>
      )}
    </Card>
  );
}

function DivisionGroup({
  division,
  open,
  toggle,
}: {
  division: EventResultDivision;
  open: boolean;
  toggle: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const parsed = parseDivisionName(division.division);
  const sorted = [...division.results].sort((a, b) => a.placement - b.placement);
  return (
    <Card className="overflow-hidden">
      <h5>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={toggle}
          title={division.division}
          className="flex min-h-14 w-full items-start justify-between gap-3 p-4 text-left hover:bg-white/[0.03]"
        >
          <span className="min-w-0 text-base font-medium text-text-primary">
            <DivisionLabel name={division.division} />
            <span className="mt-1 block text-sm font-normal text-text-secondary">
              {t('results.placementsCount', { count: division.results.length })}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`mt-1 shrink-0 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h5>
      {open && (
        <div id={id} className="grid gap-3 p-3 pt-0 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((result) => (
            <PlacementCard key={result.id} result={result} beltKnown={Boolean(parsed.belt)} />
          ))}
        </div>
      )}
    </Card>
  );
}

function ResultsSummary({ summary }: { summary: EventResultsSummary }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="mb-8 space-y-4">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(['placements', 'divisions', 'countries', 'academies'] as const).map((label, i) => (
          <Card key={label} className="p-4 sm:p-5">
            <dt className="text-sm text-text-secondary">{t(`results.${label}`)}</dt>
            <dd className="mt-1 font-heading text-3xl font-semibold tabular-nums">
              {formatNumber(
                [summary.total_results, summary.divisions, summary.countries, summary.academies][i],
                i18n.language
              )}
            </dd>
          </Card>
        ))}
      </dl>
      <details className="rounded-lg bg-surface p-4">
        <summary className="min-h-11 cursor-pointer py-2 font-medium text-text-secondary">
          {t('results.beltBreakdown')} · {t('results.topAcademies')}
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {summary.belt_breakdown && (
            <Card className="p-5">
              <h3 className="mb-4 font-heading text-xl font-semibold">
                {t('results.beltBreakdown')}
              </h3>
              <dl className="flex flex-wrap gap-x-6 gap-y-3">
                {Object.entries(summary.belt_breakdown).map(([belt, count]) => (
                  <div key={belt}>
                    <dt className="text-sm text-text-secondary">
                      {divisionLabel(titleCase(belt), t)}
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {formatNumber(count, i18n.language)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
          {summary.top_academies?.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-4 font-heading text-xl font-semibold">
                {t('results.topAcademies')}
              </h3>
              <ol className="space-y-4">
                {summary.top_academies.slice(0, 10).map((academy, i) => (
                  <li key={academy.name} className="flex items-start gap-3 text-sm">
                    <span className="w-5 shrink-0 text-text-secondary tabular-nums">
                      {formatNumber(i + 1, i18n.language)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium">{academy.name}</p>
                      <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-text-secondary">
                        {(['gold', 'silver', 'bronze'] as const).map((medal, index) => (
                          <div key={medal} className={`flex gap-1 ${medalColor[index + 1]}`}>
                            <dt>{t(`competitorProfile.${medal}`)}</dt>
                            <dd className="tabular-nums">
                              {formatNumber(academy[medal], i18n.language)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </details>
    </div>
  );
}

interface EventResultsSectionProps {
  eventSlug: string;
  sourceUrls?: string[];
  importedAt?: string | null;
  onReady?: (eventSlug: string) => void;
}
export default function EventResultsSection({
  eventSlug,
  sourceUrls,
  onReady,
}: EventResultsSectionProps) {
  const { t, i18n } = useTranslation();
  const [results, setResults] = useState<EventResultDivision[]>([]);
  const [summary, setSummary] = useState<EventResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openDivisions, setOpenDivisions] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('gi');
  const [belt, setBelt] = useState('');
  const [gender, setGender] = useState('');
  const [weight, setWeight] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      api.getEventResults(eventSlug),
      api.getEventResultsSummary(eventSlug).catch(() => null),
    ])
      .then(([res, sum]) => {
        if (cancelled) return;
        setResults(res);
        setSummary(sum);
        setOpenDivisions(new Set(res.slice(0, 3).map((d) => d.division)));
        setOpenGroups(new Set(['belt:0', 'age:0:0']));
        setDiscipline(
          res.some((d) => parseDivisionName(d.division).discipline === 'gi')
            ? 'gi'
            : parseDivisionName(res[0]?.division || '').discipline
        );
        setSearch('');
        setBelt('');
        setGender('');
        setWeight('');
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          onReady?.(eventSlug);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [eventSlug, onReady]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(min-width: 768px)');
    const changed = () => {
      if (query.matches) closeSheet();
    };
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, [closeSheet]);

  const parsed = useMemo(
    () => results.map((row) => ({ ...row, parsed: parseDivisionName(row.division) })),
    [results]
  );
  const disciplines = (['gi', 'nogi', 'unknown'] as const).filter((value) =>
    parsed.some((row) => row.parsed.discipline === value)
  );
  const options = useMemo(() => {
    const rows = parsed
      .filter((row) => row.parsed.discipline === discipline)
      .flatMap((row) => row.results);
    return {
      belts: [...new Set(rows.map((r) => r.belt_rank).filter(Boolean))].sort(),
      genders: [...new Set(rows.map((r) => r.gender).filter(Boolean))].sort(),
      weights: [...new Set(rows.map((r) => r.weight_class).filter(Boolean))].sort(),
    };
  }, [parsed, discipline]);
  const filtered = useMemo(
    () =>
      parsed
        .filter((row) => row.parsed.discipline === discipline)
        .map((row) => ({
          ...row,
          results: row.results.filter((result) => {
            const query = search.trim().toLocaleLowerCase();
            return (
              matchesResultSearch(query, result.competitor_name, result.academy, row.division) &&
              (!belt || result.belt_rank === belt) &&
              (!gender || result.gender === gender) &&
              (!weight || result.weight_class === weight)
            );
          }),
        }))
        .filter((row) => row.results.length > 0 || (!search.trim() && !belt && !gender && !weight)),
    [parsed, discipline, search, belt, gender, weight]
  );
  const groups = useMemo(() => {
    const map = new Map<string, Map<string, EventResultDivision[]>>();
    for (const row of filtered) {
      const belt = row.parsed.belt || '';
      const age = row.parsed.age || '';
      if (!map.has(belt)) map.set(belt, new Map());
      const ages = map.get(belt)!;
      ages.set(age, [...(ages.get(age) || []), row]);
    }
    return [...map]
      .sort(
        ([a], [b]) =>
          (beltOrder.indexOf(a) < 0 ? 99 : beltOrder.indexOf(a)) -
          (beltOrder.indexOf(b) < 0 ? 99 : beltOrder.indexOf(b))
      )
      .map(([belt, ages]) => ({
        belt,
        ages: [...ages].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })),
        count: [...ages.values()].reduce((sum, rows) => sum + rows.length, 0),
      }));
  }, [filtered]);
  const allOpen =
    filtered.length > 0 &&
    filtered.every((row) => openDivisions.has(row.division)) &&
    groups.every(
      (group, i) =>
        openGroups.has(`belt:${i}`) && group.ages.every((_, j) => openGroups.has(`age:${i}:${j}`))
    );
  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
    setter((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleAll() {
    setOpenDivisions(new Set(allOpen ? [] : filtered.map((row) => row.division)));
    setOpenGroups(
      new Set(
        allOpen
          ? []
          : groups.flatMap((group, i) => [
              `belt:${i}`,
              ...group.ages.map((_, j) => `age:${i}:${j}`),
            ])
      )
    );
  }
  const activeCount = [belt, gender, weight].filter(Boolean).length;
  const filterFields = (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { label: 'allBelts', value: belt, set: setBelt, options: options.belts },
        { label: 'allGenders', value: gender, set: setGender, options: options.genders },
        { label: 'allWeights', value: weight, set: setWeight, options: options.weights },
      ].map((field) => (
        <label key={field.label} className="min-w-0 text-sm text-text-secondary">
          <span className="mb-2 block">{t(`results.${field.label}`)}</span>
          <select
            value={field.value}
            onChange={(e) => {
              field.set(e.target.value);
              setOpenGroups(new Set(['belt:0', 'age:0:0']));
            }}
            className="min-h-12 w-full rounded-lg border border-white/15 bg-navy-900 px-3 text-base text-text-primary"
          >
            <option value="">{t(`results.${field.label}`)}</option>
            {field.options.map((value) => (
              <option value={value} key={value}>
                {divisionLabel(titleCase(value.replace(/_/g, ' ')), t)}
              </option>
            ))}
          </select>
        </label>
      ))}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          onClick={() => {
            setBelt('');
            setGender('');
            setWeight('');
          }}
        >
          {t('competitors.clearFilters')}
        </Button>
      )}
    </div>
  );
  if (loading)
    return (
      <div role="status" className="py-16 text-center text-text-secondary">
        {t('common.loading')}
      </div>
    );
  if (error || !results.length)
    return (
      <div className="py-16 text-center text-text-secondary">
        {t(error ? 'season.resultsUnavailable' : 'results.noResults')}
      </div>
    );
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-6">
        <SectionHeading
          title={t('results.title')}
          description={t('results.subtitle')}
          className="mb-8"
        />
        {summary && <ResultsSummary summary={summary} />}
        <div className="mb-5 space-y-4">
          <div
            role="group"
            aria-label={t('officialRankings.discipline')}
            className="flex flex-wrap gap-2"
          >
            {disciplines.map((value) => (
              <Button
                key={value}
                variant={discipline === value ? 'primary' : 'secondary'}
                aria-pressed={discipline === value}
                onClick={() => {
                  setDiscipline(value);
                  setBelt('');
                  setGender('');
                  setWeight('');
                  setOpenGroups(new Set(['belt:0', 'age:0:0']));
                }}
              >
                {t(value === 'unknown' ? 'results.otherDivisions' : `officialRankings.${value}`)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpenGroups(new Set(['belt:0', 'age:0:0']));
                }}
                aria-label={t('results.searchPlaceholder')}
                placeholder={t('results.searchPlaceholder')}
                className="min-h-12 w-full rounded-lg border border-white/15 bg-surface pl-10 pr-3 text-base text-text-primary"
              />
            </div>
            <div className="shrink-0 md:hidden">
              <Button variant="secondary" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
                <SlidersHorizontal size={16} aria-hidden="true" />
                {t('results.filters')}
                {activeCount > 0 && ` (${formatNumber(activeCount, i18n.language)})`}
              </Button>
            </div>
          </div>
          <div className="hidden md:block">{!sheetOpen && filterFields}</div>
          <FilterSheet open={sheetOpen} onClose={closeSheet}>
            {filterFields}
          </FilterSheet>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-text-secondary">
            {t('results.divisionsCount', { count: filtered.length })}
          </p>
          <Button variant="ghost" onClick={toggleAll}>
            {t(allOpen ? 'results.collapseAll' : 'results.expandAll')}
          </Button>
        </div>
        {!filtered.length ? (
          <p className="py-12 text-center text-text-secondary">{t('results.noMatchingResults')}</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group, i) => (
              <Card key={group.belt} className="overflow-hidden">
                <h3>
                  <button
                    type="button"
                    aria-expanded={openGroups.has(`belt:${i}`)}
                    onClick={() => toggle(setOpenGroups, `belt:${i}`)}
                    className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
                  >
                    <span className="font-heading text-xl font-semibold">
                      {group.belt ? divisionLabel(group.belt, t) : t('results.otherDivisions')}
                      <span className="ml-3 text-sm font-normal text-text-secondary">
                        {t('results.divisionsCount', { count: group.count })}
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={openGroups.has(`belt:${i}`) ? 'rotate-180' : ''}
                    />
                  </button>
                </h3>
                {openGroups.has(`belt:${i}`) && (
                  <div className="space-y-3 px-3 pb-3 sm:px-5 sm:pb-5">
                    {group.ages.map(([age, rows], j) => (
                      <div key={age}>
                        <h4>
                          <button
                            type="button"
                            aria-expanded={openGroups.has(`age:${i}:${j}`)}
                            onClick={() => toggle(setOpenGroups, `age:${i}:${j}`)}
                            className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left"
                          >
                            <span className="font-medium">
                              {age ? divisionLabel(age, t) : t('results.otherDivisions')}
                              <span className="ml-2 text-sm text-text-secondary">
                                ({formatNumber(rows.length, i18n.language)})
                              </span>
                            </span>
                            <ChevronDown
                              size={16}
                              aria-hidden="true"
                              className={openGroups.has(`age:${i}:${j}`) ? 'rotate-180' : ''}
                            />
                          </button>
                        </h4>
                        {openGroups.has(`age:${i}:${j}`) && (
                          <div className="space-y-3">
                            {rows.map((row) => (
                              <DivisionGroup
                                key={row.division}
                                division={row}
                                open={openDivisions.has(row.division)}
                                toggle={() => toggle(setOpenDivisions, row.division)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
        {sourceUrls?.length ? (
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            <span>{t('results.sourcedFrom')}</span>
            {sourceUrls.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-gold-400 underline underline-offset-4"
              >
                ASJJF.org{sourceUrls.length > 1 ? ` (${i + 1})` : ''}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
