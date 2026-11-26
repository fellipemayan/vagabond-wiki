<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import type { IntlStringArray, IntlBlockArray } from '~/utils/i18n'
import type { WikiTableColumn } from '~/components/WikiDataTable.vue'

interface IntlValueItem {
  _key?: string
  language?: string
  value?: string
}

type FlexibleIntlText = IntlStringArray | IntlValueItem[] | IntlValueItem | string | undefined | null

interface TermRef {
  _id?: string
  key?: string
  name?: FlexibleIntlText
  acronym?: FlexibleIntlText
  description?: IntlBlockArray
}

interface WeaponOrArmorItem {
  _id: string
  _type: 'weapon' | 'armor'
  key?: string
  name: IntlStringArray
  type?: TermRef[]
  weaponType?: TermRef[] | FlexibleIntlText
  armorType?: TermRef[] | FlexibleIntlText
  properties?: Array<TermRef | FlexibleIntlText>
  range?: TermRef | FlexibleIntlText
  grip?: TermRef | FlexibleIntlText
  cost?: number
  slots?: number
  damage?: string | FlexibleIntlText
  damageType?: string
  rating?: number | string
  category?: string[]
  homebrew?: boolean
  bookTitle?: IntlStringArray
  bookAcronym?: IntlStringArray
}

type SortField = 'name' | 'cost' | 'damage'
type SortDirection = 'asc' | 'desc'

interface FormattedTypeEntry {
  key: string
  label: string
  tooltip: string
}

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()
const { showHomebrew, locale: prefLocale } = storeToRefs(preferences)
const { locale: wikiLocale, tText, tPlain } = useWikiI18n()

const currentLocale = computed<'pt' | 'en'>(() =>
  prefLocale.value === 'en' || wikiLocale.value === 'en' ? 'en' : 'pt'
)

function isIntlValueItem(val: unknown): val is IntlValueItem {
  return typeof val === 'object' && val !== null && 'value' in val
}

function isTermRef(val: unknown): val is TermRef {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false
  return 'name' in val || 'acronym' in val || 'description' in val || '_id' in val
}

function resolveFlexText(val: FlexibleIntlText): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) {
    return tText(val as IntlStringArray)
  }
  if (isIntlValueItem(val) && typeof val.value === 'string') {
    return val.value
  }
  return ''
}

function resolveTermTooltip(term: TermRef | FlexibleIntlText): string {
  if (!isTermRef(term)) return ''
  const name = resolveFlexText(term.name).trim()
  const desc = tPlain(term.description).trim()
  if (name && desc) return `${name}: ${desc}`
  return name || desc
}

function resolveTermAcronymLabel(term: TermRef | FlexibleIntlText): string {
  if (!isTermRef(term)) {
    return resolveFlexText(term as FlexibleIntlText)
  }

  const acronym = resolveFlexText(term.acronym).trim()
  if (acronym) return acronym
  return resolveFlexText(term.name).trim()
}

function resolveTermNameLabel(term: TermRef | FlexibleIntlText): string {
  if (!isTermRef(term)) {
    return resolveFlexText(term as FlexibleIntlText)
  }

  const name = resolveFlexText(term.name).trim()
  if (name) return name
  return resolveFlexText(term.acronym).trim()
}

function resolveTermFilterKey(term: TermRef | FlexibleIntlText): string {
  if (!isTermRef(term)) {
    return resolveFlexText(term as FlexibleIntlText)
  }

  return resolveFlexText(term.name) || resolveFlexText(term.acronym) || term._id || ''
}

const ARMOR_WEAPONS_QUERY = `
  *[_type in ["weapon", "armor"]] | order(coalesce(sortName, name[language == "pt"][0].value, name[_key == "pt"][0].value, name[0].value) asc) {
    _id,
    _type,
    "key": coalesce(key.current, slug.current),
    name,
    cost,
    slots,
    damage,
    damageType,
    rating,
    category,
    homebrew,
    "bookTitle": source->book.title,
    "bookAcronym": source->book.acronym,
    "type": type[]->{
      _id,
      "key": coalesce(key.current, slug.current),
      name,
      acronym,
      description
    },
    "weaponType": weaponType->{
      _id,
      "key": coalesce(key.current, slug.current),
      name,
      acronym,
      description
    },
    "armorType": armorType->{
      _id,
      "key": coalesce(key.current, slug.current),
      name,
      acronym,
      description
    },
    "range": range->{
      _id,
      "key": coalesce(key.current, slug.current),
      name,
      acronym,
      description
    },
    "grip": grip->{
      _id,
      "key": coalesce(key.current, slug.current),
      name,
      acronym,
      description
    },
    "properties": coalesce(
      properties[]->{
        _id,
        "key": coalesce(key.current, slug.current),
        name,
        acronym,
        description
      },
      properties
    )
  }
`

