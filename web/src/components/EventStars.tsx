import { Star } from 'lucide-react';
import { usePublicCopy } from '../hooks/usePublicCopy';
import { Chip } from './ui';
export default function EventStars({ stars }: { stars: number | null | undefined }) {
  const { t } = usePublicCopy();
  if (!stars || !Number.isInteger(stars) || stars < 1 || stars > 5) return null;
  return <Chip><Star size={14} className="fill-gold-400" aria-hidden="true" /><span>{t('visualRefresh.stars', { count: stars })}</span></Chip>;
}
