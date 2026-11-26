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
  *[_type == "ancestry"] | order(coalesce(sortName, name[language == "pt"][0].value, name[_key == "pt"][0].value) asc) {
    _id,
    "key": coalesce(key.current, slug.current),
    name,
    type,
    size,
    description,
    homebrew,
    "bookTitle": source->book.title,
    "bookAcronym": source->book.acronym,
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

const filteredAncestries = computed(() => {
  const list = ancestries.value ?? []
  const term = filterQuery.value.trim().toLowerCase()

  return list.filter((item) => {
    if (!showHomebrew.value && item.homebrew) return false
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
        <!-- <p class="page-subtitle">
          {{
            locale === 'pt'
              ? 'Selecione uma ancestralidade para ver sua descrição, tipo, tamanho e traços.'
              : 'Select an ancestry to view its description, type, size, and traits.'
          }}
        </p> -->
      </div>
    </header>

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
                <span v-if="ancestry.homebrew" class="badge-homebrew">HB</span>
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

          <div class="detail-badges">
            <span
              v-if="tText(selectedAncestry.bookAcronym) || tText(selectedAncestry.bookTitle)"
              class="meta-pill"
            >
              {{ tText(selectedAncestry.bookAcronym) || tText(selectedAncestry.bookTitle) }}
            </span>

            <span v-if="selectedAncestry.homebrew" class="meta-pill is-accent">
              Homebrew
            </span>
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
            {{ locale === 'pt' ? `Traços de ${tText(selectedAncestry.name)}` : `${tText(selectedAncestry.name)} Traits` }}
          </h3>
          <div class="mechanic-subtitle">
                <span>
                  <strong>{{ locale === 'pt' ? 'Tipo: ' : 'Type: '}}</strong>
                  {{ locale === 'pt' ? tText(selectedAncestry.type) : tText(selectedAncestry.name)}}
                </span>
                <span> | </span>
                <span>
                  <strong>{{ locale === 'pt' ? 'Tamanho: ' : 'Size: '}}</strong>
                  {{ locale === 'pt' ? tText(selectedAncestry.size) : tText(selectedAncestry.name)}}
                </span>
              </div>
        </div>
          <ul class="trait-list">
            <li
              class="trait-list-item"
              v-for="trait in selectedAncestry.traits"
            >
              <p>
                <strong>{{ tText(trait.name) }}: </strong>
                <PortableTextRenderer :blocks="tBlocks(trait.description)" />
              </p>    
            </li>
          </ul>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
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

.badge-homebrew {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-sm);
  background-color: var(--bg-subtle);
  color: var(--accent-primary);
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

.detail-slug {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm);
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-color);
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.meta-pill.is-accent {
  background-color: var(--accent-subtle);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  font-weight: 600;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
</style>