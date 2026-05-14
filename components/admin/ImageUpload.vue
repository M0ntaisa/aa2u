<script setup lang="ts">
const model = defineModel<string | null | undefined>({ required: true })

const props = withDefaults(defineProps<{
  label?: string
  bucket: string
  folder?: string
  maxSizeMb?: number
  accept?: string[]
  aspect?: string
  hint?: string
}>(), {
  label: 'Gambar',
  folder: '',
  maxSizeMb: 5,
  accept: () => ['image/jpeg', 'image/png', 'image/webp'],
  aspect: 'aspect-[16/9]',
  hint: '',
})

const emit = defineEmits<{
  uploaded: [url: string]
  removed: []
}>()

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const status = ref<'idle' | 'uploading' | 'error'>('idle')
const progress = ref(0)
const errorMessage = ref('')

const acceptAttr = computed(() => props.accept.join(','))
const maxBytes = computed(() => props.maxSizeMb * 1024 * 1024)

const previewUrl = computed(() => model.value || '')

function pick() {
  if (status.value === 'uploading') return
  fileInput.value?.click()
}

function onChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) void upload(file)
  target.value = ''
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  if (status.value === 'uploading') return
  const file = e.dataTransfer?.files?.[0]
  if (file) void upload(file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function validate(file: File): string | null {
  if (!props.accept.includes(file.type)) {
    return `Format tidak didukung. Pakai: ${props.accept.map(a => a.split('/')[1]).join(', ')}`
  }
  if (file.size > maxBytes.value) {
    return `Ukuran maksimal ${props.maxSizeMb}MB (file ini ${(file.size / 1024 / 1024).toFixed(1)}MB)`
  }
  return null
}

function makeFilename(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const prefix = props.folder ? `${props.folder.replace(/^\/|\/$/g, '')}/` : ''
  return `${prefix}${id}.${ext}`
}

async function upload(file: File) {
  errorMessage.value = ''

  const validationError = validate(file)
  if (validationError) {
    status.value = 'error'
    errorMessage.value = validationError
    return
  }

  if (isPlaceholder) {
    status.value = 'error'
    errorMessage.value = 'Mode demo: aktifkan Supabase di .env untuk upload.'
    return
  }

  status.value = 'uploading'
  progress.value = 0

  const path = makeFilename(file)
  const { error } = await supabase.storage.from(props.bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  const { data } = supabase.storage.from(props.bucket).getPublicUrl(path)
  const url = data.publicUrl
  model.value = url
  emit('uploaded', url)
  status.value = 'idle'
}

function remove() {
  model.value = ''
  emit('removed')
  errorMessage.value = ''
  status.value = 'idle'
}
</script>

<template>
  <div class="space-y-2">
    <label class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
      {{ label }}
    </label>

    <div v-if="previewUrl" class="space-y-3">
      <div :class="aspect" class="overflow-hidden bg-white/5 max-w-md border border-white/10">
        <img :src="previewUrl" :alt="label" class="w-full h-full object-cover" />
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="text-xs uppercase tracking-[0.2em] border border-white/20 hover:border-white/60 px-4 py-2 transition-colors"
          :disabled="status === 'uploading'"
          @click="pick"
        >
          Ganti
        </button>
        <button
          type="button"
          class="text-xs uppercase tracking-[0.2em] border border-red-500/40 text-red-300 hover:bg-red-500/10 px-4 py-2 transition-colors"
          :disabled="status === 'uploading'"
          @click="remove"
        >
          Hapus
        </button>
      </div>
    </div>

    <div
      v-else
      :class="[
        aspect,
        'max-w-md border border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
        isDragging ? 'border-white/60 bg-white/5' : 'border-white/20 hover:border-white/40',
        status === 'uploading' ? 'opacity-60 cursor-wait' : '',
      ]"
      @click="pick"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div v-if="status === 'uploading'" class="text-sm text-[var(--color-muted)]">
        Mengunggah…
      </div>
      <template v-else>
        <div class="text-sm">
          <span class="underline">Pilih file</span>
          <span class="text-[var(--color-muted)]"> atau seret ke sini</span>
        </div>
        <div class="mt-2 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
          {{ accept.map(a => a.split('/')[1]).join(' · ') }} · maks {{ maxSizeMb }}MB
        </div>
      </template>
    </div>

    <input
      ref="fileInput"
      type="file"
      :accept="acceptAttr"
      class="hidden"
      @change="onChange"
    />

    <p v-if="hint" class="text-[10px] text-[var(--color-muted)]">{{ hint }}</p>
    <p v-if="status === 'error'" class="text-xs text-red-400">{{ errorMessage }}</p>
  </div>
</template>
