<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import type { IntlStringArray, IntlBlockArray } from '~/utils/i18n'

const isListCollapsedMobile = ref(true)

interface AncestryTraitItem {
  _key: string
  name: IntlStringArray
  description: IntlBlockArray
}

interface AncestryItem {
  _id: string
  key?: string
  name: IntlStringArray
  type: IntlStringArray
  size: IntlStringArray
  description: IntlBlockArray
  homebrew?: boolean
  sourceId?: string
  bookTitle?: IntlStringArray
  bookAcronym?: IntlStringArray
  traits?: AncestryTraitItem[]
}

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()
const { showHomebrew } = storeToRefs(preferences)
const { locale, tText, tBlocks } = useWikiI18n()

const ANCESTRIES_QUERY = `
*[_type == "ancestry"] {
  _id,
  "key": coalesce(key.current, slug.current),
  name,
  type,
  size,
  description,
  homebrew,
  "sourceId": source._ref,
  "bookTitle": source->title,
  "bookAcronym": source->acronym,
  traits[]{
    _key,
    name,
    description
  }
}
`

const { data: ancestries, pending, error } = await useSanityQuery<AncestryItem[]>(
  'wiki-ancestries',
  ANCESTRIES_QUERY
)

const filterQuery = ref('')
const filterSources = ref<string[]>([])

function getSourceKey(item: AncestryItem): string {
  return (
    item.sourceId ||
    tText(item.bookAcronym, '', 'pt') ||
    tText(item.bookTitle, '', 'pt') ||
    ''
  )
}

const sourceOptions = computed(() => {
  const map = new Map<string, { id: string; label: string }>()

  for (const item of ancestries.value ?? []) {
    if (!showHomebrew.value && item.homebrew) continue

    const id = getSourceKey(item)
    if (!id || map.has(id)) continue

    const acronym = tText(item.bookAcronym)
    const title = tText(item.bookTitle)
    const label =
      acronym && title && acronym !== title
        ? `${acronym} — ${title}`
        : title || acronym || id

    map.set(id, { id, label })
  }

  const collatorLocale = locale.value === 'pt' ? 'pt-BR' : 'en'
  return [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, collatorLocale, { sensitivity: 'base' })
  )
})

watch(showHomebrew, (enabled) => {
  if (!enabled) {
    const validIds = new Set(sourceOptions.value.map((s) => s.id))
    filterSources.value = filterSources.value.filter((id) => validIds.has(id))
  }
})

function toggleSource(id: string) {
  filterSources.value = filterSources.value.includes(id)
    ? filterSources.value.filter((item) => item !== id)
    : [...filterSources.value, id]
}

function clearFilters() {
  filterQuery.value = ''
  filterSources.value = []
}

const activeFilterCount = computed(() => filterSources.value.length)

const hasActiveFilters = computed(() =>
  Boolean(filterQuery.value.trim() || activeFilterCount.value > 0)
)

const filteredAncestries = computed(() => {
  const list = ancestries.value ?? []
  const term = filterQuery.value.trim().toLowerCase()
  const collatorLocale = locale.value === 'pt' ? 'pt-BR' : 'en'

  return list
    .filter((item) => {
      if (!showHomebrew.value && item.homebrew) return false

      if (filterSources.value.length > 0) {
        const srcKey = getSourceKey(item)
        if (!filterSources.value.includes(srcKey)) return false
      }

      if (!term) return true

      const ptName = tText(item.name, '', 'pt').toLowerCase()
      const enName = tText(item.name, '', 'en').toLowerCase()
      const slug = (item.key ?? '').toLowerCase()
      const traitNames = (item.traits ?? [])
        .map((tr) => `${tText(tr.name, '', 'pt')} ${tText(tr.name, '', 'en')}`.toLowerCase())
        .join(' ')

      return (
        ptName.includes(term) ||
        enName.includes(term) ||
        slug.includes(term) ||
        traitNames.includes(term)
      )
    })
    .sort((a, b) => {
      const nameA = tText(a.name) || a.key || ''
      const nameB = tText(b.name) || b.key || ''
      return nameA.localeCompare(nameB, collatorLocale, { sensitivity: 'base' })
    })
})

const selectedAncestry = computed<AncestryItem | null>(() => {
  const list = filteredAncestries.value
  if (list.length === 0) return null

  const queryItem = typeof route.query.item === 'string' ? route.query.item : ''
  if (queryItem) {
    const found = list.find((a) => a.key === queryItem || a._id === queryItem)
    if (found) return found
  }

  return list[0] ?? null
})

function selectAncestry(item: AncestryItem) {
  const identifier = item.key || item._id
  router.replace({
    query: {
      ...route.query,
      item: identifier,
    },
  })
}
</script>

