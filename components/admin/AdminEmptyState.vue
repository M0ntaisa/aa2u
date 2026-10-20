<script setup lang="ts">
import type { AdminIconName } from '~/utils/admin-icons'

withDefaults(defineProps<{
  icon?: AdminIconName
  title: string
  description?: string
  /** Dashed border reads as "nothing here yet" rather than "a panel". */
  dashed?: boolean
}>(), {
  icon: 'layers',
  dashed: true,
})
</script>

<template>
  <div
    class="rounded-[var(--ad-radius)] px-6 py-14 text-center"
    :class="dashed
      ? 'border border-dashed border-[var(--ad-border-strong)] bg-[rgba(255,255,255,0.012)]'
      : 'cms-panel'"
  >
    <div class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ad-border)] bg-[var(--ad-surface-hover)] text-[var(--ad-fg-subtle)]">
      <AdminIcon :name="icon" :size="19" />
    </div>
    <p class="text-sm font-medium text-[var(--ad-fg)]">{{ title }}</p>
    <p v-if="description" class="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-[var(--ad-fg-subtle)]">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-5 flex items-center justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
