import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'

export const STARTING_WEALTH_COPPER = 30000

export function useCurrency() {
  const preferences = usePreferencesStore()
  const { locale: prefLocale } = storeToRefs(preferences)
  const { locale: wikiLocale } = useWikiI18n()

  const currentLocale = computed<'pt' | 'en'>(() =>
    prefLocale.value === 'en' || wikiLocale.value === 'en' ? 'en' : 'pt'
  )

  function formatPrice(
    rawCost: number | undefined | null,
    targetLocale?: 'pt' | 'en'
  ): string {
    const lang = targetLocale ?? currentLocale.value
    const total =
      typeof rawCost === 'number' && !Number.isNaN(rawCost)
        ? Math.max(0, Math.floor(rawCost))
        : 0

    const gold = Math.floor(total / 10000)
    const silver = Math.floor((total % 10000) / 100)
    const copper = total % 100

    const goldUnit = lang === 'pt' ? 'Au' : 'g'
    const silverUnit = lang === 'pt' ? 'p' : 's'
    const copperUnit = 'c'

    const parts: string[] = []
    if (gold > 0) parts.push(`${gold}${goldUnit}`)
    if (silver > 0) parts.push(`${silver}${silverUnit}`)
    if (copper > 0 || parts.length === 0) parts.push(`${copper}${copperUnit}`)

    return parts.join(' ')
  }

  function getRemainingWealth(
    rawCost: number | undefined | null,
    startingCopper = STARTING_WEALTH_COPPER
  ): number {
    const cost =
      typeof rawCost === 'number' && !Number.isNaN(rawCost)
        ? Math.max(0, Math.floor(rawCost))
        : 0
    return Math.max(0, startingCopper - cost)
  }

  return {
    STARTING_WEALTH_COPPER,
    formatPrice,
    getRemainingWealth,
  }
}