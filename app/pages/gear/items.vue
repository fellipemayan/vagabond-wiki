<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import type { IntlStringArray } from '~/utils/i18n'
import type { WikiTableColumn } from '~/components/WikiDataTable.vue'

interface GearItem {
  _id: string
  key?: string
  name: IntlStringArray
  category?: string[]
  cost?: number
  slots?: number
  bonusSlots?: number
  capacity?: IntlStringArray
  homebrew?: boolean
  bookTitle?: IntlStringArray
  bookAcronym?: IntlStringArray
  isAlchemical?: boolean
}

interface AlchemicalItem {
  _id: string
  key?: string
  name: IntlStringArray
  type?: string
  cost?: number
  slots?: number
  homebrew?: boolean
}

const ALCHEMICALS_CATEGORY_KEY = '__alchemicals__'

function normalizeCategoryKey(catKey: string): string {
  return catKey
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1$2')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()
}

function humanizeCategoryKey(catKey: string): string {
  return catKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (ch) => ch.toUpperCase())
}

const RAW_CATEGORY_TRANSLATIONS: Record<string, { pt: string; en: string; order: number }> = {
  alchemyandmedicine: { pt: 'Alquimia e Medicina', en: 'Alchemy and Medicine', order: 0 },
  [ALCHEMICALS_CATEGORY_KEY]: { pt: 'Itens Alquímicos', en: 'Alchemical Items', order: 1 },
  astronomyandnavigation: { pt: 'Astronomia e Navegação', en: 'Astronomy and Navigation', order: 2 },
  beastsandhusbandry: { pt: 'Bestas e Criação', en: 'Beasts and Husbandry', order: 3 },
  booksandmagic: { pt: 'Livros e Magia', en: 'Books and Magic', order: 4 },
  clothinghygieneandtextiles: { pt: 'Vestuário, Higiene e Têxteis', en: 'Clothing, Hygiene and Textiles', order: 5 },
  containersandpacks: { pt: 'Recipientes e Mochilas', en: 'Containers and Packs', order: 6 },
  cookingandfood: { pt: 'Culinária e Alimentação', en: 'Cooking and Food', order: 7 },
  gamesandtoys: { pt: 'Jogos e Brinquedos', en: 'Games and Toys', order: 8 },
  gemsjewelryandsmithing: { pt: 'Gemas, Joalheria e Ourivesaria', en: 'Gems, Jewelry and Smithing', order: 9 },
  hardware: { pt: 'Ferragens e Utilidades', en: 'Hardware', order: 10 },
  liquorandspirits: { pt: 'Bebidas e Destilados', en: 'Liquor and Spirits', order: 11 },
  musical: { pt: 'Instrumentos Musicais', en: 'Musical', order: 12 },
  outdoors: { pt: 'Sobrevivência e Ar Livre', en: 'Outdoors', order: 13 },
  personalitems: { pt: 'Itens Pessoais', en: 'Personal Items', order: 14 },
  smithy: { pt: 'Ferraria', en: 'Smithy', order: 15 },
}

const EXCLUDED_CATEGORIES = new Set([
  'startingpack',
  'startingpacks',
  'weapon',
  'weapons',
  'armor',
  'armors',
])

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()
const { showHomebrew, locale: prefLocale } = storeToRefs(preferences)
const { tText } = useWikiI18n()

const currentLocale = computed<'pt' | 'en'>(() =>
  prefLocale.value === 'en' ? 'en' : 'pt'
)

const ITEMS_QUERY = `
  *[_type == "gear" && !("startingPack" in category)] {
    _id,
    "key": coalesce(key.current, slug.current),
    name,
    category,
    cost,
    slots,
    bonusSlots,
    capacity,
    homebrew,
    "bookTitle": source->title,
    "bookAcronym": source->acronym
  }
`

const ALCHEMICALS_QUERY = `
  *[_type == "alchemical"] {
    _id,
    "key": coalesce(key.current, slug.current),
    name,
    type,
    cost,
    slots,
    homebrew
  }
`

const [{ data: rawItems, pending, error }, { data: rawAlchemicals }] = await Promise.all([
  useSanityQuery<GearItem[]>('wiki-gear-items', ITEMS_QUERY),
  useSanityQuery<AlchemicalItem[]>('wiki-gear-items-alchemicals', ALCHEMICALS_QUERY),
])

