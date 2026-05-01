import type { I18nField, I18nList } from '~/types/content'

/**
 * Translate an i18n JSONB-style field using the active locale.
 * Falls back to Indonesian, then to empty string.
 *
 *   const t = useT()
 *   t(project.title)          // string
 *   t(project.services, [])   // array helper variant via useTList
 */
export const useT = () => {
  const { locale } = useI18n()

  return (field: I18nField | undefined | null): string => {
    if (!field) return ''
    return field[locale.value as 'id' | 'en'] ?? field.id ?? ''
  }
}

export const useTList = () => {
  const { locale } = useI18n()

  return (field: I18nList | undefined | null): string[] => {
    if (!field) return []
    return field[locale.value as 'id' | 'en'] ?? field.id ?? []
  }
}
