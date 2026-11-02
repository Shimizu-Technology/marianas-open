import { AdminWriteInput, AdminWriteButton } from '../AdminWriteControls'
import { useRef, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Ticket, MapPin, Image as ImageIcon, Upload } from 'lucide-react'
import { api, type Event, type EventFormData, type EventTicketOption } from '../../../services/api'
import { resolveMediaUrl } from '../../../utils/images'
import { Field, SelectField } from './EditorFields'
import type { Dispatch, SetStateAction } from 'react'

export default function TicketsSection({
  form,
  onChange,
  event,
  onReload,
  onError,
  onSuccess,
}: {
  form: EventFormData
  onChange: Dispatch<SetStateAction<EventFormData>>
  event?: Event | null
  onReload: () => Promise<void>
  onError: (message: string) => void
  onSuccess: (message: string) => void
}) {
  const ticketBannerInputRef = useRef<HTMLInputElement>(null)
  const [expandedSections, setExpandedSections] = useState({ ticketSales: true })
  const toggleSection = () => setExpandedSections((previous) => ({ ticketSales: !previous.ticketSales }))
  const editing = event?.id
  const currentEvent = event
  const loadEvents = onReload
  const setError = onError
  const setSuccess = onSuccess
  const updateForm = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) =>
    onChange((previous) => ({ ...previous, [field]: value }))
  const addTicketOption = () => {
    onChange((prev) => ({
      ...prev,
      ticket_options: [...prev.ticket_options, { label: '', description: '', early_bird_price: '', regular_price: '' }],
    }))
  }

  const updateTicketOption = (index: number, field: keyof EventTicketOption, value: string) => {
    onChange((prev) => ({
      ...prev,
      ticket_options: prev.ticket_options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option
      ),
    }))
  }

  const removeTicketOption = (index: number) => {
    onChange((prev) => ({
      ...prev,
      ticket_options: prev.ticket_options.filter((_, optionIndex) => optionIndex !== index),
    }))
  }

  return (
    <>
      {/* Spectator Ticket Sales */}
      <div className="border border-white/5">
        <button
          type="button"
          onClick={() => toggleSection()}
          className="w-full min-h-12 px-4 py-3 flex items-center justify-between text-sm font-medium text-text-primary hover:bg-white/[0.02] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-gold" />
            Spectator Ticket Sales
            {form.ticket_sales_status === 'on_sale' && (
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                On sale
              </span>
            )}
          </span>
          {expandedSections.ticketSales ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expandedSections.ticketSales && (
          <div className="p-4 sm:p-5 border-t border-white/5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Ticket Sales Status"
                value={form.ticket_sales_status}
                onChange={(value) => updateForm('ticket_sales_status', value as EventFormData['ticket_sales_status'])}
                options={[
                  { value: 'unavailable', label: 'Unavailable / Hidden' },
                  { value: 'on_sale', label: 'On Sale' },
                  { value: 'sold_out', label: 'Sold Out' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
              <Field
                label="Early Bird Ends"
                type="date"
                value={form.ticket_early_bird_ends_on}
                onChange={(value) => updateForm('ticket_early_bird_ends_on', value)}
              />
              <div className="md:col-span-2">
                <Field
                  label="Official Online Ticket URL"
                  value={form.ticket_sales_url}
                  onChange={(value) => updateForm('ticket_sales_url', value)}
                  placeholder="https://tickets.example.com/event/..."
                />
                <p className="text-[10px] text-text-muted mt-1.5">
                  Spectator checkout only. Athlete registration remains configured in the ASJJF fields above.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-heading text-sm font-semibold text-text-primary">Admission Options</h3>
                  <p className="text-[10px] text-text-muted mt-1">
                    Prices are promotional content; checkout and service fees remain on the official ticket provider.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addTicketOption}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 border border-gold/30 bg-gold/5 text-gold text-xs font-medium hover:bg-gold/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </button>
              </div>

              {form.ticket_options.length === 0 ? (
                <div className="border border-dashed border-white/10 px-4 py-6 text-center text-xs text-text-muted">
                  No ticket options configured. The ticket button can still link to the official provider.
                </div>
              ) : (
                <div className="space-y-3">
                  {form.ticket_options.map((option, index) => (
                    <div
                      key={`ticket-option-${index}`}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_auto] gap-3 items-end border border-white/5 bg-white/[0.015] p-3"
                    >
                      <Field
                        label="Label"
                        value={option.label}
                        onChange={(value) => updateTicketOption(index, 'label', value)}
                        placeholder="1-Day Child"
                      />
                      <Field
                        label="Age / Note"
                        value={option.description}
                        onChange={(value) => updateTicketOption(index, 'description', value)}
                        placeholder="4–12 yrs"
                      />
                      <Field
                        label="Early Bird"
                        type="number"
                        value={option.early_bird_price}
                        onChange={(value) => updateTicketOption(index, 'early_bird_price', value)}
                        placeholder="17.00"
                      />
                      <Field
                        label="Regular / Door"
                        type="number"
                        value={option.regular_price}
                        onChange={(value) => updateTicketOption(index, 'regular_price', value)}
                        placeholder="20.00"
                      />
                      <button
                        type="button"
                        onClick={() => removeTicketOption(index)}
                        className="min-h-11 min-w-11 inline-flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/5 transition-colors"
                        aria-label={`Remove ${option.label || `ticket option ${index + 1}`}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-text-muted" />
                <h3 className="font-heading text-sm font-semibold text-text-primary">In-Person Purchase</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Location"
                  value={form.ticket_in_person_name}
                  onChange={(value) => updateForm('ticket_in_person_name', value)}
                  placeholder="Deal Depot"
                />
                <Field
                  label="Phone"
                  value={form.ticket_in_person_phone}
                  onChange={(value) => updateForm('ticket_in_person_phone', value)}
                  placeholder="671-647-3325"
                />
                <div className="md:col-span-2">
                  <Field
                    label="Address"
                    value={form.ticket_in_person_address}
                    onChange={(value) => updateForm('ticket_in_person_address', value)}
                    placeholder="114 East Taitano Road, Tamuning, Guam"
                  />
                </div>
              </div>
            </div>

            {typeof editing === 'number' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
                    <ImageIcon className="w-4 h-4 text-text-muted" /> Ticket Flyer
                  </div>
                  <AdminWriteInput
                    ref={ticketBannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file || typeof editing !== 'number') return
                      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                        setError('Ticket flyer must be a JPEG, PNG, or WebP image')
                        event.target.value = ''
                        return
                      }
                      if (file.size > 8 * 1024 * 1024) {
                        setError('Ticket flyer must be smaller than 8 MB')
                        event.target.value = ''
                        return
                      }
                      try {
                        await api.admin.uploadEventTicketBanner(editing, file)
                        await loadEvents()
                        setSuccess('Ticket flyer updated')
                      } catch (uploadError) {
                        setError(uploadError instanceof Error ? uploadError.message : 'Ticket flyer upload failed')
                      } finally {
                        event.target.value = ''
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => ticketBannerInputRef.current?.click()}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-text-secondary transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {currentEvent?.ticket_banner_image_url ? 'Change Flyer' : 'Upload Custom Flyer'}
                  </button>
                  {currentEvent?.ticket_banner_image_url && (
                    <AdminWriteButton
                      type="button"
                      onClick={async () => {
                        if (typeof editing !== 'number') return
                        try {
                          await api.admin.removeEventTicketBanner(editing)
                          await loadEvents()
                          setSuccess('Custom ticket flyer removed')
                        } catch (removeError) {
                          setError(removeError instanceof Error ? removeError.message : 'Failed to remove ticket flyer')
                        }
                      }}
                      className="min-h-11 px-3 text-xs text-text-muted hover:text-red-400 transition-colors"
                    >
                      Remove custom flyer
                    </AdminWriteButton>
                  )}
                </div>
                <p className="text-[10px] text-text-muted">
                  JPEG, PNG, or WebP up to 8 MB.{' '}
                  {form.slug === 'marianas-open-2026'
                    ? 'The supplied 2026 flyer is used automatically until a custom flyer is uploaded.'
                    : 'Upload the official flyer for this event. Removing it leaves this event without a ticket flyer.'}
                </p>
                {(currentEvent?.ticket_banner_image_url || form.slug === 'marianas-open-2026') && (
                  <div className="w-40 aspect-[4/5] overflow-hidden border border-white/10 bg-navy-900">
                    <img
                      src={
                        resolveMediaUrl(currentEvent?.ticket_banner_image_url) ||
                        '/images/tickets/marianas-open-2026-ticket-sales-640.jpg'
                      }
                      alt="Ticket flyer preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
