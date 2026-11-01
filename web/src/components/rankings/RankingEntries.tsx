import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CountryFlag from '../CountryFlag';
import type { OfficialRankingEntry } from '../../services/officialRankingsApi';

function EntryName({ entry, team }: { entry: OfficialRankingEntry; team: boolean }) {
  const name = entry.display_name || entry.name;
  const path = team ? (entry.academy_slug ? `/teams/${entry.academy_slug}` : null)
    : (entry.competitor_id ? `/competitors/${entry.competitor_id}` : null);
  return <span className="flex min-w-0 items-start gap-2">
    {(entry.country_code || entry.raw_country_code) && <CountryFlag code={entry.country_code || entry.raw_country_code!} />}
    {path ? <Link to={path} className="min-w-0 [overflow-wrap:anywhere] font-semibold text-white hover:text-gold-400 underline-offset-4 hover:underline">{name}</Link>
      : <span className="min-w-0 [overflow-wrap:anywhere] font-semibold text-white">{name}</span>}
  </span>;
}
function Academy({ entry }: { entry: OfficialRankingEntry }) {
  return entry.academy_slug ? <Link className="break-words hover:text-gold-400" to={`/teams/${entry.academy_slug}`}>{entry.academy_name}</Link> : <span className="break-words">{entry.academy_name || '—'}</span>;
}
function Medals({ entry }: { entry: OfficialRankingEntry }) {
  const { t } = useTranslation();
  return <dl className="flex flex-wrap gap-3 text-xs">
    {(['gold', 'silver', 'bronze'] as const).map((medal, i) => <div key={medal} className={['text-yellow-400', 'text-gray-300', 'text-orange-400'][i]}>
      <dt className="sr-only">{t(`competitorProfile.${medal}`)}</dt><dd><span aria-hidden="true">{t(`competitorProfile.${medal}`)} </span>{entry[medal] ?? '—'}</dd>
    </div>)}
  </dl>;
}

export default function RankingEntries({ entries, team }: { entries: OfficialRankingEntry[]; team: boolean }) {
  const { t } = useTranslation();
  return <>
    <ol className="divide-y divide-white/10 md:hidden">
      {entries.map(entry => <li key={entry.id} className="p-4">
        <div className="flex items-start gap-3">
          <span className="w-9 shrink-0 font-heading text-xl tabular-nums text-gold-400" aria-label={t('officialRankings.position')}>#{entry.position}</span>
          <div className="min-w-0 flex-1">
            <EntryName entry={entry} team={team} />
            {!team && <div className="mt-1 text-sm text-text-secondary"><Academy entry={entry} /></div>}
          </div>
          <div className="max-w-[35%] break-words text-right">
            <span className="block font-bold tabular-nums text-gold-400">{entry.points}</span>
            <span className="text-xs text-text-secondary">{t('officialRankings.points')}</span>
          </div>
        </div>
        {!team && <div className="mt-3 pl-12"><Medals entry={entry} /></div>}
      </li>)}
    </ol>
    <table className="hidden w-full table-fixed text-left text-sm md:table">
      <thead className="border-b border-white/10 text-xs text-text-secondary"><tr>
        <th className="w-20 p-4">{t('officialRankings.position')}</th>
        <th className="p-4">{t(team ? 'officialRankings.team' : 'officialRankings.athlete')}</th>
        {!team && <th className="p-4">{t('officialRankings.academy')}</th>}
        <th className="w-28 p-4 text-right">{t('officialRankings.points')}</th>
        {!team && <th className="w-48 p-4">{t('officialRankings.medals')}</th>}
      </tr></thead>
      <tbody className="divide-y divide-white/5">{entries.map(entry => <tr key={entry.id}>
        <td className="p-4 font-heading text-lg tabular-nums text-gold-400">#{entry.position}</td>
        <td className="p-4"><EntryName entry={entry} team={team} /></td>
        {!team && <td className="p-4 text-text-secondary"><Academy entry={entry} /></td>}
        <td className="break-words p-4 text-right font-bold tabular-nums text-gold-400">{entry.points}</td>
        {!team && <td className="p-4"><Medals entry={entry} /></td>}
      </tr>)}</tbody>
    </table>
  </>;
}