const { data: items, pending, error } = await useSanityQuery<WeaponOrArmorItem[]>(
  'wiki-armor-weapons',
  ARMOR_WEAPONS_QUERY
)

const viewMode = ref<'all' | 'weapon' | 'armor'>('all')
const searchQuery = ref('')
const filterType = ref('')
const filterGrip = ref('')
const filterDamage = ref('')
const filterProperties = ref<string[]>([])
const costMin = ref<number | null>(null)
const costMax = ref<number | null>(null)

const sortField = ref<SortField>('name')
const sortDirection = ref<SortDirection>('asc')

function toggleSort(field: string) {
  const typedField = field as SortField
  if (sortField.value === typedField) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = typedField
    sortDirection.value = 'asc'
  }
}

function getWeaponTypeEntries(item: WeaponOrArmorItem): FormattedTypeEntry[] {
  const rawList = Array.isArray(item.type)
    ? item.type
    : Array.isArray(item.weaponType)
      ? item.weaponType
      : item.weaponType
        ? [item.weaponType]
        : []

  return rawList
    .map((entry) => {
      const label = resolveTermAcronymLabel(entry)
      const tooltip = resolveTermTooltip(entry)
      const key = resolveTermFilterKey(entry)
      return label ? { key, label, tooltip } : null
    })
    .filter((x): x is FormattedTypeEntry => Boolean(x))
}

function getArmorTypeLabel(item: WeaponOrArmorItem): string {
  if (Array.isArray(item.armorType)) {
    return item.armorType.map((t) => resolveTermAcronymLabel(t)).filter(Boolean).join(', ')
  }
  return resolveTermAcronymLabel(item.armorType) || (item.category?.[0] ?? '')
}

function getItemGripLabel(item: WeaponOrArmorItem): string {
  return resolveTermAcronymLabel(item.grip)
}

function getItemGripTooltip(item: WeaponOrArmorItem): string {
  return resolveTermTooltip(item.grip)
}

function getItemRangeLabel(item: WeaponOrArmorItem): string {
  return resolveTermNameLabel(item.range)
}

function getItemRangeTooltip(item: WeaponOrArmorItem): string {
  return resolveTermTooltip(item.range)
}

function getItemPropertyEntries(item: WeaponOrArmorItem): FormattedTypeEntry[] {
  if (!Array.isArray(item.properties)) return []
  return item.properties
    .map((prop) => {
      const label = resolveTermNameLabel(prop)
      const tooltip = resolveTermTooltip(prop)
      const key = resolveTermFilterKey(prop)
      return label ? { key, label, tooltip } : null
    })
    .filter((x): x is FormattedTypeEntry => Boolean(x))
}

const { formatPrice } = useCurrency()

function getItemDamageLabel(item: WeaponOrArmorItem): string {
  const dmg = resolveFlexText(item.damage)
  const type = item.damageType ? ` (${item.damageType})` : ''
  if (dmg) return `${dmg}${type}`
  if (item.rating !== undefined && item.rating !== null) return String(item.rating)
  return ''
}

function getDamageSortScore(item: WeaponOrArmorItem): number {
  const raw = resolveFlexText(item.damage).trim().toLowerCase()
  if (!raw) return typeof item.rating === 'number' ? item.rating : 0
  const match = raw.match(/^(\d*)d(\d+)$/)
  if (match) {
    const count = match[1] ? Number(match[1]) : 1
    const sides = Number(match[2])
    return count * ((sides + 1) / 2)
  }
  const num = Number(raw)
  return Number.isNaN(num) ? 0 : num
}

