import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { TranslationsBlob } from '../services/api'

interface HasTranslations {
  translations?: TranslationsBlob
}

/**
 * Returns a function that resolves translated field values for a record with
 * a `translations` JSONB blob. Falls back to the English (original) value
 * if no translation exists for the current locale, or if the locale is English.
 */
export function useTranslatedField() {
  const { i18n } = useTranslation()
  const locale = i18n.language

  const tf = useCallback(
    <T extends HasTranslations>(record: T | null | undefined, field: keyof T & string): string => {
      if (!record) return ''
      const original = String(record[field] ?? '')
      if (!locale || locale === 'en') return original
      return record.translations?.[field]?.[locale] || original
    },
    [locale]
  )

  return tf
}
