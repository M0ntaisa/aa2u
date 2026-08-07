<script setup lang="ts">
import type { I18nField } from '~/types/content'

const props = defineProps<{
  projectId: string | null
  projectSlug: string
}>()

interface GalleryItem {
  id: string
  url: string
  alt: I18nField
  caption: I18nField
  sort_order: number
  _saving?: boolean
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()

const items = ref<GalleryItem[]>([])
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')
const newImageUrl = ref('')

const blankI18n = (): I18nField => ({ id: '', en: '' })

async function load() {
  if (!props.projectId || isPlaceholder) return
  status.value = 'loading'
  const { data, error } = await supabase
    .from('project_images')
    .select('id, url, alt, caption, sort_order')
    .eq('project_id', props.projectId)
    .order('sort_order', { ascending: true })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  items.value = (data ?? []).map((d: any) => ({
    id: d.id,
    url: d.url,
    alt: d.alt ?? blankI18n(),
    caption: d.caption ?? blankI18n(),
    sort_order: d.sort_order,
  }))
  status.value = 'idle'
}

await load()
watch(() => props.projectId, load)

const missingAlt = computed(() => items.value.filter(i => !i.alt.id.trim()).length)

async function onUploaded(url: string) {
  if (!props.projectId || !url) return
  const nextOrder = items.value.length
    ? Math.max(...items.value.map(i => i.sort_order)) + 1
    : 0
  const { data, error } = await supabase
    .from('project_images')
    .insert({
      project_id: props.projectId,
      url,
      alt: blankI18n(),
      caption: blankI18n(),
      sort_order: nextOrder,
    })
    .select('id, url, alt, caption, sort_order')
    .maybeSingle()

  if (error) {
    errorMessage.value = error.message
    toast.error('Gagal menambah gambar', error.message)
    return
  }

  if (data) {
    items.value.push({
      id: data.id,
      url: data.url,
      alt: data.alt ?? blankI18n(),
      caption: data.caption ?? blankI18n(),
      sort_order: data.sort_order,
    })
    toast.success('Gambar ditambahkan', 'Isi alt text sebelum publish.')
  }
  newImageUrl.value = ''
}

async function saveItem(item: GalleryItem) {
  if (!item.alt.id.trim()) {
    item._error = 'Alt text (ID) wajib diisi untuk aksesibilitas & SEO.'
    return
  }
  item._saving = true
  item._error = ''
  const { error } = await supabase
    .from('project_images')
    .update({ alt: item.alt, caption: item.caption })
    .eq('id', item.id)
  item._saving = false
  if (error) {
    item._error = error.message
    toast.error('Gagal menyimpan', error.message)
    return
  }
  toast.success('Teks gambar tersimpan')
}

async function removeItem(item: GalleryItem) {
  const ok = await ask({
    title: 'Hapus gambar dari gallery?',
    message: 'Entri gallery akan dihapus. File di storage tidak ikut terhapus.',
    confirmLabel: 'Hapus',
    tone: 'danger',
  })
  if (!ok) return

  const { error } = await supabase
    .from('project_images')
    .delete()
    .eq('id', item.id)
  if (error) {
    item._error = error.message
    toast.error('Gagal menghapus', error.message)
    return
  }
  items.value = items.value.filter(i => i.id !== item.id)
  toast.success('Gambar dihapus')
}

// Drag-and-drop reorder
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

function onDragStart(i: number) { dragIndex.value = i }
function onDragOver(e: DragEvent, i: number) {
  e.preventDefault()
  dropIndex.value = i
}
function onDragEnd() {
  dragIndex.value = null
  dropIndex.value = null
}

async function onDrop(targetIndex: number) {
  const from = dragIndex.value
  onDragEnd()
  if (from === null || from === targetIndex) return

  const reordered = [...items.value]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(targetIndex, 0, moved)
  reordered.forEach((it, idx) => { it.sort_order = idx })
  items.value = reordered

  // Persist new sort_order for all affected items
  const updates = reordered.map(it =>
    supabase.from('project_images').update({ sort_order: it.sort_order }).eq('id', it.id),
  )
  const results = await Promise.all(updates)
  const firstError = results.find(r => r.error)
  if (firstError?.error) {
    errorMessage.value = firstError.error.message
    toast.error('Urutan gagal disimpan', firstError.error.message)
    return
  }
  toast.success('Urutan gallery diperbarui')
}

/** Keyboard reorder — drag-and-drop alone is not accessible. */
async function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= items.value.length) return
  dragIndex.value = index
  await onDrop(target)
}
</script>

