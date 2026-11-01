import { useTranslation } from 'react-i18next';
import { divisionLabel } from './divisionLabel';
import type { OfficialRankingDivision } from '../../services/officialRankingsApi';

export function selectDivision(divisions: OfficialRankingDivision[], filters: URLSearchParams) {
  const byId = divisions.find(d => String(d.id) === filters.get('division_id'));
  if (byId) return byId;
  const matching = (rows: OfficialRankingDivision[], field: 'gender' | 'age_group' | 'belt', requested: string | null, fallback: string) => {
    const value = rows.find(d => d[field] === requested)?.[field] ?? rows.find(d => d[field].toLowerCase() === fallback.toLowerCase() || (field === 'age_group' && d[field].startsWith('Adult')))?.[field] ?? rows[0]?.[field];
    return rows.filter(d => d[field] === value);
  };
  const genders = matching(divisions, 'gender', filters.get('gender'), 'Male');
  const ages = matching(genders, 'age_group', filters.get('age'), 'Adult');
  return matching(ages, 'belt', filters.get('belt'), 'Black')[0];
}

export default function DivisionPicker({ divisions, selected, onChange }: {
  divisions: OfficialRankingDivision[];
  selected: OfficialRankingDivision;
  onChange: (values: Record<string, string>) => void;
}) {
  const { t } = useTranslation();
  const rows = [
    { key: 'gender', field: 'gender', options: divisions },
    { key: 'age', field: 'age_group', options: divisions.filter(d => d.gender === selected.gender) },
    { key: 'belt', field: 'belt', options: divisions.filter(d => d.gender === selected.gender && d.age_group === selected.age_group) },
  ] as const;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {rows.map(({ key, field, options }) => <label key={key} className={`block min-w-0 text-sm text-text-secondary ${key === 'belt' ? 'col-span-2 sm:col-span-1' : ''}`}>
      <span className="mb-2 block">{t(`officialRankings.${key}`)}</span>
      <select value={selected[field]} onChange={e => {
        const filters = new URLSearchParams({ gender: selected.gender, age: selected.age_group, belt: selected.belt });
        filters.set(key, e.target.value);
        if (key === 'gender') { filters.delete('age'); filters.delete('belt'); }
        if (key === 'age') filters.delete('belt');
        const next = selectDivision(divisions, filters)!;
        onChange({ gender: next.gender, age: next.age_group, belt: next.belt, division_id: String(next.id) });
      }} className="min-h-12 w-full rounded-md border border-white/15 bg-dark px-3 text-base text-white focus-visible:outline-2 focus-visible:outline-gold-500">
        {[...new Set(options.map(d => d[field]))].map(value => <option key={value} value={value}>
          {divisionLabel(value, t)}
        </option>)}
      </select>
    </label>)}
  </div>;
}
