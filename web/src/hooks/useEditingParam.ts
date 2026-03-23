import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useEditingParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const editParam = searchParams.get('edit')
  const editing: number | 'new' | null = editParam === 'new' ? 'new' : editParam ? parseInt(editParam) || null : null

  const setEditing = useCallback((value: number | 'new' | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === null) {
        next.delete('edit')
      } else {
        next.set('edit', String(value))
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  return [editing, setEditing] as const
}
