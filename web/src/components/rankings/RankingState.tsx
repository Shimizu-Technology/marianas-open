import { useTranslation } from 'react-i18next';

export default function RankingState({ state, retry }: {
  state: 'loading' | 'error' | 'pending' | 'unavailable' | 'empty' | 'noStanding' | 'unmatched';
  retry?: () => void;
}) {
  const { t } = useTranslation();
  return <div role={state === 'error' ? 'alert' : 'status'} className="px-5 py-10 text-center text-text-secondary">
    <p>{t(`officialRankings.${state}`)}</p>
    {state === 'error' && retry && <button onClick={retry}
      className="mt-4 min-h-11 rounded-md border border-gold-500/40 px-5 text-gold-400 active:scale-[0.98]">
      {t('officialRankings.retry')}
    </button>}
  </div>;
}
