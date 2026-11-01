import { Plus, X } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type {
  EventFormData,
  EventVenueHighlight,
  EventRegistrationStep,
  EventRegistrationFeeSection,
  EventRegistrationInfoItem,
  EventTravelItem,
  EventVisaItem,
} from '../../../services/api'
import { Field } from './EditorFields'

export default function EventContentFields({
  kind,
  form,
  onChange,
}: {
  kind: 'registration' | 'venue'
  form: EventFormData
  onChange: Dispatch<SetStateAction<EventFormData>>
}) {
  const updateForm = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) =>
    onChange((previous) => ({ ...previous, [field]: value }))
  const addVenueHighlight = () => {
    onChange((prev) => ({
      ...prev,
      venue_highlights: [...prev.venue_highlights, { title: '', description: '' }],
    }))
  }

  const updateVenueHighlight = (idx: number, field: keyof EventVenueHighlight, value: string) => {
    onChange((prev) => ({
      ...prev,
      venue_highlights: prev.venue_highlights.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }))
  }

  const removeVenueHighlight = (idx: number) => {
    onChange((prev) => ({
      ...prev,
      venue_highlights: prev.venue_highlights.filter((_, i) => i !== idx),
    }))
  }

  const addRegistrationStep = () => {
    onChange((prev) => ({
      ...prev,
      registration_steps: [...prev.registration_steps, { title: '', description: '', url: '', link_label: '' }],
    }))
  }

  const updateRegistrationStep = (idx: number, field: keyof EventRegistrationStep, value: string) => {
    onChange((prev) => ({
      ...prev,
      registration_steps: prev.registration_steps.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }))
  }

  const removeRegistrationStep = (idx: number) => {
    onChange((prev) => ({
      ...prev,
      registration_steps: prev.registration_steps.filter((_, i) => i !== idx),
    }))
  }

  const addRegistrationFeeSection = () => {
    onChange((prev) => ({
      ...prev,
      registration_fee_sections: [
        ...prev.registration_fee_sections,
        { title: '', rows: [{ deadline: '', fee: '', option: '' }] },
      ],
    }))
  }

  const updateRegistrationFeeSection = (idx: number, field: keyof EventRegistrationFeeSection, value: string) => {
    onChange((prev) => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeRegistrationFeeSection = (idx: number) => {
    onChange((prev) => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.filter((_, i) => i !== idx),
    }))
  }

  const addRegistrationFeeRow = (sectionIdx: number) => {
    onChange((prev) => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.map((section, i) =>
        i === sectionIdx ? { ...section, rows: [...section.rows, { deadline: '', fee: '', option: '' }] } : section
      ),
    }))
  }

  const updateRegistrationFeeRow = (
    sectionIdx: number,
    rowIdx: number,
    field: 'deadline' | 'fee' | 'option',
    value: string
  ) => {
    onChange((prev) => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.map((section, i) =>
        i === sectionIdx
          ? {
              ...section,
              rows: section.rows.map((row, j) => (j === rowIdx ? { ...row, [field]: value } : row)),
            }
          : section
      ),
    }))
  }

  const removeRegistrationFeeRow = (sectionIdx: number, rowIdx: number) => {
    onChange((prev) => ({
      ...prev,
      registration_fee_sections: prev.registration_fee_sections.map((section, i) =>
        i === sectionIdx ? { ...section, rows: section.rows.filter((_, j) => j !== rowIdx) } : section
      ),
    }))
  }

  const addRegistrationInfoItem = () => {
    onChange((prev) => ({
      ...prev,
      registration_info_items: [...prev.registration_info_items, { label: '', value: '' }],
    }))
  }

  const updateRegistrationInfoItem = (idx: number, field: keyof EventRegistrationInfoItem, value: string) => {
    onChange((prev) => ({
      ...prev,
      registration_info_items: prev.registration_info_items.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeRegistrationInfoItem = (idx: number) => {
    onChange((prev) => ({
      ...prev,
      registration_info_items: prev.registration_info_items.filter((_, i) => i !== idx),
    }))
  }

  const addTravelItem = () => {
    onChange((prev) => ({
      ...prev,
      travel_items: [
        ...prev.travel_items,
        { kind: 'info', title: '', description: '', value: '', code: '', url: '', link_label: '' },
      ],
    }))
  }

  const updateTravelItem = (idx: number, field: keyof EventTravelItem, value: string) => {
    onChange((prev) => ({
      ...prev,
      travel_items: prev.travel_items.map((item, i) =>
        i === idx ? { ...item, [field]: value, ...(field === 'kind' && value !== 'offer' ? { code: '' } : {}) } : item
      ),
    }))
  }

  const removeTravelItem = (idx: number) => {
    onChange((prev) => ({
      ...prev,
      travel_items: prev.travel_items.filter((_, i) => i !== idx),
    }))
  }

  const addVisaItem = () => {
    onChange((prev) => ({
      ...prev,
      visa_items: [...prev.visa_items, { title: '', description: '' }],
    }))
  }

  const updateVisaItem = (idx: number, field: keyof EventVisaItem, value: string) => {
    onChange((prev) => ({
      ...prev,
      visa_items: prev.visa_items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }))
  }

  const removeVisaItem = (idx: number) => {
    onChange((prev) => ({
      ...prev,
      visa_items: prev.visa_items.filter((_, i) => i !== idx),
    }))
  }

  return kind === 'registration' ? (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {' '}
        <Field label="Date" type="date" value={form.date} onChange={(v) => updateForm('date', v)} />
        <Field label="End Date" type="date" value={form.end_date} onChange={(v) => updateForm('end_date', v)} />
        <Field
          label="ASJJF Event Info URL (Gi)"
          value={form.registration_url_gi}
          onChange={(v) => updateForm('registration_url_gi', v)}
          placeholder="https://asjjf.org/main/eventInfo/..."
        />
        <Field
          label="ASJJF Event Info URL (No-Gi)"
          value={form.registration_url_nogi}
          onChange={(v) => updateForm('registration_url_nogi', v)}
          placeholder="https://asjjf.org/main/eventInfo/..."
        />
        <Field
          label="ASJJF Event Info URL (Legacy)"
          value={form.registration_url}
          onChange={(v) => updateForm('registration_url', v)}
          placeholder="https://asjjf.org/main/eventInfo/..."
        />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.registration_not_open ?? false}
          onChange={(e) => updateForm('registration_not_open', e.target.checked)}
        />
        Registration has not opened
      </label>{' '}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Registration Steps</h3>
          <button
            onClick={addRegistrationStep}
            className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
          >
            <Plus className="w-3 h-3" /> Add Step
          </button>
        </div>
        {form.registration_steps.map((item, idx) => (
          <div key={`registration-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-white/5 p-3">
            <input
              aria-label="Step title"
              value={item.title || ''}
              onChange={(e) => updateRegistrationStep(idx, 'title', e.target.value)}
              placeholder="Step title"
              className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
            />
            <input
              aria-label="Optional link label"
              value={item.link_label || ''}
              onChange={(e) => updateRegistrationStep(idx, 'link_label', e.target.value)}
              placeholder="Optional link label"
              className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
            />
            <div className="md:col-span-2">
              <textarea
                aria-label="Step description"
                value={item.description}
                onChange={(e) => updateRegistrationStep(idx, 'description', e.target.value)}
                rows={2}
                placeholder="Step description"
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
              />
            </div>
            <input
              aria-label="Optional URL"
              value={item.url || ''}
              onChange={(e) => updateRegistrationStep(idx, 'url', e.target.value)}
              placeholder="Optional URL"
              className="md:col-span-2 w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
            />
            <button
              onClick={() => removeRegistrationStep(idx)}
              className="justify-self-start p-2 text-text-muted hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Registration Fee Tables</h3>
          <button
            onClick={addRegistrationFeeSection}
            className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
          >
            <Plus className="w-3 h-3" /> Add Table
          </button>
        </div>
        {form.registration_fee_sections.map((section, sectionIdx) => (
          <div key={`fee-section-${sectionIdx}`} className="border border-white/5 p-3 space-y-3">
            <div className="flex items-start gap-3">
              <input
                aria-label="Table title"
                value={section.title}
                onChange={(e) => updateRegistrationFeeSection(sectionIdx, 'title', e.target.value)}
                placeholder="Table title"
                className="flex-1 bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
              />
              <button
                onClick={() => removeRegistrationFeeSection(sectionIdx)}
                className="p-2 text-text-muted hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {section.rows.map((row, rowIdx) => (
                <div
                  key={`fee-row-${sectionIdx}-${rowIdx}`}
                  className="grid grid-cols-1 md:grid-cols-[1.4fr_0.9fr_1fr_auto] gap-3 items-start"
                >
                  <input
                    aria-label="Deadline"
                    value={row.deadline}
                    onChange={(e) => updateRegistrationFeeRow(sectionIdx, rowIdx, 'deadline', e.target.value)}
                    placeholder="Deadline"
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                  <input
                    aria-label="Fee"
                    value={row.fee}
                    onChange={(e) => updateRegistrationFeeRow(sectionIdx, rowIdx, 'fee', e.target.value)}
                    placeholder="Fee"
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                  <input
                    aria-label="Division option"
                    value={row.option}
                    onChange={(e) => updateRegistrationFeeRow(sectionIdx, rowIdx, 'option', e.target.value)}
                    placeholder="Division option"
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  />
                  <button
                    onClick={() => removeRegistrationFeeRow(sectionIdx, rowIdx)}
                    className="p-2 text-text-muted hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addRegistrationFeeRow(sectionIdx)}
              className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Registration Info</h3>
          <button
            onClick={addRegistrationInfoItem}
            className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
          >
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>
        {form.registration_info_items.map((item, idx) => (
          <div
            key={`registration-info-${idx}`}
            className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start"
          >
            <input
              aria-label="Label"
              value={item.label}
              onChange={(e) => updateRegistrationInfoItem(idx, 'label', e.target.value)}
              placeholder="Label"
              className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
            />
            <textarea
              aria-label="Value"
              value={item.value}
              onChange={(e) => updateRegistrationInfoItem(idx, 'value', e.target.value)}
              rows={2}
              placeholder="Value"
              className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
            />
            <button onClick={() => removeRegistrationInfoItem(idx)} className="p-2 text-text-muted hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  ) : (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {' '}
        <Field label="Venue Name" value={form.venue_name} onChange={(v) => updateForm('venue_name', v)} />
        <Field label="Venue Address" value={form.venue_address} onChange={(v) => updateForm('venue_address', v)} />
        <Field label="City" value={form.city} onChange={(v) => updateForm('city', v)} />
        <Field label="Country" value={form.country} onChange={(v) => updateForm('country', v)} />
        <Field
          label="Country Code"
          value={form.country_code}
          onChange={(v) => updateForm('country_code', v)}
          placeholder="GU"
        />
        <Field label="Latitude" value={form.latitude} onChange={(v) => updateForm('latitude', v)} />
        <Field label="Longitude" value={form.longitude} onChange={(v) => updateForm('longitude', v)} />
      </div>{' '}
      <div className="md:col-span-2">
        <label
          className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5"
          htmlFor="eventcontentfields-field-1"
        >
          Travel Description
        </label>
        <textarea
          id="eventcontentfields-field-1"
          value={form.travel_description}
          onChange={(e) => updateForm('travel_description', e.target.value)}
          rows={3}
          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
          placeholder="Helpful travel context for this specific event."
        />
      </div>{' '}
      <div className="md:col-span-2">
        <label
          className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5"
          htmlFor="eventcontentfields-field-2"
        >
          Visa Description
        </label>
        <textarea
          id="eventcontentfields-field-2"
          value={form.visa_description}
          onChange={(e) => updateForm('visa_description', e.target.value)}
          rows={3}
          className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
          placeholder="Visa or entry guidance for this event."
        />
      </div>{' '}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Venue Highlights</h3>
          <button
            onClick={addVenueHighlight}
            className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
          >
            <Plus className="w-3 h-3" /> Add Highlight
          </button>
        </div>
        {form.venue_highlights.map((item, idx) => (
          <div key={`venue-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start">
            <input
              aria-label="Highlight title"
              value={item.title}
              onChange={(e) => updateVenueHighlight(idx, 'title', e.target.value)}
              placeholder="Highlight title"
              className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
            />
            <input
              aria-label="Highlight description"
              value={item.description}
              onChange={(e) => updateVenueHighlight(idx, 'description', e.target.value)}
              placeholder="Highlight description"
              className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
            />
            <button onClick={() => removeVenueHighlight(idx)} className="p-2 text-text-muted hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Travel Cards</h3>
          <button onClick={addTravelItem} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
            <Plus className="w-3 h-3" /> Add Card
          </button>
        </div>
        {form.travel_items.map((item, idx) => (
          <div
            key={item.key || `travel-${idx}`}
            className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-white/10 bg-white/[0.015] p-4"
          >
            <div>
              <label
                htmlFor={`travel-${idx}-kind`}
                className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1.5"
              >
                Card Type
              </label>
              <select
                id={`travel-${idx}-kind`}
                value={item.kind || 'info'}
                onChange={(e) => updateTravelItem(idx, 'kind', e.target.value)}
                className="min-h-11 w-full bg-surface border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              >
                <option value="info">Travel information</option>
                <option value="offer">Travel offer with code</option>
              </select>
            </div>
            <div>
              <label
                htmlFor={`travel-${idx}-title`}
                className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1.5"
              >
                Title
              </label>
              <input
                id={`travel-${idx}-title`}
                value={item.title}
                onChange={(e) => updateTravelItem(idx, 'title', e.target.value)}
                placeholder="United Meetings Travel"
                className="min-h-11 w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              />
            </div>
            <div>
              <label
                htmlFor={`travel-${idx}-${item.kind === 'offer' ? 'code' : 'value'}`}
                className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1.5"
              >
                {item.kind === 'offer' ? 'Offer Code' : 'Optional Value'}
              </label>
              <input
                id={`travel-${idx}-${item.kind === 'offer' ? 'code' : 'value'}`}
                value={item.kind === 'offer' ? item.code || '' : item.value || ''}
                onChange={(e) => updateTravelItem(idx, item.kind === 'offer' ? 'code' : 'value', e.target.value)}
                placeholder={
                  item.kind === 'offer' ? 'Enter the code exactly as provided' : 'Airport code or short detail'
                }
                className="min-h-11 w-full bg-white/[0.03] border border-white/10 px-3 py-2 font-mono text-sm text-text-primary placeholder:font-sans placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor={`travel-${idx}-description`}
                className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1.5"
              >
                Description
              </label>
              <textarea
                id={`travel-${idx}-description`}
                value={item.description || ''}
                onChange={(e) => updateTravelItem(idx, 'description', e.target.value)}
                rows={2}
                placeholder="Card description"
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label
                htmlFor={`travel-${idx}-url`}
                className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1.5"
              >
                Destination URL
              </label>
              <input
                id={`travel-${idx}-url`}
                type="url"
                value={item.url || ''}
                onChange={(e) => updateTravelItem(idx, 'url', e.target.value)}
                placeholder="https://example.com/travel"
                className="min-h-11 w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              />
            </div>
            <div>
              <label
                htmlFor={`travel-${idx}-link-label`}
                className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1.5"
              >
                Link Label
              </label>
              <input
                id={`travel-${idx}-link-label`}
                value={item.link_label || ''}
                onChange={(e) => updateTravelItem(idx, 'link_label', e.target.value)}
                placeholder="Search flights"
                className="min-h-11 w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              />
            </div>
            <button
              type="button"
              onClick={() => removeTravelItem(idx)}
              className="inline-flex min-h-11 items-center gap-2 justify-self-start px-3 text-xs font-medium text-text-muted transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            >
              <X className="w-4 h-4" /> Remove card
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-primary">Visa Items</h3>
          <button onClick={addVisaItem} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80">
            <Plus className="w-3 h-3" /> Add Visa Item
          </button>
        </div>
        {form.visa_items.map((item, idx) => (
          <div key={`visa-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start">
            <input
              aria-label="Visa item title"
              value={item.title}
              onChange={(e) => updateVisaItem(idx, 'title', e.target.value)}
              placeholder="Visa item title"
              className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
            />
            <textarea
              aria-label="Visa item description"
              value={item.description}
              onChange={(e) => updateVisaItem(idx, 'description', e.target.value)}
              rows={2}
              placeholder="Visa item description"
              className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
            />
            <button onClick={() => removeVisaItem(idx)} className="p-2 text-text-muted hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
