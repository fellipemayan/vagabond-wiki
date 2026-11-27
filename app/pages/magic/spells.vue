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

interface UpcastSpec {
  cost?: number
  manaCost?: number
  description?: string | IntlStringArray
  effect?: string | IntlStringArray
}

interface SpellOption {
  _key?: string
  title?: string | IntlStringArray
  description?: string | IntlStringArray
  upcast?: UpcastSpec
}

interface SpellScalingRow {
  _key?: string
  levelOrBonus?: string
  description?: string | IntlStringArray
  manaCost?: number
}

interface SpellItem {
  _id: string
  key?: string
  name: IntlStringArray
  damageType?: string
  description?: IntlBlockArray
  crit?: IntlStringArray
  condition?: ConditionRef
  globalUpcast?: UpcastSpec
  options?: SpellOption[]
  scalingTable?: SpellScalingRow[]
  specialModifications?: Array<string | IntlStringArray>
  homebrew?: boolean
  bookTitle?: IntlStringArray
  bookAcronym?: IntlStringArray
}

const NO_DAMAGE_FILTER_KEY = '__none__'

function normalizeDamageKey(val: string): string {
  return val
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()
}

function humanizeDamageKey(val: string): string {
  return val
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (ch) => ch.toUpperCase())
}

const DAMAGE_TYPE_LABELS: Record<string, { pt: string; en: string; order: number }> = {
  acid: { pt: 'Ácido', en: 'Acid', order: 0 },
  acido: { pt: 'Ácido', en: 'Acid', order: 0 },

  blunt: { pt: 'Contundente', en: 'Blunt', order: 1 },
  contundente: { pt: 'Contundente', en: 'Blunt', order: 1 },

  cold: { pt: 'Frio', en: 'Cold', order: 2 },
  frio: { pt: 'Frio', en: 'Cold', order: 2 },

  fire: { pt: 'Fogo', en: 'Fire', order: 3 },
  fogo: { pt: 'Fogo', en: 'Fire', order: 3 },

  shock: { pt: 'Choque', en: 'Shock', order: 4 },
  choque: { pt: 'Choque', en: 'Shock', order: 4 },

  poison: { pt: 'Veneno', en: 'Poison', order: 5 },
  veneno: { pt: 'Veneno', en: 'Poison', order: 5 },
}

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()
const { showHomebrew, locale: prefLocale } = storeToRefs(preferences)
const { locale: wikiLocale, tText, tBlocks, tPlain } = useWikiI18n()

const currentLocale = computed<'pt' | 'en'>(() =>
  prefLocale.value === 'en' || wikiLocale.value === 'en' ? 'en' : 'pt'
)

function resolveLocalizedField(val?: string | IntlStringArray): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  return tText(val)
}

const SPELLS_QUERY = `
  *[_type == "spell"] | order(coalesce(sortName, name[language == "pt"][0].value, name[_key == "pt"][0].value, name[0].value) asc) {
    _id,
    "key": coalesce(key.current, slug.current),
    name,
    damageType,
    description,
    crit,
    condition->{
      _id,
      "key": coalesce(key.current, slug.current),
      name
    },
    globalUpcast,
    options[]{
      _key,
      title,
      description,
      upcast
    },
    scalingTable[]{
      _key,
      levelOrBonus,
      description,
      manaCost
    },
    specialModifications,
    homebrew,
    "bookTitle": source->book.title,
    "bookAcronym": source->book.acronym
  }
`

const { data: spells, pending, error } = await useSanityQuery<SpellItem[]>(
  'wiki-spells',
  SPELLS_QUERY
)

const filterQuery = ref('')
const selectedDamageTypes = ref<string[]>([])

function getDamageTypeLabel(damageType?: string): string {
  if (!damageType || !damageType.trim()) return ''
  const entry = DAMAGE_TYPE_LABELS[normalizeDamageKey(damageType)]
  if (entry) {
    return currentLocale.value === 'en' ? entry.en : entry.pt
  }
  return humanizeDamageKey(damageType)
}

function getBaseDamageLine(damageType?: string): string {
  const localized = getDamageTypeLabel(damageType)
  const prefix = currentLocale.value === 'pt' ? 'Dano base:' : 'Base damage:'
  return `${prefix} ${localized || '–'}`
}

