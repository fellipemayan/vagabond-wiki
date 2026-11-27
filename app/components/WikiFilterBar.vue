<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    collapsible?: boolean
    defaultCollapsed?: boolean
    hasActiveFilters?: boolean
    activeCount?: number
    resetLabel?: string
    showHomebrewToggle?: boolean,
  }>(),
  {
    title: 'Filtros',
    collapsible: true,
    defaultCollapsed: false,
    hasActiveFilters: false,
    activeCount: 0,
    resetLabel: 'Limpar filtros',
    showHomebrewToggle: true,
  }
)

const emit = defineEmits<{
  reset: []
}>()

const isCollapsed = ref(props.collapsible ? props.defaultCollapsed : false)
const { showHomebrew } = storeToRefs(usePreferencesStore())
const { locale } = useWikiI18n()

function toggleCollapse() {
  if (!props.collapsible) return
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <section class="wiki-filter-bar" :class="{ 'is-collapsed': isCollapsed }">
    <header class="filter-bar-header">
      <button
        v-if="collapsible"
        type="button"
        class="filter-toggle-btn"
        :aria-expanded="!isCollapsed"
        @click="toggleCollapse"
      >
        <span class="filter-chevron">{{ isCollapsed ? '▸' : '▾' }}</span>
        <span class="filter-bar-title">{{ title }}</span>
        <span v-if="activeCount > 0" class="filter-active-badge">
          {{ activeCount }}
        </span>
      </button>

      <div v-else class="filter-bar-static-title">
        <span class="filter-bar-title">{{ title }}</span>
        <span v-if="activeCount > 0" class="filter-active-badge">
          {{ activeCount }}
        </span>
      </div>

      <button
        v-if="hasActiveFilters"
        type="button"
        class="filter-reset-btn"
        @click="emit('reset')"
      >
        {{ resetLabel }}
      </button>
    </header>

    <div v-show="!isCollapsed" class="filter-bar-body">
      <slot />
      <label v-if="showHomebrewToggle" class="homebrew-toggle">
        <input
          type="checkbox"
          :checked="!showHomebrew"
          @change="showHomebrew = !($event.target as HTMLInputElement).checked"
        />
        <span>{{ locale === 'pt' ? 'Ocultar homebrew' : 'Hide homebrew' }}</span>
      </label>
    </div>
  </section>

</template>

<style>
.wiki-filter-bar {
  border-bottom: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.wiki-filter-bar.is-collapsed {
  gap: 0;
}

.filter-bar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2rem;
}

.filter-toggle-btn,
.filter-bar-static-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: none;
  border: none;
  padding: 0;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-toggle-btn {
  flex: 1;
  cursor: pointer;
}

.filter-toggle-btn:hover {
  color: var(--text-primary);
}

.select-chip {
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: none;
  background-color: var(--bg-subtle);
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.select-chip:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.select-chip.is-active {
  background-color: var(--accent-subtle);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

.filter-chevron {
  color: var(--accent-secondary);
  font-size: 0.85rem;
  line-height: 1;
}

.filter-active-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.08rem 0.45rem;
  border-radius: 999px;
  background-color: var(--accent-subtle);
  color: var(--text-primary);
}

.filter-reset-btn {
  height: 1.85rem;
  padding: 0 0.7rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background-color: var(--bg-subtle);
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.filter-reset-btn:hover {
  background-color: var(--bg-hover);
}

.filter-bar-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-top: 0.15rem;
}

.homebrew-toggle {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>