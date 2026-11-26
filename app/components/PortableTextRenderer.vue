<script setup lang="ts">
import { PortableText } from '@portabletext/vue'
import type { PortableTextBlock } from '@portabletext/types'

defineProps<{
  blocks: PortableTextBlock[] | null | undefined
}>()
</script>

<template>
  <div v-if="Array.isArray(blocks) && blocks.length > 0" class="portable-text">
    <PortableText :value="blocks" />
  </div>
</template>

<style scoped>
.portable-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.portable-text :deep(p) {
  margin: 0;
}

/* .portable-text :deep(p + p) {
  text-indent: 1.5em;
} */

.portable-text :deep(p + p:not(:has(> strong:first-child))) {
  text-indent: 1.5em;
}

.portable-text :deep(strong) {
  font-weight: 700;
  color: var(--text-heading);
}

.portable-text :deep(em) {
  font-style: italic;
}

.portable-text :deep(ul),
.portable-text :deep(ol) {
  padding-left: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

:deep(ul:has(> li > strong:first-child)) {
  list-style: none;
  padding-left: 0;
}
</style>