const selectedCategories = ref<string[]>([])
const priceMin = ref<number | null>(null)
const priceMax = ref<number | null>(null)
const searchQuery = ref('')

function getItemValidCategories(item: GearItem): string[] {
  if (!Array.isArray(item.category)) return []
  return item.category.filter(
    (cat) => Boolean(cat) && !EXCLUDED_CATEGORIES.has(normalizeCategoryKey(cat))
  )
}

function getCategoryLabel(catKey: string): string {
  if (catKey === ALCHEMICALS_CATEGORY_KEY) {
    const entry = RAW_CATEGORY_TRANSLATIONS[ALCHEMICALS_CATEGORY_KEY]!
    return currentLocale.value === 'en' ? entry.en : entry.pt
  }
  const norm = normalizeCategoryKey(catKey)
  const entry = RAW_CATEGORY_TRANSLATIONS[norm]
  if (entry) {
    return currentLocale.value === 'en' ? entry.en : entry.pt
  }
  return humanizeCategoryKey(catKey)
}

function isContainerCategory(catKey: string): boolean {
  const norm = normalizeCategoryKey(catKey)
  return norm === 'containersandpacks' || norm === 'container' || norm === 'containers'
}

function resolveCategoryOrderEntry(catKey: string) {
  if (catKey === ALCHEMICALS_CATEGORY_KEY) {
    return RAW_CATEGORY_TRANSLATIONS[ALCHEMICALS_CATEGORY_KEY]
  }
  return RAW_CATEGORY_TRANSLATIONS[normalizeCategoryKey(catKey)]
}

function compareCategoryKeys(a: string, b: string): number {
  const entryA = resolveCategoryOrderEntry(a)
  const entryB = resolveCategoryOrderEntry(b)

  if (entryA && entryB) return entryA.order - entryB.order
  if (entryA) return -1
  if (entryB) return 1

  return getCategoryLabel(a).localeCompare(
    getCategoryLabel(b),
    currentLocale.value === 'pt' ? 'pt-BR' : 'en',
    { sensitivity: 'base' }
  )
}

const visibleAlchemicals = computed<GearItem[]>(() => {
  return (rawAlchemicals.value ?? [])
    .filter((item) => showHomebrew.value || !item.homebrew)
    .map((item) => ({
      _id: item._id,
      key: item.key,
      name: item.name,
      category: [ALCHEMICALS_CATEGORY_KEY],
      cost: item.cost,
      slots: typeof item.slots === 'number' ? item.slots : 1,
      homebrew: item.homebrew,
      isAlchemical: true,
    }))
})

const availableCategories = computed<string[]>(() => {
  const set = new Set<string>()
  for (const item of rawItems.value ?? []) {
    if (!showHomebrew.value && item.homebrew) continue
    for (const cat of getItemValidCategories(item)) {
      set.add(cat)
    }
  }
  if (visibleAlchemicals.value.length > 0) {
    set.add(ALCHEMICALS_CATEGORY_KEY)
  }
  return [...set].sort(compareCategoryKeys)
})

function toggleCategoryPill(catKey: string) {
  if (selectedCategories.value.includes(catKey)) {
    selectedCategories.value = selectedCategories.value.filter((c) => c !== catKey)
  } else {
    selectedCategories.value = [...selectedCategories.value, catKey]
  }
}

function clearFilters() {
  selectedCategories.value = []
  priceMin.value = null
  priceMax.value = null
  searchQuery.value = ''
}

const activeFilterCount = computed(() => {
  let count = selectedCategories.value.length
  if (priceMin.value !== null && priceMin.value !== undefined) count++
  if (priceMax.value !== null && priceMax.value !== undefined) count++
  if (searchQuery.value.trim()) count++
  return count
})

const hasActiveFilters = computed(() => activeFilterCount.value > 0)

function matchesCommonFilters(item: GearItem): boolean {
  const cost = typeof item.cost === 'number' && !Number.isNaN(item.cost) ? item.cost : 0
  if (priceMin.value !== null && priceMin.value !== undefined && cost < priceMin.value) {
    return false
  }
  if (priceMax.value !== null && priceMax.value !== undefined && cost > priceMax.value) {
    return false
  }

  const term = searchQuery.value.trim().toLowerCase()
  if (term) {
    const ptName = tText(item.name, '', 'pt').toLowerCase()
    const enName = tText(item.name, '', 'en').toLowerCase()
    const capText = tText(item.capacity).toLowerCase()
    if (!ptName.includes(term) && !enName.includes(term) && !capText.includes(term)) {
      return false
    }
  }

  return true
}