<template>
  <div class="detail-page">
    <header class="page-header">
      <div>
        <h1>
          {{ locale === 'pt' ? 'Ancestralidades' : 'Ancestries' }}
        </h1>
      </div>
    </header>

    <WikiFilterBar
      v-if="sourceOptions.length > 0"
      :title="locale === 'pt' ? 'Filtros' : 'Filters'"
      :collapsible="true"
      :default-collapsed="true"
      :has-active-filters="hasActiveFilters"
      :active-count="activeFilterCount"
      :reset-label="locale === 'pt' ? 'Limpar filtros' : 'Clear filters'"
      @reset="clearFilters"
    >
      <div class="filters-row">
        <div class="filter-group filter-group-grow">
          <label class="filter-label">
            {{ locale === 'pt' ? 'Fonte' : 'Source' }}
          </label>
          <div class="chips-wrap">
            <button
              v-for="src in sourceOptions"
              :key="src.id"
              type="button"
              class="select-chip"
              :class="{ 'is-active': filterSources.includes(src.id) }"
              @click="toggleSource(src.id)"
            >
              {{ src.label }}
            </button>
          </div>
        </div>
      </div>
    </WikiFilterBar>

    <div v-if="pending" class="state-box">
      {{ locale === 'pt' ? 'Carregando ancestralidades...' : 'Loading ancestries...' }}
    </div>

    <div v-else-if="error" class="state-box is-error">
      {{ locale === 'pt' ? 'Erro ao carregar ancestralidades.' : 'Failed to load ancestries.' }}
    </div>

    <div v-else class="split-layout">
      <!-- Lista lateral -->
      <section class="list-pane">
        <div class="list-controls">
          <input
            v-model="filterQuery"
            type="search"
            class="filter-input"
            :placeholder="
              locale === 'pt'
                ? 'Filtrar por nome ou traço...'
                : 'Filter by name or trait...'
            "
          />
          <span class="list-count">
            {{ filteredAncestries.length }}
          </span>
          <button
            type="button"
            class="mobile-list-toggle"
            :aria-expanded="!isListCollapsedMobile"
            @click="isListCollapsedMobile = !isListCollapsedMobile"
          >
            {{
              isListCollapsedMobile
                ? locale === 'pt'
                  ? 'Lista'
                  : 'List'
                : locale === 'pt'
                  ? 'Ocultar'
                  : 'Hide'
            }}
          </button>
        </div>

        <ul
          v-if="filteredAncestries.length > 0"
          class="entity-list"
          :class="{ 'is-collapsed-mobile': isListCollapsedMobile }"
        >
          <li v-for="ancestry in filteredAncestries" :key="ancestry._id">
            <button
              type="button"
              class="entity-row"
              :class="{ 'is-selected': selectedAncestry?._id === ancestry._id }"
              @click="selectAncestry(ancestry)"
            >
              <div class="row-main">
                <span class="row-title">{{ tText(ancestry.name) }}</span>
              </div>
              <div class="row-meta">
                <span>{{ tText(ancestry.type) }}</span>
                <span>|</span>
                <span>{{ tText(ancestry.size) }}</span>
              </div>
            </button>
          </li>
        </ul>

        <div v-else class="empty-list">
          {{ locale === 'pt' ? 'Nenhuma ancestralidade encontrada.' : 'No ancestries found.' }}
        </div>
      </section>

      <!-- Painel de detalhes -->
      <article v-if="selectedAncestry" class="detail-pane">
        <header class="detail-header">
          <div class="detail-title-row">
            <h2 class="detail-title">{{ tText(selectedAncestry.name) }}</h2>
          </div>
        </header>

        <section class="detail-section">
          <PortableTextRenderer :blocks="tBlocks(selectedAncestry.description)" />
        </section>

        <section
          v-if="selectedAncestry.traits && selectedAncestry.traits.length > 0"
          class="detail-section"
        >
          <div class="mechanic-header">
            <h3 class="mechanic-name">
              {{
                locale === 'pt'
                  ? `Traços de ${tText(selectedAncestry.name)}`
                  : `${tText(selectedAncestry.name)} Traits`
              }}
            </h3>
            <div class="mechanic-subtitle">
              <span>
                <strong>{{ locale === 'pt' ? 'Tipo: ' : 'Type: ' }}</strong>
                {{ tText(selectedAncestry.type) }}
              </span>
              <span> | </span>
              <span>
                <strong>{{ locale === 'pt' ? 'Tamanho: ' : 'Size: ' }}</strong>
                {{ tText(selectedAncestry.size) }}
              </span>
            </div>
          </div>

          <ul class="trait-list">
            <li
              v-for="trait in selectedAncestry.traits"
              :key="trait._key"
              class="trait-list-item"
            >
              <p>
                <strong>{{ tText(trait.name) }}: </strong>
                <PortableTextRenderer :blocks="tBlocks(trait.description)" />
              </p>
            </li>
          </ul>
        </section>

        <footer
          v-if="tText(selectedAncestry.bookTitle) || tText(selectedAncestry.bookAcronym)"
          class="detail-source"
        >
          <strong>{{ locale === 'pt' ? 'Fonte: ' : 'Source: ' }}</strong>
          <span>{{ tText(selectedAncestry.bookTitle) || tText(selectedAncestry.bookAcronym) }}</span>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  align-items: flex-start;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 11rem;
}

.filter-group-grow {
  flex: 1 1 20rem;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.filter-input {
  flex: 1;
  min-width: 0;
  height: 2rem;
  padding: 0 0.6rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.detail-header {
  display: flex;
  flex-direction: column;
}

.detail-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.detail-title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 700;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.detail-source {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>