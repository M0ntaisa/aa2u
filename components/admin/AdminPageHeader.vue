<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  /** Optional back link rendered above the title. */
  backTo?: string
  backLabel?: string
}>()
</script>

<template>
  <header class="mb-7">
    <NuxtLink
      v-if="backTo"
      :to="backTo"
      class="inline-flex items-center gap-1.5 text-xs text-[var(--ad-fg-subtle)] hover:text-[var(--ad-fg)] transition-colors mb-3"
    >
      <AdminIcon name="chevronLeft" :size="13" />
      {{ backLabel ?? 'Kembali' }}
    </NuxtLink>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="font-display text-[26px] leading-tight tracking-tight text-[var(--ad-fg)] truncate">
          {{ title }}
        </h1>
        <p v-if="description || $slots.meta" class="mt-1.5 text-[13px] text-[var(--ad-fg-muted)] flex flex-wrap items-center gap-x-2 gap-y-1">
          <span v-if="description">{{ description }}</span>
          <slot name="meta" />
        </p>
      </div>

      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
