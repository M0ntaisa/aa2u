<script setup lang="ts">
import { NuxtLink } from '#components'
import type { AdminIconName } from '~/utils/admin-icons'

defineProps<{
  label: string
  value: number | string
  icon: AdminIconName
  to?: string
  hint?: string
  tone?: 'neutral' | 'accent' | 'success' | 'warning'
}>()

const toneClass: Record<string, string> = {
  neutral: 'text-[var(--ad-fg-muted)] bg-[rgba(255,255,255,0.05)]',
  accent: 'text-[var(--ad-accent)] bg-[rgba(122,162,247,0.12)]',
  success: 'text-[var(--ad-success)] bg-[rgba(130,217,165,0.12)]',
  warning: 'text-[var(--ad-warning)] bg-[rgba(224,175,104,0.12)]',
}
</script>

<template>
  <component
    :is="to ? NuxtLink : 'div'"
    :to="to"
    class="ad-panel group block p-5 transition-colors"
    :class="to ? 'hover:border-[var(--ad-border-strong)] hover:bg-[var(--ad-surface-hover)]' : ''"
  >
    <div class="flex items-start justify-between gap-3">
      <span class="ad-eyebrow">{{ label }}</span>
      <span
        class="flex h-7 w-7 items-center justify-center rounded-md"
        :class="toneClass[tone ?? 'neutral']"
      >
        <AdminIcon :name="icon" :size="15" />
      </span>
    </div>

    <div class="mt-3 font-display text-[32px] leading-none tracking-tight tabular-nums text-[var(--ad-fg)]">
      {{ value }}
    </div>

    <div class="mt-2 flex items-center gap-1 text-[11.5px] text-[var(--ad-fg-subtle)]">
      <span>{{ hint }}</span>
      <AdminIcon
        v-if="to"
        name="arrowRight"
        :size="12"
        class="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  </component>
</template>
