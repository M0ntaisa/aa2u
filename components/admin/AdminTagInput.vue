<script setup lang="ts">
/**
 * Free-text tag list (e.g. team credits). Enter or comma adds a tag,
 * Backspace on an empty input removes the last one. `suggestions` feed a
 * native datalist so studio members can be picked quickly.
 */
const model = defineModel<string[]>({ required: true })

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  hint?: string
  suggestions?: string[]
  max?: number
}>(), {
  placeholder: 'Ketik lalu Enter',
  suggestions: () => [],
  max: 30,
})

const draft = ref('')
const listId = useId()

function add(raw = draft.value) {
  const values = raw.split(',').map(s => s.trim().slice(0, 120)).filter(Boolean)
  const next = [...model.value]
  for (const v of values) {
    if (next.length >= props.max) break
    if (!next.some(t => t.toLowerCase() === v.toLowerCase())) next.push(v)
  }
  model.value = next
  draft.value = ''
}

function removeAt(i: number) {
  model.value = model.value.filter((_, idx) => idx !== i)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    add()
  } else if (e.key === 'Backspace' && !draft.value && model.value.length) {
    removeAt(model.value.length - 1)
  }
}

/** Picking a datalist option fires a replacement input — add it right away. */
function onInput(e: Event) {
  const type = (e as InputEvent).inputType
  if ((!type || type === 'insertReplacementText') && props.suggestions.includes(draft.value)) add()
}

const remaining = computed(() => props.suggestions.filter(s => !model.value.includes(s)))
</script>

<template>
  <div>
    <span v-if="label" class="ad-label">{{ label }}</span>
    <div class="flex min-h-[var(--ad-control-h)] flex-wrap items-center gap-1.5 rounded-[var(--ad-radius-sm)] border border-[var(--ad-border)] bg-[var(--ad-surface-sunk)] px-2 py-1.5">
      <span
        v-for="(tag, i) in model"
        :key="tag"
        class="inline-flex items-center gap-1 rounded border border-[var(--ad-border-strong)] bg-[var(--ad-surface-hover)] py-0.5 pl-2 pr-1 text-[12px]"
      >
        {{ tag }}
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded text-[var(--ad-fg-subtle)] hover:text-[var(--ad-fg)]"
          :aria-label="`Hapus ${tag}`"
          @click="removeAt(i)"
        >
          <AdminIcon name="x" :size="11" />
        </button>
      </span>
      <input
        v-model="draft"
        type="text"
        :list="listId"
        :placeholder="model.length ? '' : placeholder"
        :aria-label="label || placeholder"
        class="min-w-[140px] flex-1 bg-transparent px-1 text-[13px] outline-none"
        @keydown="onKeydown"
        @input="onInput"
        @blur="draft && add()"
      />
      <datalist :id="listId">
        <option v-for="s in remaining" :key="s" :value="s" />
      </datalist>
    </div>
    <p v-if="hint" class="ad-hint">{{ hint }}</p>
  </div>
</template>
