<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'
import { useGlobalSearch, type GlobalSearchHit } from '~/composables/useGlobalSearch'
import { useWikiI18n } from '~/composables/useWikiI19n'

const emit = defineEmits<{
  toggleSidebar: []
}>()

const preferences = usePreferencesStore()
const { locale, theme } = storeToRefs(preferences)
const { tText } = useWikiI18n()
const { searchTerm, results, isSearching, resolveHitRoute } = useGlobalSearch()

const isDropdownOpen = ref(false)
const isMobileSearchOpen = ref(false)
const searchContainerRef = ref<HTMLElement | null>(null)
const mobileSearchInputRef = ref<HTMLInputElement | null>(null)

const typeLabels: Record<GlobalSearchHit['_type'], { pt: string; en: string }> = {
  alchemical: { pt: 'Item alquímico', en: 'Alchemical'},
  ancestry: { pt: 'Ancestralidade', en: 'Ancestry' },
  class: { pt: 'Classe', en: 'Class' },
  perk: { pt: 'Talento', en: 'Perk' },
  spell: { pt: 'Magia', en: 'Spell' },
  spellDelivery: { pt: 'Entrega', en: 'Delivery' },
  gear: { pt: 'Equipamento', en: 'Gear' },
}

async function openMobileSearch() {
  isMobileSearchOpen.value = true
  isDropdownOpen.value = true
  await nextTick()
  mobileSearchInputRef.value?.focus()
}

function closeMobileSearch() {
  isMobileSearchOpen.value = false
  isDropdownOpen.value = false
}

function handleSelectResult() {
  isDropdownOpen.value = false
  isMobileSearchOpen.value = false
  searchTerm.value = ''
}

function handleClickOutside(event: MouseEvent) {
  if (searchContainerRef.value && !searchContainerRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false
    isMobileSearchOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <header class="wiki-header">
    <div class="header-left">
      <button
        type="button"
        class="icon-btn mobile-menu-btn"
        aria-label="Abrir menu"
        @click="emit('toggleSidebar')"
      >
        ☰
      </button>

      <NuxtLink to="/" class="brand-link">
        <span class="brand-title">VagaTools</span>
        <span class="brand-badge">V1.3</span>
      </NuxtLink>
    </div>

    <div ref="searchContainerRef" class="header-search">
      <input
        v-model="searchTerm"
        type="search"
        class="search-input"
        :placeholder="
          locale === 'pt'
            ? 'Buscar ancestralidades, classes, magias, itens...'
            : 'Search ancestries, classes, spells, gear...'
        "
        @focus="isDropdownOpen = true"
        @keydown.esc="isDropdownOpen = false"
      />

      <div v-if="isDropdownOpen && searchTerm.trim().length >= 2" class="search-dropdown">
        <div v-if="isSearching" class="search-status">
          {{ locale === 'pt' ? 'Buscando...' : 'Searching...' }}
        </div>

        <div v-else-if="results.length === 0" class="search-status">
          {{ locale === 'pt' ? 'Nenhum resultado encontrado.' : 'No results found.' }}
        </div>

        <ul v-else class="search-results-list">
          <li v-for="hit in results" :key="hit._id">
            <NuxtLink
              :to="resolveHitRoute(hit)"
              class="search-result-item"
              @click="handleSelectResult"
            >
              <span class="result-name">{{ tText(hit.name) }}</span>
              <span class="result-type">{{ typeLabels[hit._type][locale] }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>

      <button
        type="button"
        class="icon-btn mobile-search-btn"
        :aria-label="locale === 'pt' ? 'Abrir busca' : 'Open search'"
        :aria-expanded="isMobileSearchOpen"
        @click.stop="isMobileSearchOpen ? closeMobileSearch() : openMobileSearch()"
      >
        &#x1F50E;&#xFE0E;
      </button>

      <div
        v-if="isMobileSearchOpen"
        class="mobile-search-popover"
        role="dialog"
        :aria-label="locale === 'pt' ? 'Buscar' : 'Search'"
        @keydown.esc="closeMobileSearch"
      >
        <input
          ref="mobileSearchInputRef"
          v-model="searchTerm"
          type="search"
          class="search-input"
          :placeholder="
            locale === 'pt'
              ? 'Buscar ancestralidades, classes, magias, itens...'
              : 'Search ancestries, classes, spells, gear...'
          "
          @focus="isDropdownOpen = true"
        />

        <div v-if="searchTerm.trim().length >= 2" class="mobile-search-results">
          <div v-if="isSearching" class="search-status">
            {{ locale === 'pt' ? 'Buscando...' : 'Searching...' }}
          </div>

          <div v-else-if="results.length === 0" class="search-status">
            {{ locale === 'pt' ? 'Nenhum resultado encontrado.' : 'No results found.' }}
          </div>

          <ul v-else class="search-results-list">
            <li v-for="hit in results" :key="hit._id">
              <NuxtLink
                :to="resolveHitRoute(hit)"
                class="search-result-item"
                @click="handleSelectResult"
              >
                <span class="result-name">{{ tText(hit.name) }}</span>
                <span class="result-type">{{ typeLabels[hit._type][locale] }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="header-actions">
      <button
        type="button"
        class="action-pill"
        :title="locale === 'pt' ? 'Alternar idioma' : 'Switch language'"
        @click="preferences.toggleLocale"
      >
        {{ locale === 'pt' ? 'PT-BR' : 'EN' }}
      </button>

      <button
        type="button"
        class="action-pill"
        :title="locale === 'pt' ? 'Alternar tema' : 'Toggle theme'"
        @click="preferences.toggleTheme"
      >
        {{ theme === 'dark' ? '☀' : '☾' }}
      </button>
    </div>
  </header>
</template>

<style>
.wiki-header {
  height: var(--header-height);
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1rem;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.mobile-menu-btn {
  display: none;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
  font-size: 1.05rem;
}

.brand-badge {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  background-color: var(--accent-subtle);
  color: var(--text-primary);
}

.header-search {
  position: relative;
  flex: 1;
  max-width: 34rem;
}

.mobile-search-btn,
.mobile-search-popover {
  display: none;
}

.search-input {
  width: 100%;
  height: 2.15rem;
  padding: 0 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-size: 0.88rem;
}

.search-input:focus {
  outline: 2px solid var(--accent-primary);
  outline-offset: -1px;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  max-height: 22rem;
  overflow-y: auto;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px oklch(0 0 0 / 0.25);
}

.search-status {
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.search-results-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem;
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.65rem;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
}

.search-result-item:hover {
  background-color: var(--bg-hover);
}

.result-type {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.action-pill,
.icon-btn {
  height: 2rem;
  padding: 0 0.65rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background-color: var(--bg-subtle);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.action-pill:hover,
.icon-btn:hover {
  background-color: var(--bg-hover);
}

@media (max-width: 860px) {
  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* .header-actions,
  .header-search > .search-input,
  .header-search > .search-dropdown {
    display: none;
  } */

  .header-search {
    flex: 0 0 auto;
    max-width: none;
    position: static;
  }

  .mobile-search-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-search-popover {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    position: fixed;
    top: calc(var(--header-height) + 0.4rem);
    left: 0.75rem;
    right: 0.75rem;
    z-index: 60;
    padding: 0.5rem;
    background-color: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    box-shadow: 0 10px 25px oklch(0 0 0 / 0.25);
  }

  .mobile-search-results {
    max-height: 18rem;
    overflow-y: auto;
  }
}
</style>