const typeOptions = computed(() => {
  const set = new Set<string>()
  for (const item of items.value ?? []) {
    if (!showHomebrew.value && item.homebrew) continue
    if (viewMode.value !== 'all' && item._type !== viewMode.value) continue
    if (item._type === 'weapon') {
      for (const t of getWeaponTypeEntries(item)) {
        if (t.key) set.add(t.key)
      }
    } else {
      const aType = getArmorTypeLabel(item)
      if (aType) set.add(aType)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, currentLocale.value === 'pt' ? 'pt-BR' : 'en'))
})

const gripOptions = computed(() => {
  const set = new Set<string>()
  for (const item of items.value ?? []) {
    if (!showHomebrew.value && item.homebrew) continue
    const g = getItemGripLabel(item)
    if (g) set.add(g)
  }
  return [...set].sort((a, b) => a.localeCompare(b, currentLocale.value === 'pt' ? 'pt-BR' : 'en'))
})

const damageOptions = computed(() => {
  const set = new Set<string>()
  for (const item of items.value ?? []) {
    if (!showHomebrew.value && item.homebrew) continue
    const d = getItemDamageLabel(item)
    if (d) set.add(d)
  }
  return [...set].sort((a, b) => a.localeCompare(b, currentLocale.value === 'pt' ? 'pt-BR' : 'en'))
})

const propertyOptions = computed(() => {
  const set = new Set<string>()
  for (const item of items.value ?? []) {
    if (!showHomebrew.value && item.homebrew) continue
    for (const p of getItemPropertyEntries(item)) {
      if (p.key) set.add(p.key)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, currentLocale.value === 'pt' ? 'pt-BR' : 'en'))
})

function toggleProperty(propKey: string) {
  if (filterProperties.value.includes(propKey)) {
    filterProperties.value = filterProperties.value.filter((p) => p !== propKey)
  } else {
    filterProperties.value = [...filterProperties.value, propKey]
  }
}

function resetFilters() {
  searchQuery.value = ''
  filterType.value = ''
  filterGrip.value = ''
  filterDamage.value = ''
  filterProperties.value = []
  costMin.value = null
  costMax.value = null
}

const activeFilterCount = computed(() => {
  let count = 0
  if (searchQuery.value.trim()) count++
  if (filterType.value) count++
  if (filterGrip.value) count++
  if (filterDamage.value) count++
  count += filterProperties.value.length
  if (costMin.value !== null && costMin.value !== undefined) count++
  if (costMax.value !== null && costMax.value !== undefined) count++
  return count
})

const hasActiveFilters = computed(() => activeFilterCount.value > 0)

const filteredAndSortedItems = computed(() => {
  const list = items.value ?? []
  const term = searchQuery.value.trim().toLowerCase()

  const filtered = list.filter((item) => {
    if (!showHomebrew.value && item.homebrew) return false

    if (term) {
      const ptName = tText(item.name, '', 'pt').toLowerCase()
      const enName = tText(item.name, '', 'en').toLowerCase()
      const slug = (item.key ?? '').toLowerCase()
      if (!ptName.includes(term) && !enName.includes(term) && !slug.includes(term)) {
        return false
      }
    }

    if (filterType.value) {
      if (item._type === 'weapon') {
        const keys = getWeaponTypeEntries(item).map((t) => t.key)
        if (!keys.includes(filterType.value)) return false
      } else {
        if (getArmorTypeLabel(item) !== filterType.value) return false
      }
    }

    if (filterGrip.value) {
      if (getItemGripLabel(item) !== filterGrip.value) return false
    }

    if (filterDamage.value) {
      if (getItemDamageLabel(item) !== filterDamage.value) return false
    }

    if (filterProperties.value.length > 0) {
      const itemPropKeys = getItemPropertyEntries(item).map((p) => p.key)
      const matchesAllSelected = filterProperties.value.every((p) => itemPropKeys.includes(p))
      if (!matchesAllSelected) return false
    }

    const cost = typeof item.cost === 'number' ? item.cost : 0
    if (costMin.value !== null && costMin.value !== undefined && cost < costMin.value) {
      return false
    }
    if (costMax.value !== null && costMax.value !== undefined && cost > costMax.value) {
      return false
    }

    return true
  })

  const dir = sortDirection.value === 'asc' ? 1 : -1

  return [...filtered].sort((a, b) => {
    if (sortField.value === 'cost') {
      const ca = typeof a.cost === 'number' ? a.cost : 0
      const cb = typeof b.cost === 'number' ? b.cost : 0
      return (ca - cb) * dir
    }

    if (sortField.value === 'damage') {
      const da = getDamageSortScore(a)
      const db = getDamageSortScore(b)
      if (da !== db) return (da - db) * dir
      return getItemDamageLabel(a).localeCompare(getItemDamageLabel(b)) * dir
    }

    const nameA = tText(a.name)
    const nameB = tText(b.name)
    return nameA.localeCompare(nameB, currentLocale.value === 'pt' ? 'pt-BR' : 'en') * dir
  })
})

