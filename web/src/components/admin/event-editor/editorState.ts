import type { EventFormData } from '../../../services/api'

export const editorSections = [
  ['basics', 'Basics'],
  ['registration', 'Dates & Registration'],
  ['venue', 'Venue & Travel'],
  ['tickets', 'Tickets'],
  ['schedule', 'Schedule'],
  ['prizes', 'Prizes'],
  ['hotels', 'Hotels & Offers'],
  ['gallery', 'Gallery'],
  ['results', 'Results'],
  ['publishing', 'Publishing'],
] as const
export type EditorSection = (typeof editorSections)[number][0]
export type SectionErrors = Partial<Record<EditorSection, string[]>>

export function formSnapshot(form: EventFormData) {
  const { translation_status: _status, ...content } = form
  void _status
  return JSON.stringify(content)
}

export function validateEventForm(form: EventFormData): SectionErrors {
  const errors: SectionErrors = {}
  const add = (section: EditorSection, message: string) => {
    ;(errors[section] ??= []).push(message)
  }
  if (!form.name.trim()) add('basics', 'Enter an event name.')
  if (
    form.season_year != null &&
    (!Number.isInteger(form.season_year) || form.season_year < 2000 || form.season_year > 2100)
  )
    add('basics', 'Enter a season year between 2000 and 2100.')
  if (form.asjjf_stars != null && (!Number.isSafeInteger(form.asjjf_stars) || form.asjjf_stars < 0))
    add('basics', 'ASJJF stars must be a nonnegative whole number, or blank if unknown.')
  if (form.date && form.end_date && form.end_date < form.date)
    add('registration', 'End date must be on or after the event date.')
  const urls: [EditorSection, string, string][] = [
    ['registration', 'Gi registration', form.registration_url_gi],
    ['registration', 'No-Gi registration', form.registration_url_nogi],
    ['registration', 'Legacy registration', form.registration_url],
    ['tickets', 'Online tickets', form.ticket_sales_url],
    ['publishing', 'Live stream', form.live_stream_url],
    ...form.registration_steps.map(
      (item) => ['registration', 'Registration step', item.url || ''] as [EditorSection, string, string]
    ),
    ...form.travel_items.map((item) => ['venue', 'Travel card', item.url || ''] as [EditorSection, string, string]),
  ]
  urls.forEach(([section, label, value]) => {
    if (!value.trim()) return
    try {
      if (!['https:', 'http:'].includes(new URL(value).protocol)) throw new Error()
    } catch {
      add(section, `${label}: enter a full http or https URL.`)
    }
  })
  for (const [label, value, limit] of [
    ['Latitude', form.latitude, 90],
    ['Longitude', form.longitude, 180],
  ] as const) {
    if (value && (!Number.isFinite(Number(value)) || Math.abs(Number(value)) > limit))
      add('venue', `${label} must be between -${limit} and ${limit}.`)
  }
  form.event_schedule_items_attributes
    .filter((item) => !item._destroy)
    .forEach((item, index) => {
      if (!item.time.trim() || !item.description.trim())
        add('schedule', `Schedule row ${index + 1}: enter a time and description.`)
    })
  form.prize_categories_attributes
    .filter((item) => !item._destroy)
    .forEach((item, index) => {
      if (!item.name.trim()) add('prizes', `Prize row ${index + 1}: enter a category name.`)
    })
  if (form.ticket_options.length > 12) add('tickets', 'Use no more than 12 ticket options.')
  form.ticket_options.forEach((option, index) => {
    if (!option.label.trim()) add('tickets', `Ticket option ${index + 1}: enter a label.`)
    if (option.label.length > 80 || option.description.length > 120)
      add('tickets', `Ticket option ${index + 1}: shorten the label or description.`)
    for (const price of [option.early_bird_price, option.regular_price]) {
      if (price && (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 100000))
        add('tickets', `Ticket option ${index + 1}: enter prices from 0 to 100,000, or leave blank.`)
    }
  })
  if (form.travel_items.length > 12) add('venue', 'Use no more than 12 travel cards.')
  form.travel_items.forEach((item, index) => {
    if (!item.title.trim()) add('venue', `Travel card ${index + 1}: enter a title.`)
    if (!item.description?.trim() && !item.value?.trim() && !item.code?.trim())
      add('venue', `Travel card ${index + 1}: enter a description, value or offer code.`)
    if (item.kind === 'offer' && !item.code?.trim()) add('venue', `Travel card ${index + 1}: enter the offer code.`)
    if (item.url?.trim() && !item.link_label?.trim()) add('venue', `Travel card ${index + 1}: enter a link label.`)
  })
  return errors
}

export function readinessSection(section: string): EditorSection {
  const key = section.toLowerCase().replace(/[ &-]+/g, '_')
  const aliases: Record<string, EditorSection> = {
    dates: 'registration',
    dates_registration: 'registration',
    dates_and_registration: 'registration',
    venue_travel: 'venue',
    venue_and_travel: 'venue',
    travel: 'venue',
    accommodations: 'hotels',
    hotels_offers: 'hotels',
    content: 'publishing',
    review: 'publishing',
    images: 'basics',
    hero: 'basics',
  }
  return editorSections.some(([id]) => id === key) ? (key as EditorSection) : aliases[key] || 'publishing'
}
