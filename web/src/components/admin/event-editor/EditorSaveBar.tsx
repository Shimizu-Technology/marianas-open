import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Keep saving reachable in long sections, aligned with either sidebar width. */
export default function EditorSaveBar({ children }: { children: ReactNode }) {
  const barRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const bar = barRef.current
    const editor = bar?.closest<HTMLElement>('.event-admin')
    if (!bar || !editor) return
    const measure = () => {
      const bounds = editor.getBoundingClientRect()
      if (bounds.width > 0) {
        editor.style.setProperty('--editor-save-left', `${bounds.left}px`)
        editor.style.setProperty('--editor-save-width', `${bounds.width}px`)
      }
      editor.style.setProperty('--editor-save-height', `${bar.getBoundingClientRect().height}px`)
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(editor)
    observer?.observe(bar)
    window.addEventListener('resize', measure)
    measure()
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      for (const key of ['left', 'width', 'height']) editor.style.removeProperty(`--editor-save-${key}`)
    }
  }, [])
  return (
    <div ref={barRef} className="editor-save-bar flex flex-wrap items-center gap-3 border border-white/10 bg-surface px-4 py-3">
      {children}
    </div>
  )
}
