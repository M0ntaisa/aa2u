<script setup lang="ts">
/**
 * Label + control + hint/error wrapper. Pass the control through the default
 * slot (`<input class="cms-input">`, `<select class="cms-select">`, …) so the
 * field owns spacing and messaging while the control stays plain markup.
 */
defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  /** Right-aligned helper next to the label, e.g. a character counter. */
  suffix?: string
}>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="flex items-baseline justify-between gap-3">
      <span class="cms-label" :class="required ? 'cms-label-req' : ''">{{ label }}</span>
      <span v-if="suffix" class="cms-label text-[var(--ad-fg-subtle)]">{{ suffix }}</span>
    </span>

    <slot />

    <p v-if="error" class="cms-error-text mt-1.5">{{ error }}</p>
    <p v-else-if="hint" class="cms-hint">{{ hint }}</p>
  </label>
</template>
