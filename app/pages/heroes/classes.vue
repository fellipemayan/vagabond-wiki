<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import type { IntlStringArray, IntlBlockArray } from '~/utils/i18n'
import { formatStatLabel, formatTrainingLabel } from '~/utils/vagabond'

const isListCollapsedMobile = ref(true)

interface ClassIconic {
  _key?: string
  title?: IntlStringArray
  text?: IntlStringArray
}

interface ClassFeatureItem {
  _key: string
  name?: IntlStringArray
  description?: IntlBlockArray
  level?: number[]
}

interface ClassItem {
  _id: string
  key?: string
  name: IntlStringArray
  quote?: {
    text?: IntlStringArray
    source?: IntlStringArray
  }
  iconics?: ClassIconic[]
  description?: IntlBlockArray
  playStyle?: IntlStringArray
  action?: IntlStringArray
  movement?: IntlStringArray
  complexity?: number
  keyStat?: string[]
  training?: string[]
  features?: ClassFeatureItem[]
  homebrew?: boolean
  bookTitle?: IntlStringArray
  bookAcronym?: IntlStringArray
}

const PLURAL_OVERRIDES_PT: Record<string, string> = {
  magus: 'Magi',
  mágus: 'Magi',
}

const PLURAL_OVERRIDES_EN: Record<string, string> = {
  magus: 'Magi',
}

function pluralizeClassName(className: string, loc: 'pt' | 'en'): string {
  const trimmed = className.trim()
  if (!trimmed) return 'Classes'

  const words = trimmed.split(/\s+/)
  const firstWord = words[0]!.toLowerCase()
  const overrides = loc === 'pt' ? PLURAL_OVERRIDES_PT : PLURAL_OVERRIDES_EN

  if (overrides[firstWord]) {
    words[0] = overrides[firstWord]!
    return words.join(' ')
  }

  if (loc === 'pt') {
    if (/(ão|ãe|õe)$/i.test(trimmed)) {
      if (/ção$/i.test(trimmed)) return trimmed.replace(/ção$/i, 'ções')
      if (/são$/i.test(trimmed)) return trimmed.replace(/são$/i, 'sões')
      return trimmed.replace(/ão$/i, 'ões')
    }
    if (/(r|z|s|n)$/i.test(trimmed)) return `${trimmed}es`
    if (/l$/i.test(trimmed)) return trimmed.replace(/l$/i, 'is')
    if (/m$/i.test(trimmed)) return trimmed.replace(/m$/i, 'ns')
    return `${trimmed}s`
  }

  if (/(s|x|z|ch|sh)$/i.test(trimmed)) return `${trimmed}es`
  if (/[^aeiou]y$/i.test(trimmed)) return trimmed.replace(/y$/i, 'ies')
  return `${trimmed}s`
}

function getIconicsHeading(className: string, loc: 'pt' | 'en'): string {
  const plural = pluralizeClassName(className, loc)
  if (loc === 'en') return `Iconic ${plural}`

  const firstWord = className.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  const isFeminine = /a$/.test(firstWord) && !/(ista|ante|ente)$/.test(firstWord)
  return `${plural} ${isFeminine ? 'Icônicas' : 'Icônicos'}`
}

function formatStars(complexity?: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(complexity ?? 0)))
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
}

function formatLevelsList(levels: number[] | undefined, loc: 'pt' | 'en'): string {
  if (!Array.isArray(levels) || levels.length === 0) return ''
  const sorted = [...new Set(levels)].sort((a, b) => a - b)
  const conj = loc === 'pt' ? ' e ' : ' and '

  if (sorted.length === 1) return `${sorted[0]}`
  if (sorted.length === 2) return `${sorted[0]}${conj}${sorted[1]}`

  const last = sorted[sorted.length - 1]
  const rest = sorted.slice(0, -1).join(', ')
  return `${rest}${conj}${last}`
}

interface FeatureHeadingParts {
  className: string
  label: string
  levelsStr: string
}

function getFeatureHeadingParts(
  className: string,
  levels: number[] | undefined,
  loc: 'pt' | 'en'
): FeatureHeadingParts {
  const sorted =
    Array.isArray(levels) && levels.length > 0
      ? [...new Set(levels)].sort((a, b) => a - b)
      : []
  const levelsStr = formatLevelsList(sorted, loc)

  if (!levelsStr) {
    return { className, label: '', levelsStr: '' }
  }

  const label =
    loc === 'pt'
      ? sorted.length > 1
        ? 'Níveis'
        : 'Nível'
      : sorted.length > 1
        ? 'Levels'
        : 'Level'

  return { className, label, levelsStr }
}

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()
const { showHomebrew } = storeToRefs(preferences)
const { locale, tText, tBlocks } = useWikiI18n()

