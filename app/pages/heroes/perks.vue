<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import type { IntlStringArray, IntlBlockArray } from '~/utils/i18n'
import {
  STAT_OPTIONS,
  TRAINING_OPTIONS,
  formatStatLabel,
  formatTrainingLabel,
} from '~/utils/vagabond'

const isListCollapsedMobile = ref(true)

interface SpellRef {
  _id: string
  key?: string
  name?: IntlStringArray
}

interface StatPrerequisite {
  usesSelectedStat?: boolean
  name?: string
  operator?: 'gte' | 'lt' | 'lte' | 'gt' | string
  value?: number
}

interface TrainedGroup {
  _key?: string
  skills?: string[]
  operator?: 'and' | 'or'
}

interface SpellPrerequisite {
  anySpell?: boolean
  spells?: SpellRef[]
}

interface PerkPrerequisites {
  stat?: StatPrerequisite
  trainedGroups?: TrainedGroup[]
  spell?: SpellPrerequisite
}

interface PrerequisiteSegment {
  key: string
  label: string
  value: string
  isStatCode?: boolean
}

function getPrerequisiteSegments(item: PerkItem): PrerequisiteSegment[] {
  const parts = getParsedPrereq(item)
  const stat = item.prerequisites?.stat
  const segments: PrerequisiteSegment[] = []

  if (parts.statFormatted && stat) {
    const label = currentLocale.value === 'pt' ? 'Atributo' : 'Stat'
    const op = stat.operator ?? 'gte'
    const val = stat.value

    let operatorAndValue = ''
    if (typeof val === 'number') {
      if (op === 'gte') operatorAndValue = val === 7 ? ` ${val}` : ` ${val}+`
      else if (op === 'lte') operatorAndValue = ` <= ${val}`
      else if (op === 'lt') operatorAndValue = ` < ${val}`
      else if (op === 'gt') operatorAndValue = ` > ${val}`
      else operatorAndValue = ` ${val}`
    }

    if (stat.usesSelectedStat) {
      const selectedLabel =
        currentLocale.value === 'pt' ? 'Atributo selecionado' : 'Selected stat'
      segments.push({
        key: 'stat',
        label,
        value: `${selectedLabel}${operatorAndValue}`,
      })
    } else if (stat.name) {
      segments.push({
        key: 'stat',
        label,
        value: `${stat.name.trim()}${operatorAndValue}`,
        isStatCode: true,
      })
    }
  }

  if (parts.spellFormatted) {
    segments.push({
      key: 'spell',
      label: currentLocale.value === 'pt' ? 'Magia' : 'Spell',
      value: parts.spellFormatted,
    })
  }

  if (parts.trainedFormatted) {
    segments.push({
      key: 'trained',
      label: currentLocale.value === 'pt' ? 'Treinamento' : 'Trained',
      value: parts.trainedFormatted,
    })
  }

  return segments
}

interface PerkItem {
  _id: string
  key?: string
  name: IntlStringArray
  description?: IntlBlockArray
  unlimitedTimes?: boolean
  timesCanTake?: number
  prerequisites?: PerkPrerequisites
  homebrew?: boolean
  bookTitle?: IntlStringArray
  bookAcronym?: IntlStringArray
}

interface ParsedPrerequisiteParts {
  statName?: string
  statUsesSelected?: boolean
  statValue?: number
  statFormatted?: string
  spellFormatted?: string
  spellIds: string[]
  trainedFormatted?: string
  trainedKeys: string[]
}

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()
const { showHomebrew, locale: prefLocale } = storeToRefs(preferences)
const { locale: wikiLocale, tText, tBlocks, tPlain } = useWikiI18n()

const currentLocale = computed<'pt' | 'en'>(() =>
  prefLocale.value === 'en' || wikiLocale.value === 'en' ? 'en' : 'pt'
)

