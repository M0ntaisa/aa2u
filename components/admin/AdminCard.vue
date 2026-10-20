<script setup lang="ts">
import type { AdminIconName } from '~/utils/admin-icons'

withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: AdminIconName
  /** Drop the body padding — useful when the slot is a table or a list. */
  flush?: boolean
}>(), {
  flush: false,
})
</script>

<template>
  <section class="cms-panel">
    <header v-if="title || $slots.actions" class="cms-panel-head">
      <div class="min-w-0">
        <h2 v-if="title" class="cms-panel-title flex items-center gap-2">
          <AdminIcon v-if="icon" :name="icon" :size="14" class="text-[var(--ad-fg-subtle)]" />
          {{ title }}
        </h2>
        <p v-if="description" class="cms-panel-desc">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </header>

    <div :class="flush ? '' : 'cms-panel-body'">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="cms-panel-foot">
      <slot name="footer" />
    </footer>
  </section>
</template>
