<script setup lang="ts">
import { useWikiI18n } from '~/composables/useWikiI19n';
import type { Locale } from '~/utils/i18n'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const { locale } = useWikiI18n()
const preferences = usePreferencesStore()
const { theme } = storeToRefs(preferences)

interface NavItem {
  label: Record<Locale, string>
  to: string
}

interface NavGroup {
  id: string
  title: Record<Locale, string>
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    id: 'heroes',
    title: { pt: 'Heróis', en: 'Heroes' },
    items: [
      { label: { pt: 'Ancestralidades', en: 'Ancestries' }, to: '/heroes/ancestries' },
      { label: { pt: 'Classes', en: 'Classes' }, to: '/heroes/classes' },
      { label: { pt: 'Talentos', en: 'Perks' }, to: '/heroes/perks' },
    ],
  },
  {
    id: 'gear',
    title: { pt: 'Equipamentos', en: 'Gear' },
    items: [
      { label: { pt: 'Itens', en: 'Items' }, to: '/gear/items' },
      { label: { pt: 'Pacotes Iniciais', en: 'Starting Packs' }, to: '/gear/starting-packs' },
      { label: { pt: 'Armas e Armaduras', en: 'Armor & Weapons' }, to: '/gear/armor-weapons' },
      { label: { pt: 'Itens alquímicos', en: 'Alchemical items' }, to: '/gear/alchemicals' },
    ],
  },
  {
    id: 'magic',
    title: { pt: 'Magia', en: 'Spells' },
    items: [
      // { label: { pt: 'Entregas de Magia', en: 'Spell Deliveries' }, to: '/magic/deliveries' },
      { label: { pt: 'Magias', en: 'Spells' }, to: '/magic/spells' },
      // { label: { pt: 'Relíquias', en: 'Relics' }, to: '/magic/relics' },
    ],
  },
]

const openGroups = ref<Record<string, boolean>>({
  heroes: true,
  gear: true,
  magic: true,
})

function toggleGroup(id: string) {
  openGroups.value[id] = !openGroups.value[id]
}
</script>

<template>
  <aside class="wiki-sidebar" :class="{ 'is-open': isOpen }">
    <nav class="wiki-sidebar-nav" aria-label="Menu principal">
      <section v-for="group in navGroups" :key="group.id" class="nav-group">
        <button
          type="button"
          class="nav-group-toggle"
          :aria-expanded="openGroups[group.id]"
          @click="toggleGroup(group.id)"
        >
          <span>{{ group.title[locale] }}</span>
          <hr class="divider">
          <span class="nav-group-chevron" :class="{ 'is-collapsed': !openGroups[group.id] }">
            ▾
          </span>
        </button>

        <ul v-show="openGroups[group.id]" class="nav-group-list">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="nav-link"
              :class="{ 'is-active': route.path === item.to }"
              @click="emit('close')"
            >
              {{ item.label[locale] }}
            </NuxtLink>
          </li>
        </ul>
      </section>
    </nav>
    <div class="sidebar-footer">
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
  </aside>
</template>

<style scoped >
.wiki-sidebar {
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background-color: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  height: calc(100vh - var(--header-height));
  position: sticky;
  top: var(--header-height);
  overflow-y: auto;
}

.wiki-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nav-group-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  /* justify-content: space-between; */
  padding: 0.4rem 0.6rem;
  background: var(--bg-inverse);
  border: none;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-inverse);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.nav-group-chevron {
  transition: transform 0.15s ease;
}

.nav-group-chevron.is-collapsed {
  transform: rotate(-90deg);
}

.nav-group-list {
  list-style: none;
  margin: 0.35rem 0 0;
  padding-inline: 0.5rem;
  display: flex;
  flex-direction: column;
}

.nav-link {
  display: block;
  padding: 0.5rem;
  line-height: 1;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.nav-link:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.nav-link.is-active {
  background-color: var(--accent-primary);
  color: var(--text-primary);
  font-weight: 600;
}

.sidebar-footer {
  display: none;
}

@media (max-width: 860px) {
  .wiki-sidebar {
    position: fixed;
    top: var(--header-height);
    left: 0;
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .wiki-sidebar.is-open {
    transform: translateX(0);
  }

  .sidebar-footer {
    margin-top: auto;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.45rem;
  } 
}
</style>