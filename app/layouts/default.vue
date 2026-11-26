<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePreferencesStore } from '~/stores/preferences'

const preferences = usePreferencesStore()
const { theme, locale } = storeToRefs(preferences)
const isSidebarOpen = ref(false)

useHead({
  htmlAttrs: {
    lang: computed(() => (locale.value === 'pt' ? 'pt-BR' : 'en')),
    'data-theme': computed(() => theme.value),
  },
})
</script>

<template>
  <div class="wiki-shell">
    <AppHeader @toggle-sidebar="isSidebarOpen = !isSidebarOpen" />

    <div class="wiki-body">
      <AppSidebar :is-open="isSidebarOpen" @close="isSidebarOpen = false" />

      <div
        v-if="isSidebarOpen"
        class="sidebar-backdrop"
        @click="isSidebarOpen = false"
      />

      <main class="wiki-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.wiki-shell {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wiki-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  overflow: hidden;
}

.wiki-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 860px) {
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: var(--header-height) 0 0 0;
    background-color: oklch(0 0 0 / 0.45);
    z-index: 30;
  }
}
</style>