const weaponsList = computed(() =>
  filteredAndSortedItems.value.filter((i) => i._type === 'weapon')
)
const armorsList = computed(() =>
  filteredAndSortedItems.value.filter((i) => i._type === 'armor')
)

const weaponColumns = computed<WikiTableColumn<WeaponOrArmorItem>[]>(() => [
  {
    key: 'name',
    label: currentLocale.value === 'pt' ? 'Nome' : 'Name',
    sortable: true,
    bold: true,
    nowrap: true,
  },
  {
    key: 'types',
    label: currentLocale.value === 'pt' ? 'Tipos' : 'Types',
  },
  {
    key: 'properties',
    label: currentLocale.value === 'pt' ? 'Propriedades' : 'Properties',
  },
  {
    key: 'range',
    label: currentLocale.value === 'pt' ? 'Alcance' : 'Range',
  },
  {
    key: 'grip',
    label: currentLocale.value === 'pt' ? 'Pega' : 'Grip',
  },
  {
    key: 'cost',
    label: currentLocale.value === 'pt' ? 'Preço' : 'Cost',
    sortable: true,
    bold: true,
    nowrap: true,
  },
  {
    key: 'slots',
    label: currentLocale.value === 'pt' ? 'Espaços' : 'Slots',
  },
  {
    key: 'damage',
    label: currentLocale.value === 'pt' ? 'Dano' : 'Damage',
    sortable: true,
    bold: true,
    nowrap: true,
  },
])

const armorColumns = computed<WikiTableColumn<WeaponOrArmorItem>[]>(() => [
  {
    key: 'name',
    label: currentLocale.value === 'pt' ? 'Nome' : 'Name',
    sortable: true,
    bold: true,
    nowrap: true,
  },
  {
    key: 'types',
    label: currentLocale.value === 'pt' ? 'Tipos' : 'Types',
  },
  {
    key: 'properties',
    label: currentLocale.value === 'pt' ? 'Propriedades' : 'Properties',
  },
  {
    key: 'cost',
    label: currentLocale.value === 'pt' ? 'Preço' : 'Cost',
    sortable: true,
    bold: true,
    nowrap: true,
  },
  {
    key: 'slots',
    label: currentLocale.value === 'pt' ? 'Espaços' : 'Slots',
  },
  {
    key: 'damage',
    label: currentLocale.value === 'pt' ? 'Defesa / Valor' : 'Rating',
    sortable: true,
    bold: true,
    nowrap: true,
  },
])

const highlightedKey = computed(() =>
  typeof route.query.item === 'string' ? route.query.item : ''
)