const PERKS_QUERY = `
  *[_type == "perk"] | order(coalesce(sortName, name[language == "pt"][0].value, name[_key == "pt"][0].value, key.current) asc) {
    _id,
    "key": coalesce(key.current, slug.current),
    name,
    description,
    unlimitedTimes,
    timesCanTake,
    homebrew,
    "bookTitle": source->book.title,
    "bookAcronym": source->book.acronym,
    prerequisites{
      stat{
        usesSelectedStat,
        name,
        operator,
        value
      },
      trainedGroups[]{
        _key,
        skills,
        operator
      },
      spell{
        anySpell,
        spells[]->{
          _id,
          "key": coalesce(key.current, slug.current),
          name
        }
      }
    }
  }
`

const { data: perks, pending, error } = await useSanityQuery<PerkItem[]>(
  'wiki-perks',
  PERKS_QUERY
)

const filterQuery = ref('')
const filterStat = ref<string>('')
const filterStatMin = ref<number>(4)
const filterSpells = ref<string[]>([])
const filterTrainings = ref<string[]>([])
const spellFilterSearch = ref('')

function parseStat(prereq?: PerkPrerequisites): {
  name?: string
  usesSelectedStat?: boolean
  value?: number
  text?: string
} {
  const stat = prereq?.stat
  if (!stat || typeof stat.value !== 'number') return {}
  if (!stat.usesSelectedStat && !stat.name) return {}

  const normalizedName = stat.name ? stat.name.trim().toLowerCase() : undefined
  const label = stat.usesSelectedStat
    ? currentLocale.value === 'pt'
      ? 'Atributo selecionado'
      : 'Selected stat'
    : formatStatLabel(normalizedName!, currentLocale.value)

  const op = stat.operator ?? 'gte'
  let formattedValue = ''

  if (op === 'gte') {
    formattedValue = stat.value === 7 ? ' 7' : ` ${stat.value}+`
  } else if (op === 'lte') {
    formattedValue = ` <= ${stat.value}`
  } else if (op === 'lt') {
    formattedValue = ` < ${stat.value}`
  } else if (op === 'gt') {
    formattedValue = ` > ${stat.value}`
  } else {
    formattedValue = ` ${stat.value}`
  }

  return {
    name: normalizedName,
    usesSelectedStat: Boolean(stat.usesSelectedStat),
    value: stat.value,
    text: `${label}${formattedValue}`,
  }
}

function parseSpell(prereq?: PerkPrerequisites): { text?: string; spellIds: string[] } {
  const spellPrereq = prereq?.spell
  if (!spellPrereq) return { spellIds: [] }

  const list = Array.isArray(spellPrereq.spells) ? spellPrereq.spells : []
  const spellIds = list.map((s) => s?._id).filter((id): id is string => Boolean(id))

  if (spellPrereq.anySpell) {
    return {
      text: currentLocale.value === 'pt' ? 'Qualquer magia' : 'Any spell',
      spellIds,
    }
  }

  const firstSpellName = list.map((s) => tText(s?.name)).find((n) => Boolean(n))
  if (firstSpellName) {
    return {
      text: firstSpellName,
      spellIds,
    }
  }

  return { spellIds }
}

function formatGroupSkills(skills: string[], operator: 'and' | 'or' | undefined, loc: 'pt' | 'en'): string {
  const mapped = skills.map((s) => formatTrainingLabel(s, loc)).filter(Boolean)
  if (mapped.length === 0) return ''
  if (mapped.length === 1) return mapped[0]!

  if (operator === 'and') {
    return loc === 'pt' ? mapped.join(' e ') : mapped.join(' & ')
  }

  return loc === 'pt' ? mapped.join(' ou ') : `either ${mapped.join(' or ')}`
}

function parseTrained(prereq?: PerkPrerequisites): { text?: string; keys: string[] } {
  const groups = Array.isArray(prereq?.trainedGroups) ? prereq.trainedGroups : []
  if (groups.length === 0) return { keys: [] }

  const keys = new Set<string>()
  const segments: string[] = []

  for (const group of groups) {
    const skills = (group.skills ?? [])
      .map((s) => String(s).trim().toLowerCase())
      .filter(Boolean)

    if (skills.length === 0) continue
    skills.forEach((k) => keys.add(k))

    const formatted = formatGroupSkills(skills, group.operator ?? 'or', currentLocale.value)
    if (formatted) segments.push(formatted)
  }

  if (segments.length === 0) {
    return { keys: [...keys] }
  }

  const joiner = currentLocale.value === 'pt' ? ' e ' : ' & '
  return {
    text: segments.join(joiner),
    keys: [...keys],
  }
}

