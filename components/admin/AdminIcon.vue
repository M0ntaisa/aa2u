<script setup lang="ts">
import { adminIconPaths, type AdminIconName } from '~/utils/admin-icons'

const props = withDefaults(defineProps<{
  name: AdminIconName
  size?: number
  strokeWidth?: number
}>(), {
  size: 16,
  strokeWidth: 1.75,
})

const markup = computed(() => adminIconPaths[props.name] ?? '')
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
    v-html="markup"
  />
</template>
