<script setup lang="ts">
import type { I18nList } from '~/types/content'

const model = defineModel<I18nList | null | undefined>({ required: true })

defineProps<{
  label: string
  rows?: number
}>()

const value = computed<I18nList>(() => model.value ?? { id: [], en: [] })

const toText = (arr: string[] | undefined | null) => (arr ?? []).join('\n')
const fromText = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)

function update(lang: 'id' | 'en', v: string) {
  model.value = { ...value.value, [lang]: fromText(v) }
}

const langs = [
  { key: 'id' as const, label: 'ID' },
  { key: 'en' as const, label: 'EN' },
]

const count = (lang: 'id' | 'en') => (value.value[lang] ?? []).length
</script>

<template>
  <div>
    <div class="mb-1.5 flex items-baseline justify-between gap-3">
      <span class="cms-label cms-label-inline">{{ label }}</span>
      <span class="text-[11px] text-[var(--ad-fg-subtle)]">Satu item per baris</span>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div v-for="lang in langs" :key="lang.key">
        <div class="mb-1 flex items-center gap-1.5">
          <span class="cms-eyebrow">{{ lang.label }}</span>
          <span class="ml-auto text-[10px] tabular-nums text-[var(--ad-fg-subtle)]">
            {{ count(lang.key) }} item
          </span>
        </div>
        <textarea
          :value="toText(value[lang.key])"
          :rows="rows ?? 4"
          class="cms-textarea"
          @input="update(lang.key, ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
  </div>
</template>
