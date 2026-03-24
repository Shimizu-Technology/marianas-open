import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

interface HasTranslations {
  translations?: Record<string, unknown>
}

/**
 * Returns helpers for resolving translated field values from a record's
 * `translations` JSONB blob. Falls back to English when no translation
 * exists for the current locale.
 *
 * - `tf(record, field)` — for simple text fields (returns string)
 * - `tfa(record, field)` — for JSONB array fields (returns translated array)
 */
export function useTranslatedField() {
  const { i18n } = useTranslation()
  const locale = i18n.language

  const tf = useCallback(
    <T extends HasTranslations>(record: T | null | undefined, field: keyof T & string): string => {
      if (!record) return ''
      const original = String(record[field] ?? '')
      if (!locale || locale === 'en') return original
      const fieldTranslations = record.translations?.[field]
      if (fieldTranslations && typeof fieldTranslations === 'object' && !Array.isArray(fieldTranslations)) {
        return (fieldTranslations as Record<string, string>)[locale] || original
      }
      return original
    },
    [locale]
  )

  const tfa = useCallback(
    <T extends HasTranslations, I>(record: T | null | undefined, field: keyof T & string): I[] => {
      if (!record) return []
      const original = (record[field] ?? []) as I[]
      if (!locale || locale === 'en') return original
      const fieldTranslations = record.translations?.[field]
      if (fieldTranslations && typeof fieldTranslations === 'object' && !Array.isArray(fieldTranslations)) {
        const localeArray = (fieldTranslations as Record<string, I[]>)[locale]
        if (Array.isArray(localeArray) && localeArray.length > 0) return localeArray
      }
      return original
    },
    [locale]
  )

  return { tf, tfa }
}
