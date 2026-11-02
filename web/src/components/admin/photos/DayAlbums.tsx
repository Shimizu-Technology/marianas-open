import { AdminWriteButton } from '../AdminWriteControls'
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { photoIntake, type DayProposal } from '../../../services/photoIntake';
import { photoButton, photoPrimaryButton } from './styles';

interface Props { eventId: number; albumType: string; category: string; timezone: string; busy: boolean; mutate: (operation: () => Promise<unknown>, message: string) => Promise<void> }
export default function DayAlbums({ eventId, albumType, category, timezone, busy, mutate }: Props) {
  const [proposals, setProposals] = useState<DayProposal[] | null>(null);
  const [unassigned, setUnassigned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scope, setScope] = useState('');
  const currentScope = JSON.stringify([albumType, category, timezone]);
  const valid = scope === currentScope;

  async function preview() {
    setLoading(true); setError('');
    try {
      const result = await photoIntake.proposals(eventId, albumType, category);
      setProposals(result.proposals); setUnassigned(result.unassigned_count); setScope(currentScope);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read photo dates. Try again.'); }
    finally { setLoading(false); }
  }

  return <div className="space-y-2 rounded-lg border border-white/10 p-3">
    <h3 className="flex items-center gap-2 text-sm font-medium"><CalendarDays size={18} className="text-gold" />Suggest albums from photo dates</h3>
    <p className="text-xs leading-5 text-text-muted">Uses camera timestamps, then ZIP file dates, in {timezone}. Dates must fall within the event. Missing dates stay unassigned. Existing albums change only after you confirm.</p>
    <p className="text-xs leading-5 text-text-muted">Includes matching {albumType || 'chosen type'} imports and unassigned photos{category ? `, plus direct uploads in ${category}` : ''}.</p>
    <button className={photoButton} disabled={busy || loading || !albumType.trim()} onClick={() => void preview()}>{loading ? 'Reading dates…' : 'Preview day albums'}</button>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {proposals && valid && <div className="space-y-3">
      {proposals.length ? <ul className="space-y-2">{proposals.map(proposal => <li key={`${proposal.category}:${proposal.date}`} className="flex flex-wrap justify-between gap-1 border-b border-white/10 py-2 text-sm"><span className="break-words font-medium">{proposal.category}</span><span className="text-text-secondary">{proposal.date} · {proposal.image_ids.length} photos</span></li>)}</ul> : <p className="text-sm text-text-secondary">No dated photos are eligible for day albums yet. Wait for processing or choose an album manually.</p>}
      <p className="text-xs text-text-muted">{unassigned} photos without an eligible date. No dates are invented.</p>
      {!!proposals.length && <AdminWriteButton className={photoPrimaryButton} disabled={busy || loading} onClick={() => void mutate(async () => { await photoIntake.applyProposals(eventId, albumType, proposals, category); setProposals(null); }, 'Day albums applied to the confirmed photos.')}>
        Confirm {proposals.reduce((count, proposal) => count + proposal.image_ids.length, 0)} photo assignments
      </AdminWriteButton>}
    </div>}
    {proposals && !valid && <p className="text-xs text-text-muted">Settings changed. Preview again before confirming.</p>}
  </div>;
}
