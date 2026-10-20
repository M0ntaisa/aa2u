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
  <span class="cms-badge" :class="`cms-badge-${tone}`">
    <span v-if="dot" class="cms-badge-dot" />
    <slot />
  </span>
</template>
