<script setup lang="ts">
defineProps<{
  variant?: 'showcase' | 'grid'
}>()
</script>

<template>
  <div :class="variant === 'showcase' ? 'shrink-0 w-[80vw] md:w-auto' : 'w-full'">
    <div
      class="relative overflow-hidden aspect-[4/3] bg-white/[0.04] skeleton-pulse"
      :class="variant === 'showcase' ? 'md:h-[60vh] md:w-auto md:aspect-[4/3]' : ''"
    />
    <div class="mt-5 flex items-baseline justify-between gap-6">
      <div class="space-y-3 flex-1">
        <div class="h-7 md:h-9 w-2/3 bg-white/[0.06] skeleton-pulse rounded-sm" />
        <div class="h-3 w-1/3 bg-white/[0.04] skeleton-pulse rounded-sm" />
      </div>
      <div class="h-3 w-20 bg-white/[0.04] skeleton-pulse rounded-sm" />
    </div>
  </div>
</template>

