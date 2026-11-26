<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import type { IntlStringArray, IntlBlockArray } from '~/utils/i18n'

const isListCollapsedMobile = ref(true)

interface ConditionRef {
  _id: string
  key?: string
  name?: IntlStringArray
}

interface AlchemicalDetails {
  die?: string
  bonusType?: string
  bonusValue?: number
  condition?: ConditionRef
  conditionDuration?: string
}

interface AlchemicalItem {
  _id: string
  key?: string
  name: IntlStringArray
  type?: string
  description?: IntlBlockArray
  cost?: number
  slots?: number
  details?: AlchemicalDetails
  homebrew?: boolean
  bookTitle?: IntlStringArray
  bookAcronym?: IntlStringArray
}

function normalizeTypeKey(val: string): string {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()
}

function humanizeTypeKey(val: string): string {
  return val
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (ch) => ch.toUpperCase())
}

const ALCHEMICAL_TYPE_LABELS: Record<string, { pt: string; en: string; order: number }> = {
  acid: { pt: 'Ácido', en: 'Acid', order: 0 },
  acids: { pt: 'Ácidos', en: 'Acids', order: 0 },
  acido: { pt: 'Ácido', en: 'Acid', order: 0 },
  acidos: { pt: 'Ácidos', en: 'Acids', order: 0 },

  concoction: { pt: 'Solução', en: 'Concoction', order: 1 },
  concoctions: { pt: 'Soluções', en: 'Concoctions', order: 1 },
  solucao: { pt: 'Solução', en: 'Concoction', order: 1 },
  solucoes: { pt: 'Soluções', en: 'Concoctions', order: 1 },

  explosive: { pt: 'Explosivo', en: 'Explosive', order: 2 },
  explosives: { pt: 'Explosivos', en: 'Explosives', order: 2 },
  explosivo: { pt: 'Explosivo', en: 'Explosive', order: 2 },
  explosivos: { pt: 'Explosivos', en: 'Explosives', order: 2 },

  oil: { pt: 'Óleo', en: 'Oil', order: 3 },
  oils: { pt: 'Óleos', en: 'Oils', order: 3 },
  oleo: { pt: 'Óleo', en: 'Oil', order: 3 },
  oleos: { pt: 'Óleos', en: 'Oils', order: 3 },

  poison: { pt: 'Veneno', en: 'Poison', order: 4 },
  poisons: { pt: 'Venenos', en: 'Poisons', order: 4 },
  veneno: { pt: 'Veneno', en: 'Poison', order: 4 },
  venenos: { pt: 'Venenos', en: 'Poisons', order: 4 },

  potion: { pt: 'Poção', en: 'Potion', order: 5 },
  potions: { pt: 'Poções', en: 'Potions', order: 5 },
  pocao: { pt: 'Poção', en: 'Potion', order: 5 },
  pocoes: { pt: 'Poções', en: 'Potions', order: 5 },

  torch: { pt: 'Tocha', en: 'Torch', order: 6 },
  torchs: { pt: 'Tochas', en: 'Torchs', order: 6 },
  torches: { pt: 'Tochas', en: 'Torches', order: 6 },
  tocha: { pt: 'Tocha', en: 'Torch', order: 6 },
  tochas: { pt: 'Tochas', en: 'Torchs', order: 6 },
}

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()
const { showHomebrew, locale: prefLocale } = storeToRefs(preferences)
const { locale: wikiLocale, tText, tBlocks, tPlain } = useWikiI18n()

const currentLocale = computed<'pt' | 'en'>(() =>
  prefLocale.value === 'en' || wikiLocale.value === 'en' ? 'en' : 'pt'
)

const ALCHEMICALS_QUERY = `
  *[_type == "alchemical"] | order(coalesce(sortName, name[language == "pt"][0].value, name[_key == "pt"][0].value, name[0].value) asc) {
    _id,
    "key": coalesce(key.current, slug.current),
    name,
    type,
    description,
    cost,
    slots,
    homebrew,
    "bookTitle": source->book.title,
    "bookAcronym": source->book.acronym,
    details{
      die,
      bonusType,
      bonusValue,
      conditionDuration,
      condition->{
        _id,
        "key": coalesce(key.current, slug.current),
        name
      }
    }
  }
`

