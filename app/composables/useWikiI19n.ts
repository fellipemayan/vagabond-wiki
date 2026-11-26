import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import {
  getIntlText,
  getIntlBlocks,
  getIntlPlainText,
  type IntlStringArray,
  type IntlBlockArray,
  type Locale,
} from '~/utils/i18n'

export function useWikiI18n() {
  const preferences = usePreferencesStore()
  const { locale } = storeToRefs(preferences)

  function tText(items: IntlStringArray, fallback = '', overrideLocale?: Locale) {
    return getIntlText(items, overrideLocale ?? locale.value, fallback)
  }

  function tBlocks(items: IntlBlockArray, overrideLocale?: Locale) {
    return getIntlBlocks(items, overrideLocale ?? locale.value)
  }

  function tPlain(items: IntlBlockArray, fallback = '', overrideLocale?: Locale) {
    return getIntlPlainText(items, overrideLocale ?? locale.value, fallback)
  }

  return {
    locale,
    tText,
    tBlocks,
    tPlain,
  }
}