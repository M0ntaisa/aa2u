<script setup lang="ts">
defineProps<{
  number?: string
  label?: string
  title: string
}>()
</script>

<template>
  <div class="flex flex-col gap-3 mb-12">
    <div v-if="number || label" class="flex items-baseline gap-4 text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
      <span v-if="number">N°{{ number }}</span>
      <span v-if="label">{{ label }}</span>
    </div>
    <h2 class="font-display text-4xl md:text-6xl tracking-tight leading-[1]">
      {{ title }}
    </h2>
  </div>
</template>
