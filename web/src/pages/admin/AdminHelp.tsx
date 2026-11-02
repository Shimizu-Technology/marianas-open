import { Link } from 'react-router-dom'

const guides = [
  { id: 'events', title: 'Publish an event or start a new season', href: '/admin/events', action: 'Open Events & Results', steps: [
    'Create an event, or use Prepare next season to copy selected events into drafts. Rollover does not publish them.',
    'Open each draft. Check the name, season, dates, venue and official registration links. If registration has not opened, select “not open yet”. Confirm copied schedule and prize rows, and review copied descriptions, travel and hotel details.',
    'Save your changes. In Publishing, use the readiness checklist to find anything still missing or referring to an old season. Preview the public page, then publish when every check passes. Unpublish returns the event to a draft.',
  ] },
  { id: 'results', title: 'Review results and ASJJF checks', href: '/admin/events', action: 'Choose an event’s Results page', steps: [
    'Open Results for the event. Complete ASJJF pages sync automatically; the saved review shows what would be added, removed or changed. Check now queues pages for the nightly fetcher; it does not fetch them immediately.',
    'Held means the proposed changes need a person to check them. Public results stay in place. Refresh / review saved snapshots to see the current proposal. An administrator can approve an eligible review after checking the changes against ASJJF, or discard it to keep the published results.',
    'Missing pages, conflicts and other blocking errors must be fixed before approval. If automatic checks cannot fetch a public ASJJF page, save its HTML in a browser and upload that file with its original URL. ASJJF sync shows the queue, saved pages, safety pause and last fetcher report. Ask an administrator to inspect a safety pause before resetting it.',
  ] },
  { id: 'photos', title: 'Upload photos, import a ZIP and review albums', href: '/admin/photos', action: 'Open Photos', steps: [
    'Choose an event and an upload album. Create an album in Manage albums if needed. Choose photos to add them to the device’s saved upload queue; return to the same browser to resume. Keep the site’s saved data while transfers are pending.',
    'Download a ZIP to your device first, then select it in Photos. Choose the album type, event timezone and review setting. Archives can be up to 4 GiB; Recent ZIP imports shows progress and errors. A finished import may include skipped files.',
    'Preview day albums before applying them. Check dates and assignments first. In Photo library, filter by album, filename, hidden photos or Needs review. Select photos to move, approve, show, hide or delete. Held photos stay hidden until approved. Other flagged photos can already be public. Manually hidden photos need Show to become public again.',
  ] },
  { id: 'sponsors', title: 'Manage sponsors and the featured sponsor bar', href: '/admin/sponsors', action: 'Open Sponsors', steps: [
    'Add a sponsor or open an existing one. Upload the logo variants and choose where each placement appears: featured bar, presenting, secondary, official or event. Event placements can apply to one event or all events.',
    'Set the message, optional video and link, and start/end dates. The preview shows your unsaved choices. Save before leaving. Placements appear only during their date window.',
    'Use the placement list and arrows to change the order in a location. Check placements ending soon with the team before extending their dates.',
  ] },
  { id: 'videos', title: 'Add a video or replace an unavailable one', href: '/admin/videos', action: 'Open Videos', steps: [
    'Add the YouTube URL, title and event, then set the category and other details. Save when ready. Featured videos receive a featured position.',
    'Unavailable videos are hidden automatically after repeated failures. Use Unavailable only (hidden) to find them. Check now queues another availability check. Open the video on YouTube to confirm, then replace its URL or remove the entry if needed.',
  ] },
  { id: 'users', title: 'Invite a staff member or viewer', href: '/admin/users', action: 'Open Users (administrators only)', steps: [
    'An administrator opens Users, selects Invite user, enters the person’s email and chooses a role. Staff can manage content. Viewer can read the shared admin pages but cannot make changes. Admin can also manage access and approve protected reviews.',
    'The person must use the invitation email link to join. Check the invitation status; if the invitation is still pending, resend it from Users. If sending fails, ask Shimizu Technology to check the invitation and email settings.',
    'Viewers and staff cannot manage invitations or settings. Ask an administrator if a person needs a different role. You cannot delete or demote yourself or remove the last administrator.',
  ] },
]

export default function AdminHelp() {
  return <div className="mx-auto max-w-4xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-gold">For the Marianas Open team</p><h1 className="mt-1 font-heading text-3xl font-bold">Staff help</h1><p className="mt-2 text-sm leading-6 text-text-secondary">Choose the task you’re working on. Start with <Link to="/admin" className="text-gold underline">Needs attention</Link> when you’re checking what needs help.</p></header>
    <nav aria-label="Help topics" className="flex flex-wrap gap-x-5 gap-y-1">{guides.map(guide => <a key={guide.id} href={`#${guide.id}`} className="inline-flex min-h-11 items-center text-sm text-gold underline">{guide.title}</a>)}</nav>
    {guides.map(guide => <section id={guide.id} key={guide.id} className="scroll-mt-20 rounded-xl border border-white/15 bg-surface p-4 sm:p-6" aria-labelledby={`help-${guide.id}`}>
      <h2 id={`help-${guide.id}`} className="text-xl font-semibold">{guide.title}</h2>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-text-secondary">{guide.steps.map(step => <li key={step} className="pl-1">{step}</li>)}</ol>
      <Link to={guide.href} className="mt-4 inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-semibold text-gold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">{guide.action}</Link>
      {guide.id === 'results' && <Link to="/admin/asjjf" className="ml-4 inline-flex min-h-11 items-center text-sm font-semibold text-gold underline">Open ASJJF sync</Link>}
    </section>)}
  </div>
}