function getParsedPrereq(item: PerkItem): ParsedPrerequisiteParts {
  const statInfo = parseStat(item.prerequisites)
  const spellInfo = parseSpell(item.prerequisites)
  const trainedInfo = parseTrained(item.prerequisites)

  return {
    statName: statInfo.name,
    statUsesSelected: statInfo.usesSelectedStat,
    statValue: statInfo.value,
    statFormatted: statInfo.text,
    spellFormatted: spellInfo.text,
    spellIds: spellInfo.spellIds,
    trainedFormatted: trainedInfo.text,
    trainedKeys: trainedInfo.keys,
  }
}

function formatPrerequisiteLine(item: PerkItem): string {
  const parts = getParsedPrereq(item)
  const blocks: string[] = []

  if (parts.statFormatted) {
    const label = currentLocale.value === 'pt' ? 'Atributo' : 'Stat'
    blocks.push(`${label}: ${parts.statFormatted}`)
  }

  if (parts.spellFormatted) {
    const label = currentLocale.value === 'pt' ? 'Magia' : 'Spell'
    blocks.push(`${label}: ${parts.spellFormatted}`)
  }

  if (parts.trainedFormatted) {
    const label = currentLocale.value === 'pt' ? 'Treinamento' : 'Trained'
    blocks.push(`${label}: ${parts.trainedFormatted}`)
  }

  if (blocks.length === 0) return '–'
  return blocks.join(' | ')
}

const spellOptions = computed(() => {
  const map = new Map<string, { id: string; label: string }>()
  for (const perk of perks.value ?? []) {
    const list = perk.prerequisites?.spell?.spells ?? []
    for (const sp of list) {
      if (sp?._id) {
        const lbl = tText(sp.name) || sp.key || sp._id
        if (!map.has(sp._id)) {
          map.set(sp._id, { id: sp._id, label: lbl })
        }
      }
    }
  }
  const search = spellFilterSearch.value.trim().toLowerCase()
  return [...map.values()]
    .filter((o) => (!search ? true : o.label.toLowerCase().includes(search)))
    .sort((a, b) => a.label.localeCompare(b.label, currentLocale.value === 'pt' ? 'pt-BR' : 'en'))
})

function toggleArraySelection(current: string[], id: string): string[] {
  return current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]
}

function clearFilters() {
  filterQuery.value = ''
  filterStat.value = ''
  filterStatMin.value = 4
  filterSpells.value = []
  filterTrainings.value = []
  spellFilterSearch.value = ''
}

const activeFilterCount = computed(() => {
  let count = 0
  if (filterStat.value) count += 1
  if (filterSpells.value.length > 0) count += filterSpells.value.length
  if (filterTrainings.value.length > 0) count += filterTrainings.value.length
  return count
})

const hasActiveFilters = computed(() =>
  Boolean(filterQuery.value.trim() || activeFilterCount.value > 0)
)

const filteredPerks = computed(() => {
  const list = perks.value ?? []
  const term = filterQuery.value.trim().toLowerCase()

  return list.filter((item) => {
    if (!showHomebrew.value && item.homebrew) return false

    const parsed = getParsedPrereq(item)

    if (filterStat.value) {
      if (parsed.statName !== filterStat.value) return false
      if ((parsed.statValue ?? 0) < filterStatMin.value) return false
    }

    if (filterSpells.value.length > 0) {
      const matchesAnySpell = filterSpells.value.some((id) => parsed.spellIds.includes(id))
      if (!matchesAnySpell) return false
    }

    if (filterTrainings.value.length > 0) {
      const matchesAnyTraining = filterTrainings.value.some((tr) =>
        parsed.trainedKeys.includes(tr)
      )
      if (!matchesAnyTraining) return false
    }

    if (!term) return true

    const ptName = tText(item.name, '', 'pt').toLowerCase()
    const enName = tText(item.name, '', 'en').toLowerCase()
    const slug = (item.key ?? '').toLowerCase()
    const prereqLine = formatPrerequisiteLine(item).toLowerCase()
    const descText = `${tPlain(item.description, '', 'pt')} ${tPlain(item.description, '', 'en')}`.toLowerCase()

    return (
      ptName.includes(term) ||
      enName.includes(term) ||
      slug.includes(term) ||
      prereqLine.includes(term) ||
      descText.includes(term)
    )
  })
})

