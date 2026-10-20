<script setup lang="ts">
import type { I18nField } from '~/types/content'

const model = defineModel<I18nField | null | undefined>({ required: true })

const props = defineProps<{
  label: string
  type?: 'text' | 'textarea'
  rows?: number
  required?: boolean
  placeholder?: string
  hint?: string
}>()

const value = computed<I18nField>(() => model.value ?? { id: '', en: '' })

function update(lang: 'id' | 'en', v: string) {
  model.value = { ...value.value, [lang]: v }
}

/** Copies ID → EN so a translator has something to edit instead of a blank box. */
function mirrorToEn() {
  if (!value.value.id) return
  update('en', value.value.id)
}

const enMissing = computed(() => !!value.value.id && !value.value.en)

const langs = [
  { key: 'id' as const, label: 'ID', hint: 'Bahasa Indonesia' },
  { key: 'en' as const, label: 'EN', hint: 'English' },
]
</script>

<template>
  <div>
    <div class="mb-1.5 flex items-baseline justify-between gap-3">
      <span class="cms-label cms-label-inline" :class="required ? 'cms-label-req' : ''">{{ label }}</span>
      <button
        v-if="enMissing"
        type="button"
        class="text-[11px] text-[var(--ad-accent)] transition-opacity hover:opacity-80"
        @click="mirrorToEn"
      >
        Salin ID → EN
      </button>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div v-for="lang in langs" :key="lang.key">
        <div class="mb-1 flex items-center gap-1.5">
          <span class="cms-eyebrow">{{ lang.label }}</span>
          <span class="text-[10px] text-[var(--ad-fg-subtle)] opacity-70">{{ lang.hint }}</span>
          <span
            v-if="lang.key === 'en' && enMissing"
            class="ml-auto text-[10px] text-[var(--ad-warning)]"
          >
            kosong
          </span>
        </div>

        <input
          v-if="props.type !== 'textarea'"
          :value="value[lang.key]"
          type="text"
          :placeholder="placeholder"
          :required="required && lang.key === 'id'"
          class="cms-input"
          @input="update(lang.key, ($event.target as HTMLInputElement).value)"
        />
        <textarea
          v-else
          :value="value[lang.key]"
          :rows="rows ?? 4"
          :placeholder="placeholder"
          class="cms-textarea"
          @input="update(lang.key, ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>

    <p v-if="hint" class="cms-hint">{{ hint }}</p>
  </div>
</template>