function compareDamageKeys(a: string, b: string): number {
  if (a === NO_DAMAGE_FILTER_KEY) return 1
  if (b === NO_DAMAGE_FILTER_KEY) return -1

  const entryA = DAMAGE_TYPE_LABELS[normalizeDamageKey(a)]
  const entryB = DAMAGE_TYPE_LABELS[normalizeDamageKey(b)]

  if (entryA && entryB) return entryA.order - entryB.order
  if (entryA) return -1
  if (entryB) return 1

  return getDamageTypeLabel(a).localeCompare(
    getDamageTypeLabel(b),
    currentLocale.value === 'pt' ? 'pt-BR' : 'en'
  )
}

const availableDamageTypes = computed<string[]>(() => {
  const set = new Set<string>()
  for (const spell of spells.value ?? []) {
    if (!showHomebrew.value && spell.homebrew) continue
    if (spell.damageType && spell.damageType.trim()) {
      set.add(spell.damageType)
    } else {
      set.add(NO_DAMAGE_FILTER_KEY)
    }
  }
  return [...set].sort(compareDamageKeys)
})

function getFilterChipLabel(key: string): string {
  if (key === NO_DAMAGE_FILTER_KEY) {
    return currentLocale.value === 'pt' ? 'Sem dano base (–)' : 'No base damage (–)'
  }
  return getDamageTypeLabel(key)
}

function toggleDamagePill(key: string) {
  if (selectedDamageTypes.value.includes(key)) {
    selectedDamageTypes.value = selectedDamageTypes.value.filter((k) => k !== key)
  } else {
    selectedDamageTypes.value = [...selectedDamageTypes.value, key]
  }
}

function clearFilters() {
  filterQuery.value = ''
  selectedDamageTypes.value = []
}

const hasActiveFilters = computed(() =>
  Boolean(filterQuery.value.trim() || selectedDamageTypes.value.length > 0)
)

const filteredSpells = computed<SpellItem[]>(() => {
  const list = spells.value ?? []
  const term = filterQuery.value.trim().toLowerCase()

  return list.filter((spell) => {
    if (!showHomebrew.value && spell.homebrew) return false

    if (selectedDamageTypes.value.length > 0) {
      const hasDamage = Boolean(spell.damageType && spell.damageType.trim())
      const matchesNone =
        !hasDamage && selectedDamageTypes.value.includes(NO_DAMAGE_FILTER_KEY)
      const matchesType =
        hasDamage && selectedDamageTypes.value.includes(spell.damageType!)

      if (!matchesNone && !matchesType) return false
    }

    if (!term) return true

    const ptName = tText(spell.name, '', 'pt').toLowerCase()
    const enName = tText(spell.name, '', 'en').toLowerCase()
    const damageLabel = getDamageTypeLabel(spell.damageType).toLowerCase()
    const descText = `${tPlain(spell.description, '', 'pt')} ${tPlain(spell.description, '', 'en')}`.toLowerCase()

    return (
      ptName.includes(term) ||
      enName.includes(term) ||
      damageLabel.includes(term) ||
      descText.includes(term)
    )
  })
})

const selectedSpell = computed<SpellItem | null>(() => {
  const list = filteredSpells.value
  if (list.length === 0) return null

  const querySpell = typeof route.query.spell === 'string' ? route.query.spell : ''
  if (querySpell) {
    const found = list.find((s) => s.key === querySpell || s._id === querySpell)
    if (found) return found
  }

  return list[0] ?? null
})

function selectSpell(spell: SpellItem) {
  const identifier = spell.key || spell._id
  router.replace({
    query: {
      ...route.query,
      spell: identifier,
    },
  })
}
</script>