const filteredGearItems = computed<GearItem[]>(() => {
  return (rawItems.value ?? []).filter((item) => {
    if (!showHomebrew.value && item.homebrew) return false
    const validCats = getItemValidCategories(item)
    if (validCats.length === 0) return false
    return matchesCommonFilters(item)
  })
})

const filteredAlchemicals = computed<GearItem[]>(() => {
  return visibleAlchemicals.value.filter((item) => matchesCommonFilters(item))
})

const groupedTables = computed(() => {
  const collatorLocale = currentLocale.value === 'pt' ? 'pt-BR' : 'en'
  const categoriesToRender =
    selectedCategories.value.length > 0
      ? [...selectedCategories.value].sort(compareCategoryKeys)
      : availableCategories.value

  return categoriesToRender
    .map((catKey) => {
      const isAlchemicalGroup = catKey === ALCHEMICALS_CATEGORY_KEY
      const rows = (
        isAlchemicalGroup
          ? filteredAlchemicals.value
          : filteredGearItems.value.filter((item) => getItemValidCategories(item).includes(catKey))
      ).sort((a, b) => {
        const nameA = tText(a.name) || a.key || ''
        const nameB = tText(b.name) || b.key || ''
        return nameA.localeCompare(nameB, collatorLocale, { sensitivity: 'base' })
      })

      return {
        key: catKey,
        title: getCategoryLabel(catKey),
        showCapacity: !isAlchemicalGroup && isContainerCategory(catKey),
        isAlchemicalGroup,
        items: rows,
      }
    })
    .filter((group) => group.items.length > 0)
})

const standardColumns = computed<WikiTableColumn<GearItem>[]>(() => [
  {
    key: 'name',
    label: currentLocale.value === 'pt' ? 'Nome' : 'Name',
    sortable: true,
    bold: false,
    nowrap: true,
    sortValue: (row) => tText(row.name),
  },
  {
    key: 'cost',
    label: currentLocale.value === 'pt' ? 'Custo' : 'Cost',
    sortable: true,
    bold: false,
    nowrap: true,
    sortValue: (row) => row.cost ?? 0,
  },
  {
    key: 'slots',
    label: currentLocale.value === 'pt' ? 'Espaços' : 'Slots',
    sortable: true,
    sortValue: (row) => row.slots ?? 0,
  },
])

const containerColumns = computed<WikiTableColumn<GearItem>[]>(() => [
  ...standardColumns.value,
  {
    key: 'capacity',
    label: currentLocale.value === 'pt' ? 'Capacidade' : 'Capacity',
  },
])

const { formatPrice } = useCurrency()

function formatSlots(item: GearItem): string {
  const baseSlots = typeof item.slots === 'number' ? `${item.slots}` : '–'
  if (typeof item.bonusSlots === 'number' && item.bonusSlots > 0) {
    const bonusLabel =
      currentLocale.value === 'pt'
        ? `+${item.bonusSlots} espaços`
        : `+${item.bonusSlots} slots`
    return `${baseSlots} (${bonusLabel})`
  }
  return baseSlots
}

function getAlchemicalLink(item: GearItem) {
  return {
    path: '/gear/alchemicals',
    query: { item: item.key || item._id },
  }
}

const highlightedKey = computed(() =>
  typeof route.query.item === 'string' ? route.query.item : ''
)

function handleRowClick(item: GearItem) {
  if (item.isAlchemical) {
    router.push(getAlchemicalLink(item))
    return
  }

  const identifier = item.key || item._id
  router.replace({
    query: {
      ...route.query,
      item: highlightedKey.value === identifier ? undefined : identifier,
    },
  })
}
</script>