const CLASSES_QUERY = `
  *[_type == "class"] | order(coalesce(sortName, name[language == "pt"][0].value, name[_key == "pt"][0].value, key.current) asc) {
    _id,
    "key": coalesce(key.current, slug.current),
    name,
    quote,
    iconics[]{
      _key,
      title,
      text
    },
    description,
    playStyle,
    action,
    movement,
    complexity,
    keyStat,
    training,
    features[]{
      _key,
      name,
      description,
      level
    },
    homebrew,
    "bookTitle": source->book.title,
    "bookAcronym": source->book.acronym
  }
`

const { data: classes, pending, error } = await useSanityQuery<ClassItem[]>(
  'wiki-classes',
  CLASSES_QUERY
)

const filterQuery = ref('')

const filteredClasses = computed(() => {
  const list = classes.value ?? []
  const term = filterQuery.value.trim().toLowerCase()

  return list.filter((item) => {
    if (!showHomebrew.value && item.homebrew) return false
    if (!term) return true

    const ptName = tText(item.name, '', 'pt').toLowerCase()
    const enName = tText(item.name, '', 'en').toLowerCase()
    const slug = (item.key ?? '').toLowerCase()

    return ptName.includes(term) || enName.includes(term) || slug.includes(term)
  })
})

const selectedClass = computed<ClassItem | null>(() => {
  const list = filteredClasses.value
  if (list.length === 0) return null

  const queryItem = typeof route.query.item === 'string' ? route.query.item : ''
  if (queryItem) {
    const found = list.find((c) => c.key === queryItem || c._id === queryItem)
    if (found) return found
  }

  return list[0] ?? null
})

function selectClass(item: ClassItem) {
  const identifier = item.key || item._id
  router.replace({
    query: {
      ...route.query,
      item: identifier,
    },
  })
}

const classStatsList = computed(() => {
  const cls = selectedClass.value
  if (!cls) return []

  const rows: Array<{ title: string; value: string }> = []

  const actionText = tText(cls.action)
  if (actionText) {
    rows.push({
      title: locale.value === 'pt' ? 'Ação' : 'Action',
      value: actionText,
    })
  }

  const movementText = tText(cls.movement)
  if (movementText) {
    rows.push({
      title: locale.value === 'pt' ? 'Movimento' : 'Movement',
      value: movementText,
    })
  }

  if (Array.isArray(cls.keyStat) && cls.keyStat.length > 0) {
    const mappedStats = cls.keyStat
      .map((st) => formatStatLabel(st, locale.value))
      .filter(Boolean)
    if (mappedStats.length > 0) {
      rows.push({
        title: locale.value === 'pt' ? 'Atributo-chave' : 'Key Stat',
        value: mappedStats.join(', '),
      })
    }
  }

  if (typeof cls.complexity === 'number') {
    rows.push({
      title: locale.value === 'pt' ? 'Complexidade' : 'Complexity',
      value: formatStars(cls.complexity),
    })
  }

  if (Array.isArray(cls.training) && cls.training.length > 0) {
    const mappedTrainings = cls.training
      .map((tr) => formatTrainingLabel(tr, locale.value))
      .filter(Boolean)
    if (mappedTrainings.length > 0) {
      rows.push({
        title: locale.value === 'pt' ? 'Treinamento' : 'Training',
        value: mappedTrainings.join(', '),
      })
    }
  }

  return rows
})
</script>

