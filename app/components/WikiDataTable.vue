<script setup lang="ts" generic="T extends Record<string, any>">
export interface WikiTableColumn<RowType = any> {
  key: string
  label: string
  sortable?: boolean
  nowrap?: boolean
  bold?: boolean
  align?: 'left' | 'center' | 'right'
  sortValue?: (row: RowType) => string | number
}

const props = withDefaults(
  defineProps<{
    title?: string
    count?: number
    columns: WikiTableColumn<T>[]
    rows: T[]
    rowKey?: string | ((row: T) => string)
    highlightedId?: string
    clickableRows?: boolean
    emptyText?: string
    sortField?: string
    sortDirection?: 'asc' | 'desc'
    locale?: 'pt' | 'en'
  }>(),
  {
    title: '',
    count: undefined,
    rowKey: '_id',
    highlightedId: '',
    clickableRows: false,
    emptyText: 'Nenhum registro encontrado.',
    sortField: '',
    sortDirection: 'asc',
    locale: 'pt',
  }
)

const emit = defineEmits<{
  'row-click': [row: T]
  sort: [field: string]
}>()

const internalSortField = ref('')
const internalSortDirection = ref<'asc' | 'desc'>('asc')

const isControlledSort = computed(() => Boolean(props.sortField))

const activeSortField = computed(() =>
  isControlledSort.value ? props.sortField : internalSortField.value
)

const activeSortDirection = computed(() =>
  isControlledSort.value ? props.sortDirection : internalSortDirection.value
)

function handleSortClick(col: WikiTableColumn<T>) {
  if (!col.sortable) return

  if (isControlledSort.value) {
    emit('sort', col.key)
    return
  }

  if (internalSortField.value === col.key) {
    internalSortDirection.value =
      internalSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    internalSortField.value = col.key
    internalSortDirection.value = 'asc'
  }
}

function getSortIndicator(col: WikiTableColumn<T>): string {
  if (activeSortField.value !== col.key) return '⇅'
  return activeSortDirection.value === 'asc' ? '↑' : '↓'
}

const sortedRows = computed<T[]>(() => {
  if (isControlledSort.value || !internalSortField.value) {
    return props.rows
  }

  const col = props.columns.find((c) => c.key === internalSortField.value)
  if (!col) return props.rows

  const dir = internalSortDirection.value === 'asc' ? 1 : -1
  const loc = props.locale === 'pt' ? 'pt-BR' : 'en'

  return [...props.rows].sort((a, b) => {
    const valA = col.sortValue ? col.sortValue(a) : a[col.key]
    const valB = col.sortValue ? col.sortValue(b) : b[col.key]

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * dir
    }

    return String(valA ?? '').localeCompare(String(valB ?? ''), loc) * dir
  })
})

function resolveRowKey(row: T, index: number): string {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  return String(row[props.rowKey] ?? index)
}

function isRowHighlighted(row: T): boolean {
  if (!props.highlightedId) return false
  return row.key === props.highlightedId || row._id === props.highlightedId
}
</script>

<template>
  <section class="wiki-table-section">
    <header v-if="title" class="wiki-table-header">
      <h2 class="wiki-table-title">{{ title }}</h2>
      <span v-if="typeof count === 'number'" class="wiki-table-count">
        {{ count }}
      </span>
    </header>

    <div class="wiki-table-wrapper">
      <table v-if="sortedRows.length > 0" class="wiki-data-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="{ textAlign: col.align ?? 'left' }"
            >
              <button
                v-if="col.sortable"
                type="button"
                class="wiki-sort-btn"
                @click="handleSortClick(col)"
              >
                <span>{{ col.label }}</span>
                <span class="wiki-sort-icon">{{ getSortIndicator(col) }}</span>
              </button>
              <span v-else>{{ col.label }}</span>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, idx) in sortedRows"
            :key="resolveRowKey(row, idx)"
            class="wiki-table-row"
            :class="{
              'is-clickable': clickableRows,
              'is-highlighted': isRowHighlighted(row),
            }"
            @click="clickableRows && emit('row-click', row)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="{
                'is-nowrap': col.nowrap,
                'is-bold': col.bold,
              }"
              :style="{ textAlign: col.align ?? 'left' }"
            >
              <slot
                :name="`cell-${col.key}`"
                :row="row"
                :value="row[col.key]"
              >
                {{ row[col.key] ?? '–' }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="wiki-empty-table">
        {{ emptyText }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.wiki-table-section {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
}

.wiki-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.wiki-table-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-heading);
}

.wiki-table-count {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  background-color: var(--accent-subtle);
  color: var(--text-primary);
}

.wiki-table-wrapper {
  width: 100%;
  overflow-x: auto;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
}

.wiki-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  text-align: left;
}

.wiki-data-table th {
  padding: 0.25rem 0.5rem;
  background-color: var(--bg-inverse);
  border-bottom: 1px solid var(--border-strong);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-inverse);
  white-space: nowrap;
}

.wiki-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.25rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

.wiki-sort-btn:hover {
  color: var(--accent-primary);
}

.wiki-sort-icon {
  font-size: 0.78rem;
  opacity: 0.8;
}

.wiki-data-table td {
  padding: 0.25rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  vertical-align: middle;
}

.wiki-table-row {
  transition: background-color 0.12s ease;
}

.wiki-table-row.is-clickable {
  cursor: pointer;
}

.wiki-table-row:hover {
  background-color: color-mix(in oklch, currentColor 7%, transparent);
}

.wiki-table-row.is-highlighted {
  background-color: var(--accent-subtle);
}

.is-nowrap {
  white-space: nowrap;
}

.is-bold {
  font-weight: 650;
}

.wiki-empty-table {
  padding: 1.25rem;
  text-align: center;
  font-size: 0.88rem;
  color: var(--text-muted);
}
</style>