<template>
  <div class="detail-page">
    <header class="page-header">
      <div>
        <h1>
          {{ currentLocale === 'pt' ? 'Itens' : 'Items' }}
        </h1>
      </div>
    </header>

    <WikiFilterBar
      :title="currentLocale === 'pt' ? 'Filtros' : 'Filters'"
      :has-active-filters="hasActiveFilters"
      :collapsible="true"
      :default-collapsed="true"
      :active-count="activeFilterCount"
      :reset-label="currentLocale === 'pt' ? 'Limpar filtros' : 'Clear filters'"
      @reset="clearFilters"
    >
      <div class="filter-block">
        <span class="filter-label">
          {{ currentLocale === 'pt' ? 'Categorias' : 'Categories' }}
        </span>
        <div class="category-pills">
          <button
            v-for="catKey in availableCategories"
            :key="catKey"
            type="button"
            class="select-chip"
            :class="{ 'is-active': selectedCategories.includes(catKey) }"
            @click="toggleCategoryPill(catKey)"
          >
            {{ getCategoryLabel(catKey) }}
          </button>
        </div>
      </div>

      <div class="filters-row">
        <div class="price-range-group">
          <div class="price-field">
            <label class="filter-label" for="price-min">
              {{ currentLocale === 'pt' ? 'Preço mín.' : 'Min price' }}
            </label>
            <input
              id="price-min"
              v-model.number="priceMin"
              type="number"
              min="0"
              class="filter-input"
              placeholder="0"
            />
          </div>

          <span class="range-separator">–</span>

          <div class="price-field">
            <label class="filter-label" for="price-max">
              {{ currentLocale === 'pt' ? 'Preço máx.' : 'Max price' }}
            </label>
            <input
              id="price-max"
              v-model.number="priceMax"
              type="number"
              min="0"
              class="filter-input"
              placeholder="∞"
            />
          </div>
        </div>

        <div class="search-field">
          <label class="filter-label" for="item-search">
            {{ currentLocale === 'pt' ? 'Buscar' : 'Search' }}
          </label>
          <input
            id="item-search"
            v-model="searchQuery"
            type="search"
            class="filter-input"
            :placeholder="currentLocale === 'pt' ? 'Nome do item...' : 'Item name...'"
          />
        </div>
      </div>
    </WikiFilterBar>

    <div v-if="pending" class="state-box">
      {{ currentLocale === 'pt' ? 'Carregando itens...' : 'Loading items...' }}
    </div>

    <div v-else-if="error" class="state-box is-error">
      {{ currentLocale === 'pt' ? 'Erro ao carregar itens.' : 'Failed to load items.' }}
    </div>

    <div v-else-if="groupedTables.length === 0" class="state-box">
      {{ currentLocale === 'pt' ? 'Nenhum item encontrado com os filtros atuais.' : 'No items match the current filters.' }}
    </div>

    <div v-else class="tables-stack">
      <WikiDataTable
        v-for="group in groupedTables"
        :key="group.key"
        :title="group.title"
        :count="group.items.length"
        :columns="group.showCapacity ? containerColumns : standardColumns"
        :rows="group.items"
        :highlighted-id="highlightedKey"
        :clickable-rows="true"
        :locale="currentLocale"
        @row-click="handleRowClick"
      >
        <template #cell-name="{ row }">
          <NuxtLink
            v-if="row.isAlchemical"
            :to="getAlchemicalLink(row)"
            class="alchemical-link"
            @click.stop
          >
            {{ tText(row.name) }}
          </NuxtLink>
          <span v-else>{{ tText(row.name) }}</span>
          <span v-if="row.homebrew" class="hb-tag">HB</span>
        </template>

        <template #cell-cost="{ row }">
          {{ formatPrice(row.cost) }}
        </template>

        <template #cell-slots="{ row }">
          {{ formatSlots(row) }}
        </template>

        <template v-if="group.showCapacity" #cell-capacity="{ row }">
          {{ tText(row.capacity) || '–' }}
        </template>
      </WikiDataTable>
    </div>
  </div>
</template>

<style scoped>
.filter-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.filter-label {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.85rem;
}

.price-range-group {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
}

.price-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 7.5rem;
}

.range-separator {
  padding-bottom: 0.45rem;
  color: var(--text-muted);
  font-weight: 700;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1 1 13rem;
  max-width: 20rem;
}

.filter-input {
  height: 2rem;
  padding: 0 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-size: 0.84rem;
}

.state-box {
  padding: 1.25rem;
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.state-box.is-error {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.alchemical-link {
  color: var(--text-heading);
  text-decoration: none;
  font-weight: 650;
}

.alchemical-link:hover {
  text-decoration: underline;
}

.hb-tag {
  margin-left: 0.4rem;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-sm);
  background-color: var(--accent-subtle);
  color: var(--accent-primary);
}
</style>