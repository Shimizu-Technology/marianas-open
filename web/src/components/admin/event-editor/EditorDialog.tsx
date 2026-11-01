import { useEffect, useRef, type ReactNode } from 'react'

export default function EditorDialog({
  title,
  onClose,
  busy,
  children,
}: {
  title: string
  onClose: () => void
  busy?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      className="event-admin m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto border border-white/20 bg-surface p-5 text-text-primary backdrop:bg-black/75"
    >
      <h2 className="font-heading text-xl font-semibold mb-4">{title}</h2>
      {children}
    </dialog>
  )
}
