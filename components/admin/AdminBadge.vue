<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
  dot?: boolean
}>(), {
  tone: 'neutral',
  dot: false,
})
</script>

<template>
  <span class="ad-badge" :class="`ad-badge-${tone}`">
    <span v-if="dot" class="ad-badge-dot" />
    <slot />
  </span>
</template>