const { data: alchemicals, pending, error } = await useSanityQuery<AlchemicalItem[]>(
  'wiki-alchemicals',
  ALCHEMICALS_QUERY
)

const filterQuery = ref('')
const selectedTypes = ref<string[]>([])
const priceMin = ref<number | null>(null)
const priceMax = ref<number | null>(null)

function getTypeLabel(typeKey?: string): string {
  if (!typeKey) return ''
  const entry = ALCHEMICAL_TYPE_LABELS[normalizeTypeKey(typeKey)]
  if (entry) {
    return currentLocale.value === 'en' ? entry.en : entry.pt
  }
  return humanizeTypeKey(typeKey)
}

function compareTypeKeys(a: string, b: string): number {
  const entryA = ALCHEMICAL_TYPE_LABELS[normalizeTypeKey(a)]
  const entryB = ALCHEMICAL_TYPE_LABELS[normalizeTypeKey(b)]

  if (entryA && entryB) return entryA.order - entryB.order
  if (entryA) return -1
  if (entryB) return 1

  return getTypeLabel(a).localeCompare(
    getTypeLabel(b),
    currentLocale.value === 'pt' ? 'pt-BR' : 'en'
  )
}

const availableTypes = computed<string[]>(() => {
  const set = new Set<string>()
  for (const item of alchemicals.value ?? []) {
    if (!showHomebrew.value && item.homebrew) continue
    if (item.type) set.add(item.type)
  }
  return [...set].sort(compareTypeKeys)
})

function toggleTypePill(typeKey: string) {
  if (selectedTypes.value.includes(typeKey)) {
    selectedTypes.value = selectedTypes.value.filter((t) => t !== typeKey)
  } else {
    selectedTypes.value = [...selectedTypes.value, typeKey]
  }
}

function clearFilters() {
  filterQuery.value = ''
  selectedTypes.value = []
  priceMin.value = null
  priceMax.value = null
}

const activeFilterCount = computed(() => {
  let count = selectedTypes.value.length
  if (priceMin.value !== null && priceMin.value !== undefined) count++
  if (priceMax.value !== null && priceMax.value !== undefined) count++
  return count
})

const hasActiveFilters = computed(() =>
  Boolean(filterQuery.value.trim() || activeFilterCount.value > 0)
)

function formatPrice(rawCost: number | undefined | null): string {
  const total =
    typeof rawCost === 'number' && !Number.isNaN(rawCost)
      ? Math.max(0, Math.floor(rawCost))
      : 0

  const gold = Math.floor(total / 10000)
  const silver = Math.floor((total % 10000) / 100)
  const copper = total % 100

  const goldUnit = currentLocale.value === 'pt' ? 'Au' : 'g'
  const silverUnit = currentLocale.value === 'pt' ? 'p' : 's'
  const copperUnit = 'c'

  const parts: string[] = []
  if (gold > 0) parts.push(`${gold}${goldUnit}`)
  if (silver > 0) parts.push(`${silver}${silverUnit}`)
  if (copper > 0 || parts.length === 0) parts.push(`${copper}${copperUnit}`)

  return parts.join(' ')
}

const filteredAlchemicals = computed<AlchemicalItem[]>(() => {
  const list = alchemicals.value ?? []
  const term = filterQuery.value.trim().toLowerCase()

  return list.filter((item) => {
    if (!showHomebrew.value && item.homebrew) return false

    if (selectedTypes.value.length > 0) {
      if (!item.type || !selectedTypes.value.includes(item.type)) return false
    }

    const cost = typeof item.cost === 'number' && !Number.isNaN(item.cost) ? item.cost : 0
    if (priceMin.value !== null && priceMin.value !== undefined && cost < priceMin.value) {
      return false
    }
    if (priceMax.value !== null && priceMax.value !== undefined && cost > priceMax.value) {
      return false
    }

    if (!term) return true

    const ptName = tText(item.name, '', 'pt').toLowerCase()
    const enName = tText(item.name, '', 'en').toLowerCase()
    const typeLabel = getTypeLabel(item.type).toLowerCase()
    const descText = `${tPlain(item.description, '', 'pt')} ${tPlain(item.description, '', 'en')}`.toLowerCase()

    return (
      ptName.includes(term) ||
      enName.includes(term) ||
      typeLabel.includes(term) ||
      descText.includes(term)
    )
  })
})

