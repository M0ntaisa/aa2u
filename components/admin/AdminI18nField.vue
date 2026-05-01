<script setup lang="ts">
import type { I18nField } from '~/types/content'

const model = defineModel<I18nField | null | undefined>({ required: true })

defineProps<{
  label: string
  type?: 'text' | 'textarea'
  rows?: number
  required?: boolean
  placeholder?: string
}>()

const value = computed<I18nField>(() => model.value ?? { id: '', en: '' })

function update(lang: 'id' | 'en', v: string) {
  model.value = { ...value.value, [lang]: v }
}
</script>

<template>
  <div class="space-y-2">
    <label class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
      {{ label }}<span v-if="required" class="text-red-400 ml-1">*</span>
    </label>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <span class="block text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">ID</span>
        <input
          v-if="type !== 'textarea'"
          :value="value.id"
          type="text"
          :placeholder="placeholder"
          :required="required"
          class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
          @input="update('id', ($event.target as HTMLInputElement).value)"
        />
        <textarea
          v-else
          :value="value.id"
          :rows="rows ?? 4"
          :placeholder="placeholder"
          class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm resize-y rounded-sm"
          @input="update('id', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
      <div>
        <span class="block text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">EN</span>
        <input
          v-if="type !== 'textarea'"
          :value="value.en"
          type="text"
          :placeholder="placeholder"
          class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
          @input="update('en', ($event.target as HTMLInputElement).value)"
        />
        <textarea
          v-else
          :value="value.en"
          :rows="rows ?? 4"
          :placeholder="placeholder"
          class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm resize-y rounded-sm"
          @input="update('en', ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>
  </div>
</template>