<template>
  <div class="detail-page">
    <header class="page-header">
      <div>
        <h1>
          {{ locale === 'pt' ? 'Classes' : 'Classes' }}
        </h1>
        <!-- <p class="page-subtitle">
          {{
            locale === 'pt'
              ? 'Selecione uma classe para consultar descrição, icônicos, estilo de jogo, atributos e habilidades.'
              : 'Select a class to view its description, iconics, play style, stats, and features.'
          }}
        </p> -->
      </div>
    </header>

    <div v-if="pending" class="state-box">
      {{ locale === 'pt' ? 'Carregando classes...' : 'Loading classes...' }}
    </div>

    <div v-else-if="error" class="state-box is-error">
      {{ locale === 'pt' ? 'Erro ao carregar classes.' : 'Failed to load classes.' }}
    </div>

    <div v-else class="split-layout">
      <!-- Lista lateral: apenas o nome da classe -->
      <section class="list-pane">
        <div class="list-controls">
          <input
            v-model="filterQuery"
            type="search"
            class="filter-input"
            :placeholder="locale === 'pt' ? 'Filtrar classe...' : 'Filter class...'"
          />
          <span class="list-count">{{ filteredClasses.length }}</span>
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
          v-if="filteredClasses.length > 0" 
          class="entity-list"
          :class="{ 'is-collapsed-mobile': isListCollapsedMobile }"
        >
          <li v-for="cls in filteredClasses" :key="cls._id">
            <button
              type="button"
              class="entity-row"
              :class="{ 'is-selected': selectedClass?._id === cls._id }"
              @click="selectClass(cls)"
            >
            <div class="row-main">
                <span class="row-title">{{ tText(cls.name) }}</span>
                <span v-if="cls.homebrew" class="badge-homebrew">HB</span>
              </div>
            </button>
          </li>
        </ul>

        <div v-else class="empty-list">
          {{ locale === 'pt' ? 'Nenhuma classe encontrada.' : 'No classes found.' }}
        </div>
      </section>

      <!-- Detalhes da classe na ordem solicitada -->
      <article v-if="selectedClass" class="detail-pane">
        <!-- 1. Nome -->
        <header class="detail-header">
          <div class="detail-title-row">
            <h2 class="detail-title">{{ tText(selectedClass.name) }}</h2>

            <div class="detail-badges">
              <span
                v-if="tText(selectedClass.bookAcronym) || tText(selectedClass.bookTitle)"
                class="meta-pill"
              >
                {{ tText(selectedClass.bookAcronym) || tText(selectedClass.bookTitle) }}
              </span>

              <span v-if="selectedClass.homebrew" class="meta-pill is-accent">
                Homebrew
              </span>
            </div>
          </div>
        </header>

        <!-- 2. Citação -->
        <blockquote v-if="tText(selectedClass.quote?.text)" class="class-quote">
          <p class="quote-text">“{{ tText(selectedClass.quote?.text) }}”</p>
          <footer v-if="tText(selectedClass.quote?.source)" class="quote-source">
            — {{ tText(selectedClass.quote?.source) }}
          </footer>
        </blockquote>

        <!-- 3. Descrição -->
        <section v-if="tBlocks(selectedClass.description).length > 0" class="detail-section">
          <PortableTextRenderer :blocks="tBlocks(selectedClass.description)" />
        </section>

        <!-- 4. {Nome da classe no plural} Icônicos -->
        <section
          v-if="selectedClass.iconics && selectedClass.iconics.length > 0"
          class="detail-section"
        >
        <h3 class="section-heading">
          {{ getIconicsHeading(tText(selectedClass.name), locale) }}
        </h3>

          <ul class="bullet-list">
            <li
              v-for="(ic, idx) in selectedClass.iconics"
              :key="ic._key || idx"
              class="bullet-item"
            >
              <strong>{{ tText(ic.title) }},</strong>
              <em>{{ tText(ic.text) }}</em>
            </li>
          </ul>
        </section>

        <!-- 5. Jogando o {nome da classe} (playstyle) -->
        <section v-if="tText(selectedClass.playStyle)" class="detail-section">
          <h3 class="section-heading">
            {{
              locale === 'pt'
                ? `Jogando o ${tText(selectedClass.name)}`
                : `Playing the ${tText(selectedClass.name)}`
            }}
          </h3>
          <p class="playstyle-text">{{ tText(selectedClass.playStyle) }}</p>
        </section>

        <!-- 6. Lista ({title}: {value}) -->
        <section v-if="classStatsList.length > 0" class="detail-section">
          <ul class="props-list">
            <li v-for="row in classStatsList" :key="row.title" class="props-item">
              <strong class="prop-title">{{ row.title }}: </strong>
              <span
                class="prop-value"
                :class="{ 'is-stars': row.title === 'Complexidade' || row.title === 'Complexity' }"
              >
                {{ row.value }}
              </span>
            </li>
          </ul>
        </section>

        <!-- 7. Lista de features -->
        <section
          v-if="selectedClass.features && selectedClass.features.length > 0"
          class="detail-section"
        >
          <h3 class="section-heading">
            {{ locale === 'pt' ? 'Habilidades de Classe' : 'Class Features' }}
          </h3>

          <div class="features-list">
            <div
              v-for="feat in selectedClass.features"
              :key="feat._key"
              class="feature-card"
            >
              <div class="mechanic-header">
                <h4 class="mechanic-name">{{ tText(feat.name) }}</h4>
                <template
                  v-for="heading in [getFeatureHeadingParts(tText(selectedClass.name), feat.level, locale)]"
                  :key="`${feat._key}-heading`"
                >
                  <span class="mechanic-subtitle">
                    <strong>{{ heading.className }}: </strong>
                    <template v-if="heading.levelsStr">
                      <span>{{ heading.label }} {{ heading.levelsStr }}</span>
                    </template>
                  </span>
                </template>
              </div>

              <PortableTextRenderer :blocks="tBlocks(feat.description)" />
            </div>
          </div>
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

.detail-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.detail-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
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

.class-quote {
  margin: 0;
  padding: 1rem;
  font-style: italic;
  background-color: var(--bg-inverse);
  color: var(--text-inverse);
  border-radius: 0 1rem 0 1rem;
  corner-shape: bevel;
}

.quote-source {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-inverse-muted);
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bullet-list {
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bullet-item strong {
  margin-right: 0.35rem;
}

.props-list {
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.props-item {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.prop-title {
  font-weight: 700;
  color: var(--text-heading);
}

.prop-value {
  color: var(--text-secondary);
}

.prop-value.is-stars {
  letter-spacing: 0.1em;
}
</style>