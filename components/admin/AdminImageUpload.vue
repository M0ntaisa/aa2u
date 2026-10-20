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
  /** Extra check run AFTER the type/size check (so huge files are never read), e.g. SVG sanitising. */
  validateFile?: (file: File) => string | null | Promise<string | null>
  /** Specific message for a rejected MIME type, e.g. { 'application/pdf': 'Ekspor ke PNG dulu' }. */
  typeHints?: Record<string, string>
  /** Preview fit: 'cover' for photos, 'contain' for drawings. */
  fit?: 'cover' | 'contain'
}>(), {
  label: 'Gambar',
  folder: '',
  maxSizeMb: 5,
  accept: () => ['image/jpeg', 'image/png', 'image/webp'],
  aspect: 'aspect-[16/9]',
  hint: '',
  validateFile: undefined,
  typeHints: () => ({}),
  fit: 'cover',
})

const emit = defineEmits<{
  uploaded: [url: string]
  removed: []
}>()

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const status = ref<'idle' | 'uploading' | 'error'>('idle')
const errorMessage = ref('')

const acceptAttr = computed(() => props.accept.join(','))
const maxBytes = computed(() => props.maxSizeMb * 1024 * 1024)
const previewUrl = computed(() => model.value || '')
const formatList = computed(() => props.accept.map(a => a.split('/')[1]).join(' · '))

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
    const hint = props.typeHints[file.type]
      ?? (/\.pdf$/i.test(file.name) ? props.typeHints['application/pdf'] : undefined)
    if (hint) return hint
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

  const validationError = validate(file) || (await props.validateFile?.(file)) || null
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

  const path = makeFilename(file)
  const { error } = await supabase.storage.from(props.bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    toast.error('Upload gagal', error.message)
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
  <div>
    <span class="cms-label">{{ label }}</span>

    <div v-if="previewUrl" class="space-y-2.5">
      <div
        :class="aspect"
        class="max-w-md overflow-hidden rounded-[var(--ad-radius-sm)] border border-[var(--ad-border)] bg-[var(--ad-surface-sunk)]"
      >
        <img :src="previewUrl" :alt="label" class="h-full w-full" :class="fit === 'contain' ? 'object-contain' : 'object-cover'" />
      </div>
      <div class="flex items-center gap-2">
        <AdminButton
          variant="secondary"
          size="sm"
          icon="refresh"
          :disabled="status === 'uploading'"
          @click="pick"
        >
          Ganti
        </AdminButton>
        <AdminButton
          variant="danger"
          size="sm"
          icon="trash"
          :disabled="status === 'uploading'"
          @click="remove"
        >
          Hapus
        </AdminButton>
      </div>
    </div>

    <button
      v-else
      type="button"
      :class="[
        aspect,
        'flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-[var(--ad-radius-sm)] border border-dashed text-center transition-colors',
        isDragging
          ? 'border-[var(--ad-accent)] bg-[rgba(122,162,247,0.07)]'
          : 'border-[var(--ad-border-strong)] bg-[var(--ad-surface-sunk)] hover:border-[var(--ad-accent)]',
        status === 'uploading' ? 'cursor-wait opacity-60' : '',
      ]"
      @click="pick"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <template v-if="status === 'uploading'">
        <AdminIcon name="loader" :size="20" class="cms-spin text-[var(--ad-accent)]" />
        <span class="mt-2.5 text-[13px] text-[var(--ad-fg-muted)]">Mengunggah…</span>
      </template>

      <template v-else>
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ad-surface-hover)] text-[var(--ad-fg-subtle)]">
          <AdminIcon name="upload" :size="16" />
        </span>
        <span class="mt-2.5 text-[13px]">
          <span class="text-[var(--ad-accent)]">Pilih file</span>
          <span class="text-[var(--ad-fg-muted)]"> atau seret ke sini</span>
        </span>
        <span class="cms-eyebrow mt-1.5">{{ formatList }} · maks {{ maxSizeMb }}MB</span>
      </template>
    </button>

    <input ref="fileInput" type="file" :accept="acceptAttr" class="hidden" @change="onChange" />

    <p v-if="hint && status !== 'error'" class="cms-hint">{{ hint }}</p>
    <p v-if="status === 'error'" class="cms-error-text mt-1.5">{{ errorMessage }}</p>
  </div>
</template>
