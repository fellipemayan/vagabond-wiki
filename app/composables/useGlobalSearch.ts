import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import type { IntlStringArray } from '~/utils/i18n'
import { getSanityClient } from '~/utils/sanity'

export type GlobalSearchEntityType =
  | 'ancestry'
  | 'class'
  | 'perk'
  | 'spell'
  | 'spellDelivery'
  | 'alchemical'
  | 'gear'

export interface GlobalSearchHit {
  _id: string
  _type: GlobalSearchEntityType
  key?: string
  name: IntlStringArray
  category?: string[]
  isRelic?: boolean
  homebrew?: boolean
}

const GLOBAL_SEARCH_QUERY = `
  *[
    _type in ["ancestry", "class", "perk", "spell", "spellDelivery", "alchemical", "gear"] &&
    ($includeHomebrew || homebrew != true) &&
    (
      name[].value match $term ||
      key.current match $term ||
      slug.current match $term
    )
  ][0...24]{
    _id,
    _type,
    "key": coalesce(key.current, slug.current),
    name,
    category,
    homebrew,
    "isRelic": coalesce(relic, "relic" in category, false)
  }
`

export function useGlobalSearch() {
  const preferences = usePreferencesStore()
  const { showHomebrew } = storeToRefs(preferences)

  const searchTerm = ref('')
  const results = ref<GlobalSearchHit[]>([])
  const isSearching = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function resolveHitRoute(hit: GlobalSearchHit) {
    const identifier = hit.key || hit._id
    const query = identifier ? { item: identifier } : undefined

    switch (hit._type) {
      case 'ancestry':
        return { path: '/heroes/ancestries', query }
      case 'class':
        return { path: '/heroes/classes', query }
      case 'perk':
        return { path: '/heroes/perks', query }
      case 'spell':
        return {
          path: '/magic/spells',
          query: identifier ? { spell: identifier } : undefined,
        }
      case 'spellDelivery':
        return { path: '/magic/deliveries', query }
      case 'alchemical':
        return { path: '/gear/alchemicals', query }
      case 'gear': {
        if (hit.isRelic) return { path: '/magic/relics', query }
        const cats = (hit.category ?? []).map((c) => c.toLowerCase())
        if (cats.includes('startingpack') || cats.includes('startingpacks')) {
          return {
            path: '/gear/starting-packs',
            query: identifier ? { pack: identifier } : undefined,
          }
        }
        if (
          cats.includes('alchemical') ||
          cats.includes('alchemicals') ||
          cats.includes('alchemy')
        ) {
          return { path: '/gear/alchemicals', query }
        }
        if (
          cats.includes('weapon') ||
          cats.includes('weapons') ||
          cats.includes('armor') ||
          cats.includes('armors')
        ) {
          return { path: '/gear/armor-weapons', query }
        }
        return { path: '/gear/items', query }
      }
    }
  }

  watch(searchTerm, (raw) => {
    if (timer) clearTimeout(timer)
    const trimmed = raw.trim()

    if (trimmed.length < 2) {
      results.value = []
      isSearching.value = false
      return
    }

    isSearching.value = true
    timer = setTimeout(async () => {
      try {
        const client = getSanityClient()
        const data = await client.fetch<GlobalSearchHit[]>(GLOBAL_SEARCH_QUERY, {
          term: `*${trimmed}*`,
          includeHomebrew: Boolean(showHomebrew.value),
        })
        results.value = data ?? []
      } catch (err) {
        console.error('Erro na busca global:', err)
        results.value = []
      } finally {
        isSearching.value = false
      }
    }, 220)
  })

  return {
    searchTerm,
    results,
    isSearching,
    resolveHitRoute,
  }
}