function handleRowClick(item: WeaponOrArmorItem) {
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
          {{ currentLocale === 'pt' ? 'Armas e Armaduras' : 'Armor & Weapons' }}
        </h1>
        <!-- <p class="page-subtitle">
          {{
            currentLocale === 'pt'
              ? 'Tabelas de consulta rápida para armas e armaduras com filtros e ordenação por nome, preço e dano.'
              : 'Quick reference tables for weapons and armor with filters and sorting by name, cost, and damage.'
          }}
        </p> -->
      </div>

      <!-- <div class="mode-switcher">
        <button
          type="button"
          class="mode-btn"
          :class="{ 'is-active': viewMode === 'all' }"
          @click="viewMode = 'all'"
        >
          {{ currentLocale === 'pt' ? 'Tudo' : 'All' }}
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ 'is-active': viewMode === 'weapon' }"
          @click="viewMode = 'weapon'"
        >
          {{ currentLocale === 'pt' ? 'Armas' : 'Weapons' }} ({{ weaponsList.length }})
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ 'is-active': viewMode === 'armor' }"
          @click="viewMode = 'armor'"
        >
          {{ currentLocale === 'pt' ? 'Armaduras' : 'Armor' }} ({{ armorsList.length }})
        </button>
      </div> -->
    </header>

    <WikiFilterBar
      :title="currentLocale === 'pt' ? 'Filtros' : 'Filters'"
      :collapsible="true"
      :default-collapsed="true"
      :has-active-filters="hasActiveFilters"
      :active-count="activeFilterCount"
      :reset-label="currentLocale === 'pt' ? 'Limpar filtros' : 'Clear filters'"
      @reset="resetFilters"
    >
      <div class="filters-grid">
        <div class="filter-field">
          <label class="field-label">
            {{ currentLocale === 'pt' ? 'Buscar' : 'Search' }}
          </label>
          <input
            v-model="searchQuery"
            type="search"
            class="field-input"
            :placeholder="currentLocale === 'pt' ? 'Nome do item...' : 'Item name...'"
          />
        </div>

        <div class="filter-field">
          <label class="field-label">
            {{ currentLocale === 'pt' ? 'Tipo' : 'Type' }}
          </label>
          <select v-model="filterType" class="field-select">
            <option value="">{{ currentLocale === 'pt' ? 'Todos' : 'All' }}</option>
            <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div class="filter-field">
          <label class="field-label">
            {{ currentLocale === 'pt' ? 'Pega' : 'Grip' }}
          </label>
          <select v-model="filterGrip" class="field-select">
            <option value="">{{ currentLocale === 'pt' ? 'Todas' : 'All' }}</option>
            <option v-for="g in gripOptions" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>

        <div class="filter-field">
          <label class="field-label">
            {{ currentLocale === 'pt' ? 'Dano' : 'Damage' }}
          </label>
          <select v-model="filterDamage" class="field-select">
            <option value="">{{ currentLocale === 'pt' ? 'Todos' : 'All' }}</option>
            <option v-for="d in damageOptions" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div class="filter-field filter-field-cost">
          <label class="field-label">
            {{ currentLocale === 'pt' ? 'Preço mín.' : 'Min cost' }}
          </label>
          <input
            v-model.number="costMin"
            type="number"
            min="0"
            class="field-input"
            placeholder="0"
          />
        </div>

        <div class="filter-field filter-field-cost">
          <label class="field-label">
            {{ currentLocale === 'pt' ? 'Preço máx.' : 'Max cost' }}
          </label>
          <input
            v-model.number="costMax"
            type="number"
            min="0"
            class="field-input"
            placeholder="∞"
          />
        </div>
      </div>

      <div v-if="propertyOptions.length > 0" class="props-filter-row">
        <span class="field-label">
          {{ currentLocale === 'pt' ? 'Propriedades:' : 'Properties:' }}
        </span>
        <div class="props-chips">
          <button
            v-for="prop in propertyOptions"
            :key="prop"
            type="button"
            class="select-chip"
            :class="{ 'is-active': filterProperties.includes(prop) }"
            @click="toggleProperty(prop)"
          >
            {{ prop }}
          </button>
        </div>
      </div>
    </WikiFilterBar>

    <div v-if="pending" class="state-box">
      {{ currentLocale === 'pt' ? 'Carregando armas e armaduras...' : 'Loading weapons and armor...' }}
    </div>

    <div v-else-if="error" class="state-box is-error">
      {{ currentLocale === 'pt' ? 'Erro ao carregar dados.' : 'Failed to load data.' }}
    </div>

    <div v-else class="tables-stack">
      <!-- Tabela de Armas -->
      <WikiDataTable
        v-if="viewMode === 'all' || viewMode === 'weapon'"
        :title="currentLocale === 'pt' ? 'Armas' : 'Weapons'"
        :count="weaponsList.length"
        :columns="weaponColumns"
        :rows="weaponsList"
        :highlighted-id="highlightedKey"
        :clickable-rows="true"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        :locale="currentLocale"
        :empty-text="currentLocale === 'pt' ? 'Nenhuma arma encontrada.' : 'No weapons found.'"
        @sort="toggleSort"
        @row-click="handleRowClick"
      >
        <template #cell-name="{ row }">
          <span>{{ tText(row.name) }}</span>
          <span v-if="row.homebrew" class="hb-tag">HB</span>
        </template>

        <template #cell-types="{ row }">
          <template v-if="getWeaponTypeEntries(row).length > 0">
            <span
              v-for="(tEntry, idx) in getWeaponTypeEntries(row)"
              :key="tEntry.key + idx"
              class="tooltip-term"
              :title="tEntry.tooltip || undefined"
            >
              {{ tEntry.label }}<span v-if="idx < getWeaponTypeEntries(row).length - 1">, </span>
            </span>
          </template>
          <span v-else>–</span>
        </template>

        <template #cell-properties="{ row }">
          <template v-if="getItemPropertyEntries(row).length > 0">
            <span
              v-for="(pEntry, idx) in getItemPropertyEntries(row)"
              :key="pEntry.key + idx"
              class="tooltip-term"
              :title="pEntry.tooltip || undefined"
            >
              {{ pEntry.label }}<span v-if="idx < getItemPropertyEntries(row).length - 1">, </span>
            </span>
          </template>
          <span v-else>–</span>
        </template>

        <template #cell-range="{ row }">
          <span
            v-if="getItemRangeLabel(row)"
            class="tooltip-term"
            :title="getItemRangeTooltip(row) || undefined"
          >
            {{ getItemRangeLabel(row) }}
          </span>
          <span v-else>–</span>
        </template>

        <template #cell-grip="{ row }">
          <span
            v-if="getItemGripLabel(row)"
            class="tooltip-term"
            :title="getItemGripTooltip(row) || undefined"
          >
            {{ getItemGripLabel(row) }}
          </span>
          <span v-else>–</span>
        </template>

        <template #cell-cost="{ row }">
          {{ formatPrice(row.cost) }}
        </template>

        <template #cell-slots="{ row }">
          {{ row.slots ?? '–' }}
        </template>

        <template #cell-damage="{ row }">
          {{ getItemDamageLabel(row) || '–' }}
        </template>
      </WikiDataTable>

      <!-- Tabela de Armaduras -->
      <WikiDataTable
        v-if="viewMode === 'all' || viewMode === 'armor'"
        :title="currentLocale === 'pt' ? 'Armaduras' : 'Armor'"
        :count="armorsList.length"
        :columns="armorColumns"
        :rows="armorsList"
        :highlighted-id="highlightedKey"
        :clickable-rows="true"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        :locale="currentLocale"
        :empty-text="currentLocale === 'pt' ? 'Nenhuma armadura encontrada.' : 'No armor found.'"
        @sort="toggleSort"
        @row-click="handleRowClick"
      >
        <template #cell-name="{ row }">
          <span>{{ tText(row.name) }}</span>
          <span v-if="row.homebrew" class="hb-tag">HB</span>
        </template>

        <template #cell-types="{ row }">
          {{ getArmorTypeLabel(row) || '–' }}
        </template>

        <template #cell-properties="{ row }">
          <template v-if="getItemPropertyEntries(row).length > 0">
            <span
              v-for="(pEntry, idx) in getItemPropertyEntries(row)"
              :key="pEntry.key + idx"
              class="tooltip-term"
              :title="pEntry.tooltip || undefined"
            >
              {{ pEntry.label }}<span v-if="idx < getItemPropertyEntries(row).length - 1">, </span>
            </span>
          </template>
          <span v-else>–</span>
        </template>

        <template #cell-cost="{ row }">
          {{ formatPrice(row.cost) }}
        </template>

        <template #cell-slots="{ row }">
          {{ row.slots ?? '–' }}
        </template>

        <template #cell-damage="{ row }">
          {{ getItemDamageLabel(row) || '–' }}
        </template>
      </WikiDataTable>
    </div>
  </div>
</template>

<style scoped>
.mode-switcher {
  display: inline-flex;
  gap: 0.35rem;
}

.mode-btn {
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.mode-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.mode-btn.is-active {
  background-color: var(--accent-subtle);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.filter-field-cost {
  max-width: 8.5rem;
}

.field-label {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.field-input,
.field-select {
  height: 2rem;
  padding: 0 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-size: 0.84rem;
}

.props-filter-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.props-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
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

.tooltip-term {
  cursor: help;
  border-bottom: 1px dotted var(--border-strong);
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