const selectedPerk = computed<PerkItem | null>(() => {
  const list = filteredPerks.value
  if (list.length === 0) return null

  const queryItem = typeof route.query.item === 'string' ? route.query.item : ''
  if (queryItem) {
    const found = list.find((p) => p.key === queryItem || p._id === queryItem)
    if (found) return found
  }

  return list[0] ?? null
})

function selectPerk(item: PerkItem) {
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
          {{ currentLocale === 'pt' ? 'Talentos' : 'Perks' }}
        </h1>
        <!-- <p class="page-subtitle">
          {{
            currentLocale === 'pt'
              ? 'Consulte pré-requisitos, habilidades e filtre por atributo, magia ou perícia.'
              : 'Browse prerequisites, abilities, and filter by stat, spell, or skill.'
          }}
        </p> -->
      </div>
    </header>

    <WikiFilterBar
      :title="currentLocale === 'pt' ? 'Filtros avançados' : 'Advanced filters'"
      :collapsible="true"
      :default-collapsed="true"
      :has-active-filters="hasActiveFilters"
      :active-count="activeFilterCount"
      :reset-label="currentLocale === 'pt' ? 'Limpar filtros' : 'Clear filters'"
      @reset="clearFilters"
    >
      <div class="filters-row">
        <div class="filter-group">
          <label class="filter-label">
            {{ currentLocale === 'pt' ? 'Atributo' : 'Stat' }}
          </label>
          <select v-model="filterStat" class="filter-select">
            <option value="">
              {{ currentLocale === 'pt' ? 'Qualquer atributo' : 'Any stat' }}
            </option>
            <option
              v-for="st in STAT_OPTIONS"
              :key="st.value"
              :value="st.value"
            >
              {{ currentLocale === 'pt' ? st.title : st.en }}
            </option>
          </select>
        </div>

        <div class="filter-group filter-group-sm">
          <label class="filter-label">
            {{ currentLocale === 'pt' ? 'Mínimo' : 'Min' }}
          </label>
          <input
            v-model.number="filterStatMin"
            type="number"
            min="1"
            max="7"
            class="filter-number"
            :disabled="!filterStat"
          />
        </div>

        <div class="filter-group filter-group-grow">
          <label class="filter-label">
            {{ currentLocale === 'pt' ? 'Perícias (1 ou mais)' : 'Skills / Training (1 or more)' }}
          </label>
          <div class="chips-wrap">
            <button
              v-for="tr in TRAINING_OPTIONS"
              :key="tr.value"
              type="button"
              class="select-chip"
              :class="{ 'is-active': filterTrainings.includes(tr.value) }"
              @click="filterTrainings = toggleArraySelection(filterTrainings, tr.value)"
            >
              {{ currentLocale === 'pt' ? tr.title : tr.en }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="spellOptions.length > 0" class="filters-row">
        <div class="filter-group filter-group-grow">
          <div class="spell-filter-header">
            <label class="filter-label">
              {{ currentLocale === 'pt' ? 'Magias (1 ou mais)' : 'Spells (1 or more)' }}
            </label>
            <input
              v-model="spellFilterSearch"
              type="search"
              class="mini-search"
              :placeholder="currentLocale === 'pt' ? 'Buscar magia...' : 'Search spell...'"
            />
          </div>
          <div class="chips-wrap">
            <button
              v-for="sp in spellOptions"
              :key="sp.id"
              type="button"
              class="select-chip"
              :class="{ 'is-active': filterSpells.includes(sp.id) }"
              @click="filterSpells = toggleArraySelection(filterSpells, sp.id)"
            >
              {{ sp.label }}
            </button>
          </div>
        </div>
      </div>
    </WikiFilterBar>

    <div v-if="pending" class="state-box">
      {{ currentLocale === 'pt' ? 'Carregando talentos...' : 'Loading perks...' }}
    </div>

    <div v-else-if="error" class="state-box is-error">
      {{ currentLocale === 'pt' ? 'Erro ao carregar talentos.' : 'Failed to load perks.' }}
    </div>

    <div v-else class="split-layout">
      <!-- Lista lateral -->
      <section class="list-pane">
        <div class="list-controls">
          <input
            v-model="filterQuery"
            type="search"
            class="filter-input"
            :placeholder="currentLocale === 'pt' ? 'Buscar talento...' : 'Search perk...'"
          />
          <span class="list-count">{{ filteredPerks.length }}</span>
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
          v-if="filteredPerks.length > 0" 
          class="entity-list"
          :class="{ 'is-collapsed-mobile': isListCollapsedMobile }"
        >
          <li v-for="perk in filteredPerks" :key="perk._id">
            <button
              type="button"
              class="entity-row"
              :class="{ 'is-selected': selectedPerk?._id === perk._id }"
              @click="selectPerk(perk)"
            >
              <div class="row-main">
                <span class="row-title">{{ tText(perk.name) }}</span>
                <span v-if="perk.homebrew" class="badge-homebrew">HB</span>
              </div>
              <div class="row-meta">
                <span :title="formatPrerequisiteLine(perk)">
                  {{ formatPrerequisiteLine(perk) }}
                </span>
              </div>
            </button>
          </li>
        </ul>

        <div v-else class="empty-list">
          {{ currentLocale === 'pt' ? 'Nenhum talento encontrado.' : 'No perks found.' }}
        </div>
      </section>

      <!-- Detalhes do talento -->
      <article v-if="selectedPerk" class="detail-pane">
        <header class="perk-header">
          <div class="mechanic-header">
            <h2 class="mechanic-name">{{ tText(selectedPerk.name) }}</h2>
            <span class="mechanic-subtitle">
              <template v-if="getPrerequisiteSegments(selectedPerk).length > 0">
                <template
                  v-for="(seg, idx) in getPrerequisiteSegments(selectedPerk)"
                  :key="seg.key"
                >
                  <span v-if="idx > 0"> | </span>
                  <strong>{{seg.label}}: </strong>
                  <span :style="seg.isStatCode ? { textTransform: 'uppercase' } : undefined">
                    {{ seg.value }}
                  </span>
                </template>
              </template>
              <template v-else>–</template>
            </span>
          </div>

          <div class="detail-badges">
            <span
              v-if="tText(selectedPerk.bookAcronym) || tText(selectedPerk.bookTitle)"
              class="meta-pill"
            >
              {{ tText(selectedPerk.bookAcronym) || tText(selectedPerk.bookTitle) }}
            </span>

            <span v-if="selectedPerk.homebrew" class="meta-pill is-accent">
              Homebrew
            </span>
          </div>
        </header>
        <section class="detail-section">
          <PortableTextRenderer :blocks="tBlocks(selectedPerk.description)" />
        </section>
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

.filter-group-sm {
  min-width: 5.5rem;
  max-width: 6.5rem;
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

.filter-select,
.filter-number,
.mini-search {
  height: 2rem;
  padding: 0 0.55rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-size: 0.84rem;
}

.spell-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mini-search {
  height: 1.65rem;
  font-size: 0.78rem;
  width: 12rem;
}

.chips-wrap {
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

.list-count {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.empty-list {
  padding: 1rem;
  font-size: 0.86rem;
  color: var(--text-muted);
  text-align: center;
}

.detail-header {
  display: flex;
  flex-direction: column;
  padding-bottom: 1rem;
}

.detail-title-row {
  width: 100%;
  display: flex;
  flex-direction: column;
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
  /* font-size: 0.8rem; */
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