const selectedItem = computed<AlchemicalItem | null>(() => {
  const list = filteredAlchemicals.value
  if (list.length === 0) return null

  const queryItem = typeof route.query.item === 'string' ? route.query.item : ''
  if (queryItem) {
    const found = list.find((item) => item.key === queryItem || item._id === queryItem)
    if (found) return found
  }

  return list[0] ?? null
})

function selectItem(item: AlchemicalItem) {
  const identifier = item.key || item._id
  router.replace({
    query: {
      ...route.query,
      item: identifier,
    },
  })
}

const hasMechanicDetails = computed(() => {
  const det = selectedItem.value?.details
  if (!det) return false
  return Boolean(
    det.die ||
      det.bonusType ||
      typeof det.bonusValue === 'number' ||
      det.condition ||
      det.conditionDuration
  )
})
</script>

<template>
  <div class="detail-page">
    <header class="page-header">
      <div>
        <h1>
          {{ currentLocale === 'pt' ? 'Alquímicos' : 'Alchemicals' }}
        </h1>
        <!-- <p class="page-subtitle">
          {{
            currentLocale === 'pt'
              ? 'Consulte itens alquímicos por categoria, custo, efeitos mecânicos e descrição.'
              : 'Browse alchemical items by category, cost, mechanical effects, and description.'
          }}
        </p> -->
      </div>
    </header>

    <WikiFilterBar
      :title="currentLocale === 'pt' ? 'Filtros' : 'Filters'"
      :collapsible="true"
      :default-collapsed="true"
      :has-active-filters="hasActiveFilters"
      :active-count="activeFilterCount"
      :reset-label="currentLocale === 'pt' ? 'Limpar filtros' : 'Clear filters'"
      @reset="clearFilters"
    >
      <div v-if="availableTypes.length > 0" class="filter-block">
        <span class="filter-label">
          {{ currentLocale === 'pt' ? 'Categorias' : 'Categories' }}
        </span>
        <div class="chips-wrap">
          <button
            v-for="tKey in availableTypes"
            :key="tKey"
            type="button"
            class="select-chip"
            :class="{ 'is-active': selectedTypes.includes(tKey) }"
            @click="toggleTypePill(tKey)"
          >
            {{ getTypeLabel(tKey) }}
          </button>
        </div>
      </div>

      <div class="filters-row">
        <div class="price-field">
          <label class="filter-label" for="alch-price-min">
            {{ currentLocale === 'pt' ? 'Preço mín.' : 'Min price' }}
          </label>
          <input
            id="alch-price-min"
            v-model.number="priceMin"
            type="number"
            min="0"
            class="filter-number"
            placeholder="0"
          />
        </div>

        <span class="range-separator">–</span>

        <div class="price-field">
          <label class="filter-label" for="alch-price-max">
            {{ currentLocale === 'pt' ? 'Preço máx.' : 'Max price' }}
          </label>
          <input
            id="alch-price-max"
            v-model.number="priceMax"
            type="number"
            min="0"
            class="filter-number"
            placeholder="∞"
          />
        </div>
      </div>
    </WikiFilterBar>

    <div v-if="pending" class="state-box">
      {{ currentLocale === 'pt' ? 'Carregando alquímicos...' : 'Loading alchemicals...' }}
    </div>

    <div v-else-if="error" class="state-box is-error">
      {{ currentLocale === 'pt' ? 'Erro ao carregar alquímicos.' : 'Failed to load alchemicals.' }}
    </div>

    <div v-else class="split-layout">
      <!-- Lista lateral: Nome, Categoria e Preço -->
      <section class="list-pane">
        <div class="list-controls">
          <input
            v-model="filterQuery"
            type="search"
            class="filter-input"
            :placeholder="currentLocale === 'pt' ? 'Buscar alquímico...' : 'Search alchemical...'"
          />
          <span class="list-count">{{ filteredAlchemicals.length }}</span>
          <button
            type="button"
            class="mobile-list-toggle"
            :aria-expanded="!isListCollapsedMobile"
            @click="isListCollapsedMobile = !isListCollapsedMobile"
          >
            {{
              isListCollapsedMobile
                ? currentLocale === 'pt'
                  ? 'Lista'
                  : 'List'
                : currentLocale === 'pt'
                  ? 'Ocultar'
                  : 'Hide'
            }}
          </button>
        </div>

        <ul 
          v-if="filteredAlchemicals.length > 0" 
          class="entity-list"
          :class="{ 'is-collapsed-mobile': isListCollapsedMobile }"
        >
          <li v-for="item in filteredAlchemicals" :key="item._id">
            <button
              type="button"
              class="entity-row"
              :class="{ 'is-selected': selectedItem?._id === item._id }"
              @click="selectItem(item)"
            >
              <div class="row-main">
                <span class="row-title">{{ tText(item.name) }}</span>
                <span v-if="item.homebrew" class="badge-homebrew">HB</span>
              </div>
              <div class="row-meta">
                <span>{{ getTypeLabel(item.type) || '–' }}</span>
                <span class="row-meta-sep">•</span>
                <span class="row-price">{{ formatPrice(item.cost) }}</span>
              </div>
            </button>
          </li>
        </ul>

        <div v-else class="empty-list">
          {{ currentLocale === 'pt' ? 'Nenhum alquímico encontrado.' : 'No alchemicals found.' }}
        </div>
      </section>

      <!-- Detalhamento à direita -->
      <article v-if="selectedItem" class="detail-pane">
        <header class="detail-header">
          <div class="mechanic-header">
            <h2 class="mechanic-name">{{ tText(selectedItem.name) }}</h2>
            <span v-if="getTypeLabel(selectedItem.type)" class="mechanic-subtitle">
              {{ getTypeLabel(selectedItem.type) }} | <strong>{{ currentLocale === 'pt' ? 'Custo:' : 'Cost:' }}</strong>
              {{ formatPrice(selectedItem.cost) }}
            </span>
          </div>
        </header>

        <section v-if="hasMechanicDetails && selectedItem.details" class="mechanics-box">
          <div v-if="selectedItem.details.die" class="mechanic-item">
            <span class="mechanic-label">
              {{ currentLocale === 'pt' ? 'Dado / Rolagem:' : 'Die / Roll:' }}
            </span>
            <span class="mechanic-value">{{ selectedItem.details.die }}</span>
          </div>

          <div
            v-if="selectedItem.details.bonusType || typeof selectedItem.details.bonusValue === 'number'"
            class="mechanic-item"
          >
            <span class="mechanic-label">
              {{ currentLocale === 'pt' ? 'Bônus:' : 'Bonus:' }}
            </span>
            <span class="mechanic-value">
              {{
                typeof selectedItem.details.bonusValue === 'number' && selectedItem.details.bonusValue > 0
                  ? `+${selectedItem.details.bonusValue}`
                  : selectedItem.details.bonusValue ?? ''
              }}
              {{ selectedItem.details.bonusType ? `(${selectedItem.details.bonusType})` : '' }}
            </span>
          </div>

          <div v-if="selectedItem.details.condition" class="mechanic-item">
            <span class="mechanic-label">
              {{ currentLocale === 'pt' ? 'Condição:' : 'Condition:' }}
            </span>
            <span class="mechanic-value">
              {{ tText(selectedItem.details.condition.name) }}
              <template v-if="selectedItem.details.conditionDuration">
                ({{ selectedItem.details.conditionDuration }})
              </template>
            </span>
          </div>
        </section>

        <section class="detail-section">
          <PortableTextRenderer :blocks="tBlocks(selectedItem.description)" />
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
.filter-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filter-label {
  font-size: 0.74rem;
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

.filters-row {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
  flex-wrap: wrap;
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

.filter-number {
  height: 2rem;
  padding: 0 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-size: 0.84rem;
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

.row-price {
  font-weight: 600;
  color: var(--text-primary);
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

.mechanics-box {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  padding: 0.75rem 0.95rem;
  border-radius: var(--radius-sm);
  background-color: var(--bg-subtle);
  border-left: 3px solid var(--accent-primary);
}

.mechanic-item {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
}

.mechanic-label {
  font-weight: 700;
  color: var(--accent-primary);
}

.mechanic-value {
  color: var(--text-primary);
  font-weight: 500;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
</style>