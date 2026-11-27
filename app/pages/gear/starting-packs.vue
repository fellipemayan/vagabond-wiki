<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import type { IntlStringArray } from '~/utils/i18n'

interface PackEntryItem {
  _key?: string
  quantity?: number
  count?: number
  amount?: number
  note?: IntlStringArray
  item?: {
    _id: string
    _type: 'gear' | 'weapon' | 'armor' | 'alchemical'
    key?: string
    name: IntlStringArray
    category?: string[]
  }
}

interface StartingPack {
  _id: string
  key?: string
  name: IntlStringArray
  cost?: number
  items?: PackEntryItem[]
  homebrew?: boolean
  bookTitle?: IntlStringArray
  bookAcronym?: IntlStringArray
}

interface D66Row {
  pack: StartingPack
  index: number
  die1: number | null
  die2: number | null
  isDie1Start: boolean
  die1Span: number
  remainingCopper: number
}

const STARTING_WEALTH_COPPER = 30000

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()
const { showHomebrew, locale: prefLocale } = storeToRefs(preferences)
const { locale: wikiLocale, tText } = useWikiI18n()

const currentLocale = computed<'pt' | 'en'>(() =>
  prefLocale.value === 'en' || wikiLocale.value === 'en' ? 'en' : 'pt'
)

const STARTING_PACKS_QUERY = `
  *[_type == "startingPack" || (_type == "gear" && ("startingPack" in category || "startingPacks" in category))] {
    _id,
    "key": coalesce(key.current, slug.current),
    name,
    cost,
    homebrew,
    "bookTitle": source->book.title,
    "bookAcronym": source->book.acronym,
    "items": coalesce(items, packItems, entries)[]{
      _key,
      quantity,
      count,
      amount,
      note,
      "item": coalesce(item->, gear->, reference->){
        _id,
        _type,
        "key": coalesce(key.current, slug.current),
        name,
        category
      }
    }
  }
`

const { data: rawPacks, pending, error } = await useSanityQuery<StartingPack[]>(
  'wiki-starting-packs',
  STARTING_PACKS_QUERY
)

const searchQuery = ref('')