<template>
  <AdminCard title="Gallery" icon="image" description="Gambar tambahan di halaman detail projek.">
    <template #actions>
      <AdminBadge v-if="missingAlt" tone="warning">{{ missingAlt }} tanpa alt text</AdminBadge>
      <span v-if="items.length" class="text-[11.5px] text-[var(--ad-fg-subtle)]">
        {{ items.length }} gambar
      </span>
    </template>

    <AdminEmptyState
      v-if="!projectId"
      icon="save"
      title="Simpan projek dulu"
      description="Gallery butuh ID projek. Simpan sebagai draft, lalu tambahkan gambar di sini."
    />

    <AdminEmptyState
      v-else-if="isPlaceholder"
      icon="database"
      title="Tidak tersedia di mode demo"
      description="Aktifkan Supabase di .env untuk mengelola gallery."
    />

    <template v-else>
      <AdminImageUpload
        v-model="newImageUrl"
        label="Tambah gambar"
        bucket="project-images"
        :folder="`gallery/${projectSlug}`"
        hint="Gambar masuk ke urutan terakhir. Isi alt & caption per gambar di bawah."
        @uploaded="onUploaded"
      />

      <div v-if="status === 'loading'" class="mt-5 space-y-3">
        <div v-for="i in 2" :key="i" class="ad-skeleton h-40 w-full" />
      </div>

      <ul v-else-if="items.length" class="mt-6 space-y-3">
        <li
          v-for="(item, i) in items"
          :key="item.id"
          class="grid gap-4 rounded-[var(--ad-radius-sm)] border p-4 transition-colors md:grid-cols-[190px_1fr]"
          :class="[
            dragIndex === i ? 'opacity-40' : '',
            dropIndex === i && dragIndex !== i
              ? 'border-[var(--ad-accent)] bg-[rgba(122,162,247,0.06)]'
              : 'border-[var(--ad-border)] bg-[var(--ad-surface-sunk)]',
          ]"
          draggable="true"
          @dragstart="onDragStart(i)"
          @dragover="onDragOver($event, i)"
          @dragend="onDragEnd"
          @drop.prevent="onDrop(i)"
        >
          <div class="space-y-2">
            <div class="aspect-[4/3] cursor-move overflow-hidden rounded bg-[var(--ad-surface-hover)]">
              <img :src="item.url" :alt="item.alt.id" class="h-full w-full object-cover" loading="lazy" />
            </div>

            <div class="flex items-center gap-1">
              <span class="ad-eyebrow flex items-center gap-1">
                <AdminIcon name="grip" :size="12" />
                #{{ String(i + 1).padStart(2, '0') }}
              </span>
              <div class="ml-auto flex gap-1">
                <AdminButton
                  variant="ghost"
                  size="sm"
                  icon-only
                  icon="chevronUp"
                  label="Naikkan urutan"
                  :disabled="i === 0"
                  @click="move(i, -1)"
                />
                <AdminButton
                  variant="ghost"
                  size="sm"
                  icon-only
                  icon="chevronDown"
                  label="Turunkan urutan"
                  :disabled="i === items.length - 1"
                  @click="move(i, 1)"
                />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <AdminI18nField
              v-model="item.alt"
              label="Alt text"
              required
              placeholder="Ringkas, deskriptif (untuk a11y & SEO)"
            />
            <p v-if="!item.alt.id.trim()" class="-mt-2 flex items-center gap-1.5 text-[11.5px] text-[var(--ad-warning)]">
              <AdminIcon name="alert" :size="12" />
              Alt text kosong — wajib diisi sebelum simpan.
            </p>

            <AdminI18nField
              v-model="item.caption"
              label="Caption"
              type="textarea"
              :rows="2"
              placeholder="Opsional"
            />

            <div class="flex flex-wrap items-center gap-2.5">
              <AdminButton
                variant="secondary"
                size="sm"
                icon="save"
                :loading="item._saving"
                @click="saveItem(item)"
              >
                Simpan teks
              </AdminButton>
              <AdminButton variant="danger" size="sm" icon="trash" @click="removeItem(item)">Hapus</AdminButton>
              <p v-if="item._error" class="ad-error-text">{{ item._error }}</p>
            </div>
          </div>
        </li>
      </ul>

      <p v-else class="mt-5 text-[13px] text-[var(--ad-fg-subtle)]">
        Belum ada gambar di gallery.
      </p>

      <p v-if="errorMessage" class="ad-error-text mt-4">{{ errorMessage }}</p>
    </template>
  </AdminCard>
</template>
