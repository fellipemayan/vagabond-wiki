import { defineStore } from 'pinia'
import type { Locale } from '~/utils/i18n'

export type ThemeMode = 'light' | 'dark'

export const usePreferencesStore = defineStore('preferences', () => {
  const locale = useCookie<Locale>('vagabond-wiki-locale', {
    default: () => 'pt',
    sameSite: 'lax',
  })

  const theme = useCookie<ThemeMode>('vagabond-wiki-theme', {
    default: () => 'dark',
    sameSite: 'lax',
  })

  const showHomebrew = useCookie<boolean>('vagabond-wiki-homebrew', {
    default: () => true,
    sameSite: 'lax',
  })

  function setLocale(nextLocale: Locale) {
    locale.value = nextLocale
  }

  function toggleLocale() {
    locale.value = locale.value === 'pt' ? 'en' : 'pt'
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function toggleHomebrew() {
    showHomebrew.value = !showHomebrew.value
  }

  return {
    locale,
    theme,
    showHomebrew,
    setLocale,
    toggleLocale,
    toggleTheme,
    toggleHomebrew,
  }
})