function stripPackPrefix(rawName: string): string {
  const cleaned = rawName
    .replace(/^(pacote\s+inicial|starting\s+pack)\s*[,:\-–—]\s*/i, '')
    .trim()
  if (!cleaned) return rawName.trim()
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function getPackDisplayName(pack: StartingPack, targetLocale?: 'pt' | 'en'): string {
  const raw = tText(pack.name, '', targetLocale)
  return stripPackPrefix(raw)
}

const sortedPacks = computed<StartingPack[]>(() => {
  const list = rawPacks.value ?? []
  const term = searchQuery.value.trim().toLowerCase()

  const visible = list.filter((pack) => {
    if (!showHomebrew.value && pack.homebrew) return false
    if (!term) return true

    const ptName = getPackDisplayName(pack, 'pt').toLowerCase()
    const enName = getPackDisplayName(pack, 'en').toLowerCase()
    const itemMatches = (pack.items ?? []).some((entry) => {
      const refNamePt = tText(entry.item?.name, '', 'pt').toLowerCase()
      const refNameEn = tText(entry.item?.name, '', 'en').toLowerCase()
      const noteText = tText(entry.note).toLowerCase()
      return refNamePt.includes(term) || refNameEn.includes(term) || noteText.includes(term)
    })

    return ptName.includes(term) || enName.includes(term) || itemMatches
  })

  // Ordenação alfabética consistente pelo nome em inglês (conforme o livro)
  return [...visible].sort((a, b) => {
    const enA = getPackDisplayName(a, 'en') || getPackDisplayName(a, 'pt')
    const enB = getPackDisplayName(b, 'en') || getPackDisplayName(b, 'pt')
    return enA.localeCompare(enB, 'en', { sensitivity: 'base' })
  })
})

const d66Rows = computed<D66Row[]>(() => {
  const list = sortedPacks.value
  const total = list.length

  return list.map((pack, index) => {
    const isWithinD66 = index < 36
    const die1 = isWithinD66 ? Math.floor(index / 6) + 1 : null
    const die2 = isWithinD66 ? (index % 6) + 1 : null
    const isDie1Start = isWithinD66 && index % 6 === 0

    let die1Span = 1
    if (isDie1Start) {
      const remainingInBlock = total - index
      die1Span = Math.min(6, remainingInBlock)
    }

    const cost =
      typeof pack.cost === 'number' && !Number.isNaN(pack.cost)
        ? Math.max(0, Math.floor(pack.cost))
        : 0
    const remainingCopper = Math.max(0, STARTING_WEALTH_COPPER - cost)

    return {
      pack,
      index,
      die1,
      die2,
      isDie1Start,
      die1Span,
      remainingCopper,
    }
  })
})

const { formatPrice } = useCurrency()

function getEntryQuantity(entry: PackEntryItem): number | undefined {
  const qty = entry.quantity ?? entry.count ?? entry.amount
  if (typeof qty === 'number' && !Number.isNaN(qty) && qty > 1) {
    return qty
  }
  return undefined
}

function getItemRoute(entry: PackEntryItem) {
  const ref = entry.item
  if (!ref) return null

  const identifier = ref.key || ref._id
  if (!identifier) return null

  if (ref._type === 'alchemical') {
    return { path: '/gear/alchemicals', query: { item: identifier } }
  }

  if (ref._type === 'weapon' || ref._type === 'armor') {
    return { path: '/gear/armor-weapons', query: { item: identifier } }
  }

  const categories = (ref.category ?? []).map((c) => c.toLowerCase())
  if (
    categories.includes('weapon') ||
    categories.includes('weapons') ||
    categories.includes('armor') ||
    categories.includes('armors')
  ) {
    return { path: '/gear/armor-weapons', query: { item: identifier } }
  }

  return { path: '/gear/items', query: { item: identifier } }
}

const highlightedKey = computed(() =>
  typeof route.query.pack === 'string' ? route.query.pack : ''
)

function toggleHighlight(pack: StartingPack) {
  const identifier = pack.key || pack._id
  router.replace({
    query: {
      ...route.query,
      pack: highlightedKey.value === identifier ? undefined : identifier,
    },
  })
}
</script>

<template>
  <div class="detail-page">
    <header class="page-header">
      <div>
        <h1>
          {{ currentLocale === 'pt' ? 'Pacotes Iniciais' : 'Starting Packs' }}
        </h1>
      </div>
    </header>

    <div v-if="pending" class="state-box">
      {{ currentLocale === 'pt' ? 'Carregando pacotes iniciais...' : 'Loading starting packs...' }}
    </div>

    <div v-else-if="error" class="state-box is-error">
      {{ currentLocale === 'pt' ? 'Erro ao carregar pacotes iniciais.' : 'Failed to load starting packs.' }}
    </div>

    <div v-else-if="d66Rows.length === 0" class="state-box">
      {{ currentLocale === 'pt' ? 'Nenhum pacote inicial encontrado.' : 'No starting packs found.' }}
    </div>

    <div v-else class="table-wrapper">
      <p class="intro-paragraph">
          <template v-if="currentLocale === 'pt'">
            Você pode escolher qualquer pacote que desejar, mas as Classes oferecem recomendações de Pacotes Iniciais na seção "Jogando" no começo da descrição da classe. Cada pacote gasta os 3 Au iniciais, listando o valor restante. Além dos itens listados, cada Pacote Inicial também inclui uma mochila, um saco de dormir, 5 dias de rações, 2 tochas e um odre. É esperado que você comece o jogo com pelo menos um conjunto de roupas casuais e uma bolsa, que não contam contra o seu dinheiro inicial.
          </template>
          <template v-else>
            You can choose any pack you like, but the Classes list recommended Starting Packs in their "Playing" section at the start of the Class description. Each pack spends the 3g, with remaining Wealth listed. In addition to the Items listed, each Starting Pack also includes a backpack, bedroll, 5 days of rations, 2 torches, and a waterskin. You are assumed to begin the game with at least one set of casual clothes and a pouch, which don't count against your Starting Wealth.
          </template>
        </p>

      <table class="d66-table">
        <thead>
          <tr>
            <th colspan="2" class="col-d66">d66</th>
            <th class="col-name">
              {{ currentLocale === 'pt' ? 'Nome' : 'Name' }}
            </th>
            <th class="col-items">
              {{ currentLocale === 'pt' ? 'Itens' : 'Items' }}
            </th>
            <th class="col-remaining">
              {{ currentLocale === 'pt' ? 'Dinheiro Restante' : 'Remaining Wealth' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in d66Rows"
            :key="row.pack._id"
            class="pack-row"
            :class="{
              'is-highlighted':
                highlightedKey &&
                (highlightedKey === row.pack.key || highlightedKey === row.pack._id),
              'is-block-start': row.isDie1Start && row.index > 0,
            }"
            @click="toggleHighlight(row.pack)"
          >
            <td
              v-if="row.isDie1Start"
              :rowspan="row.die1Span"
              class="cell-die-primary"
              :class="{ 'bg-zebra': row.die1 !== null && row.die1 % 2 === 0 }"
            >
              {{ row.die1 }}
            </td>
            <td
              v-else-if="row.die1 === null"
              class="cell-die-primary is-overflow"
            >
              –
            </td>

            <td class="cell-die-secondary">
              {{ row.die2 ?? '–' }}
            </td>

            <td class="cell-name">
              <span>{{ getPackDisplayName(row.pack) }}</span>
              <span v-if="row.pack.homebrew" class="hb-tag">HB</span>
            </td>

            <td class="cell-items">
              <template v-if="row.pack.items && row.pack.items.length > 0">
                <ul class="items-inline-list">
                  <li
                    v-for="(entry, idx) in row.pack.items"
                    :key="entry._key || `${row.pack._id}-${idx}`"
                    class="pack-item-entry"
                  >
                    <NuxtLink
                      v-if="entry.item && getItemRoute(entry)"
                      :to="getItemRoute(entry)!"
                      class="item-link"
                      @click.stop
                    >
                      {{ tText(entry.item.name) }}
                    </NuxtLink>
                    <span v-else-if="entry.item">
                      {{ tText(entry.item.name) }}
                    </span>
                    <span v-else-if="entry.note">
                      {{ tText(entry.note) }}
                    </span>

                    <span v-if="getEntryQuantity(entry)" class="item-qty">
                      ×{{ getEntryQuantity(entry) }}
                    </span>

                    <span v-if="entry.item && entry.note" class="item-note">
                      ({{ tText(entry.note) }})
                    </span>
                  </li>
                </ul>
              </template>
              <span v-else class="muted-dash">–</span>
            </td>

            <td class="cell-remaining">
              {{ formatPrice(row.remainingCopper) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.intro-paragraph {
  margin: 0 0 1rem 0;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  background-color: var(--bg-surface);
  padding: 1rem;
}

.d66-table {
  border: 1px solid var(--border-color);
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: left;
}

.d66-table th {
  padding: 0.25rem 0.5rem;
  background-color: var(--bg-inverse);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-inverse);
  white-space: nowrap;
}

.d66-table th:last-child {
  border-right: none;
}

.col-d66 {
  width: 5rem;
  text-align: center !important;
}

.col-remaining {
  text-align: right !important;
  white-space: nowrap;
}

.d66-table td {
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  color: var(--text-primary);
  vertical-align: middle;
}

.d66-table td:last-child {
  border-right: none;
}

.pack-row.is-block-start td {
  border-top: 2px solid var(--border-strong);
}

.pack-row:hover {
  background-color: var(--bg-hover);
}

.pack-row.is-highlighted {
  background-color: var(--accent-subtle);
}

.cell-die-primary,
.cell-die-secondary {
  width: 2.75rem;
}

.cell-die-primary {
  text-align: center;
  font-weight: 700;
  color: var(--accent-primary);
  background-color: var(--bg-surface);
  vertical-align: middle !important;
}

.cell-die-primary.bg-zebra {
  background-color: var(--bg-zebra);
}

.cell-die-primary.is-overflow {
  color: var(--text-muted);
}

.cell-die-secondary {
  text-align: center;
  font-weight: 650;
  color: var(--text-secondary);
}

.cell-name {
  font-weight: 650;
  white-space: nowrap;
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

.items-inline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.25rem;
}

.pack-item-entry {
  display: inline-flex;
  align-items: baseline;
  /* gap: 0.25rem; */
}

.pack-item-entry:not(:last-child)::after {
  content: ',';
  color: var(--text-muted);
}

.item-link {
  color: var(--text-heading);
  text-decoration: none;
}

.item-link:hover {
  text-decoration: underline;
}

.item-qty {
  color: var(--text-secondary);
}

.item-note {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.cell-remaining {
  text-align: right;
  white-space: nowrap;
}

.muted-dash {
  color: var(--text-muted);
}
</style>