<template>
  <div class="detail-page">
    <header class="page-header">
      <div>
        <h1>
          {{ currentLocale === 'pt' ? 'Magias' : 'Spells' }}
        </h1>
        <!-- <p class="page-subtitle">
          {{
            currentLocale === 'pt'
              ? 'Consulte magias por tipo de dano base, escalonamento, opções e efeitos.'
              : 'Browse spells by base damage type, scaling, options, and effects.'
          }}
        </p> -->
      </div>
    </header>

    <WikiFilterBar
      :title="currentLocale === 'pt' ? 'Filtros' : 'Filters'"
      :collapsible="true"
      :default-collapsed="true"
      :has-active-filters="hasActiveFilters"
      :active-count="selectedDamageTypes.length"
      :reset-label="currentLocale === 'pt' ? 'Limpar filtros' : 'Clear filters'"
      @reset="clearFilters"
    >
      <div v-if="availableDamageTypes.length > 0" class="filter-block">
        <span class="filter-label">
          {{ currentLocale === 'pt' ? 'Dano base' : 'Base damage' }}
        </span>
        <div class="chips-wrap">
          <button
            v-for="dKey in availableDamageTypes"
            :key="dKey"
            type="button"
            class="select-chip"
            :class="{ 'is-active': selectedDamageTypes.includes(dKey) }"
            @click="toggleDamagePill(dKey)"
          >
            {{ getFilterChipLabel(dKey) }}
          </button>
        </div>
      </div>
    </WikiFilterBar>

    <div v-if="pending" class="state-box">
      {{ currentLocale === 'pt' ? 'Carregando magias...' : 'Loading spells...' }}
    </div>

    <div v-else-if="error" class="state-box is-error">
      {{ currentLocale === 'pt' ? 'Erro ao carregar magias.' : 'Failed to load spells.' }}
    </div>

    <div v-else class="split-layout">
      <!-- Lista lateral: Título na 1ª linha e Dano base na 2ª linha -->
      <section class="list-pane">
        <div class="list-controls">
          <input
            v-model="filterQuery"
            type="search"
            class="filter-input"
            :placeholder="currentLocale === 'pt' ? 'Buscar magia...' : 'Search spell...'"
          />
          <span class="list-count">{{ filteredSpells.length }}</span>
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
          v-if="filteredSpells.length > 0" 
          class="entity-list"
          :class="{ 'is-collapsed-mobile': isListCollapsedMobile }"
        >
          <li v-for="spell in filteredSpells" :key="spell._id">
            <button
              type="button"
              class="entity-row"
              :class="{ 'is-selected': selectedSpell?._id === spell._id }"
              @click="selectSpell(spell)"
            >
              <div class="row-main">
                <span class="row-title">{{ tText(spell.name) }}</span>
                <span v-if="spell.homebrew" class="badge-homebrew">HB</span>
              </div>
              <div class="row-meta">
                <span>
                  {{ getBaseDamageLine(spell.damageType) }}
                </span>
              </div>
            </button>
          </li>
        </ul>

        <div v-else class="empty-list">
          {{ currentLocale === 'pt' ? 'Nenhuma magia encontrada.' : 'No spells found.' }}
        </div>
      </section>

      <!-- Detalhamento à direita -->
      <article v-if="selectedSpell" class="detail-pane">
        <header class="detail-header">
          <div class="mechanic-header">
            <h2 class="mechanic-name">{{ tText(selectedSpell.name) }}</h2>
            <div class="mechanic-subtitle">
              <span>
                <strong>{{ currentLocale === 'pt' ? 'Dano base: ' : 'Base damage: '}}</strong> 
                <span v-if="getDamageTypeLabel(selectedSpell.damageType)">
                  {{ getDamageTypeLabel(selectedSpell.damageType) }}
                </span>
                <span v-else>–</span>
              </span>
            </div>
          </div>
        </header>

        <section class="detail-section">
          <PortableTextRenderer :blocks="tBlocks(selectedSpell.description)" />
        </section>

        <div v-if="tText(selectedSpell.crit)" class="callout-box">
          <strong>{{ currentLocale === 'pt' ? 'Crítico:' : 'Crit:' }}</strong>
          <span>{{ tText(selectedSpell.crit) }}</span>
        </div>

        <div
          v-if="
            selectedSpell.globalUpcast &&
            (resolveLocalizedField(selectedSpell.globalUpcast.description) ||
              resolveLocalizedField(selectedSpell.globalUpcast.effect) ||
              typeof selectedSpell.globalUpcast.manaCost === 'number' ||
              typeof selectedSpell.globalUpcast.cost === 'number')
          "
          class="callout-box"
        >
          <strong>{{ currentLocale === 'pt' ? 'Upcast Global:' : 'Global Upcast:' }}</strong>
          <span
            v-if="
              typeof (selectedSpell.globalUpcast.manaCost ?? selectedSpell.globalUpcast.cost) === 'number'
            "
            class="mana-badge"
          >
            {{ selectedSpell.globalUpcast.manaCost ?? selectedSpell.globalUpcast.cost }}
            {{ currentLocale === 'pt' ? 'Mana' : 'Mana' }}
          </span>
          <span>
            {{
              resolveLocalizedField(selectedSpell.globalUpcast.description) ||
              resolveLocalizedField(selectedSpell.globalUpcast.effect)
            }}
          </span>
        </div>

        <section
          v-if="selectedSpell.options && selectedSpell.options.length > 0"
          class="detail-block"
        >
          <h3 class="block-heading">
            {{ currentLocale === 'pt' ? 'Opções' : 'Options' }}
          </h3>
          <ul class="cards-list">
            <li
              v-for="(opt, idx) in selectedSpell.options"
              :key="opt._key || `${selectedSpell._id}-opt-${idx}`"
              class="sub-card"
            >
              <div class="sub-card-title">{{ resolveLocalizedField(opt.title) }}</div>
              <p class="sub-card-desc">{{ resolveLocalizedField(opt.description) }}</p>
              <p
                v-if="
                  opt.upcast &&
                  (resolveLocalizedField(opt.upcast.description) ||
                    resolveLocalizedField(opt.upcast.effect))
                "
                class="sub-card-upcast"
              >
                <strong>Upcast:</strong>
                {{ resolveLocalizedField(opt.upcast.description) || resolveLocalizedField(opt.upcast.effect) }}
              </p>
            </li>
          </ul>
        </section>

        <section
          v-if="selectedSpell.scalingTable && selectedSpell.scalingTable.length > 0"
          class="detail-block"
        >
          <h3 class="block-heading">
            {{ currentLocale === 'pt' ? 'Tabela de Escalonamento' : 'Scaling Table' }}
          </h3>
          <div class="table-wrapper">
            <table class="scaling-table">
              <thead>
                <tr>
                  <th>{{ currentLocale === 'pt' ? 'Nível / Bônus' : 'Level / Bonus' }}</th>
                  <th>{{ currentLocale === 'pt' ? 'Mana' : 'Mana' }}</th>
                  <th>{{ currentLocale === 'pt' ? 'Descrição' : 'Description' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in selectedSpell.scalingTable"
                  :key="row._key || `${selectedSpell._id}-scale-${idx}`"
                >
                  <td class="col-nowrap"><strong>{{ row.levelOrBonus || '–' }}</strong></td>
                  <td class="col-nowrap">{{ row.manaCost ?? '–' }}</td>
                  <td>{{ resolveLocalizedField(row.description) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section
          v-if="selectedSpell.specialModifications && selectedSpell.specialModifications.length > 0"
          class="detail-block"
        >
          <h3 class="block-heading">
            {{ currentLocale === 'pt' ? 'Modificações Especiais' : 'Special Modifications' }}
          </h3>
          <ul class="bullet-list">
            <li
              v-for="(mod, idx) in selectedSpell.specialModifications"
              :key="`${selectedSpell._id}-mod-${idx}`"
            >
              {{ resolveLocalizedField(mod) }}
            </li>
          </ul>
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

.detail-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.callout-box {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.7rem 0.9rem;
  border-radius: var(--radius-sm);
  background-color: var(--bg-subtle);
  border-left: 3px solid var(--accent-primary);
  font-size: 0.88rem;
}

.mana-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-sm);
  background-color: var(--accent-subtle);
  color: var(--accent-primary);
}

.detail-block {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.block-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.cards-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.sub-card {
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius-sm);
  background-color: var(--bg-subtle);
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.sub-card-title {
  font-weight: 700;
  font-size: 0.9rem;
}

.sub-card-desc,
.sub-card-upcast {
  margin: 0;
  font-size: 0.86rem;
  color: var(--text-secondary);
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.scaling-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  text-align: left;
}

.scaling-table th {
  padding: 0.5rem 0.75rem;
  background-color: var(--bg-subtle);
  border-bottom: 1px solid var(--border-strong);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.scaling-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.scaling-table tr:last-child td {
  border-bottom: none;
}

.col-nowrap {
  white-space: nowrap;
}

.bullet-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
  color: var(--text-secondary);
}
</style>