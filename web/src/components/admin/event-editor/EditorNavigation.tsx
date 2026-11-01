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
      className="grid grid-cols-2 gap-1 border-b border-white/10 p-3 sm:grid-cols-3 lg:grid-cols-5"
    >
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
    </nav>
  )
}
