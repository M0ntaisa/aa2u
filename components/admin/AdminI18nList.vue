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
</script>

<template>
  <div class="space-y-2">
    <label class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
      {{ label }}
    </label>
    <p class="text-[10px] text-[var(--color-muted)]">Satu item per baris</p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <span class="block text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">ID</span>
        <textarea
          :value="toText(value.id)"
          :rows="rows ?? 4"
          class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm resize-y rounded-sm"
          @input="update('id', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
      <div>
        <span class="block text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">EN</span>
        <textarea
          :value="toText(value.en)"
          :rows="rows ?? 4"
          class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm resize-y rounded-sm"
          @input="update('en', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
  </div>
</template>
