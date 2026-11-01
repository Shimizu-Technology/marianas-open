import { editorSections, type EditorSection, type SectionErrors } from './editorState'

export default function EditorNavigation({
  active,
  onSelect,
  errors,
}: {
  active: EditorSection
  onSelect: (section: EditorSection) => void
  errors: SectionErrors
}) {
  return (
    <nav
      aria-label="Event sections"
      className="border-b border-white/10 p-3"
    >
      <label className="block sm:hidden">
        <span className="mb-1 block text-sm text-text-secondary">Event section</span>
        <select
          className="w-full border border-white/15 bg-surface px-3 py-2 text-text-primary"
          value={active}
          onChange={(event) => onSelect(event.target.value as EditorSection)}
        >
          {editorSections.map(([id, label]) => (
            <option key={id} value={id}>{label}{errors[id]?.length ? ` (${errors[id]?.length} errors)` : ''}</option>
          ))}
        </select>
      </label>
      <div className="hidden gap-1 sm:grid sm:grid-cols-3 lg:grid-cols-5">
      {editorSections.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-current={active === id ? 'step' : undefined}
          onClick={() => onSelect(id)}
          className={`min-h-11 px-3 py-2 text-left text-sm rounded border ${active === id ? 'bg-gold/10 border-gold/30 text-gold' : 'border-transparent text-text-secondary hover:bg-white/5'}`}
        >
          {label}
          {errors[id]?.length ? (
            <span className="ml-1 text-red-300" aria-label={`${errors[id]?.length} errors`}>
              •
            </span>
          ) : null}
        </button>
      ))}
      </div>
    </nav>
  )
}
