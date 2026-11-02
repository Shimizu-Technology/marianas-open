import type { ComponentProps } from 'react'
import { useAdminAccess } from '../../contexts/AdminAccessContext'

export function AdminWriteButton(props: ComponentProps<'button'>) {
  const { readOnly } = useAdminAccess()
  return <button {...props} onClick={event => { if (!readOnly) props.onClick?.(event) }} disabled={readOnly || props.disabled} title={readOnly ? 'Viewer access is read-only' : props.title} />
}

export function AdminWriteInput(props: ComponentProps<'input'>) {
  const { readOnly } = useAdminAccess()
  return <input {...props} onChange={event => { if (!readOnly) props.onChange?.(event) }} disabled={readOnly || props.disabled} title={readOnly ? 'Viewer access is read-only' : props.title} />
}

export function AdminWriteForm({ onSubmit, ...props }: ComponentProps<'form'>) {
  const { readOnly } = useAdminAccess()
  return <form {...props} onSubmit={event => {
    if (readOnly) { event.preventDefault(); return }
    onSubmit?.(event)
  }} />
}
