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
  _saved?: boolean
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()

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
  }
  newImageUrl.value = ''
}

async function saveItem(item: GalleryItem) {
  if (!item.alt.id.trim()) {
    item._error = 'Alt text (ID) wajib diisi untuk aksesibilitas & SEO.'
    return
  }
  item._saving = true
  item._saved = false
  item._error = ''
  const { error } = await supabase
    .from('project_images')
    .update({ alt: item.alt, caption: item.caption })
    .eq('id', item.id)
  item._saving = false
  if (error) {
    item._error = error.message
    return
  }
  item._saved = true
  setTimeout(() => { item._saved = false }, 1500)
}

async function removeItem(item: GalleryItem) {
  if (!confirm('Hapus gambar ini dari gallery?')) return
  const { error } = await supabase
    .from('project_images')
    .delete()
    .eq('id', item.id)
  if (error) {
    item._error = error.message
    return
  }
  items.value = items.value.filter(i => i.id !== item.id)
}

// Drag-and-drop reorder
const dragIndex = ref<number | null>(null)
function onDragStart(i: number) { dragIndex.value = i }
function onDragOver(e: DragEvent) { e.preventDefault() }
async function onDrop(targetIndex: number) {
  const from = dragIndex.value
  dragIndex.value = null
  if (from === null || from === targetIndex) return

  const reordered = [...items.value]
  const [moved] = reordered.splice(from, 1)
  reordered.splice(targetIndex, 0, moved)
  reordered.forEach((it, idx) => { it.sort_order = idx })
  items.value = reordered

  // Persist new sort_order for all affected items
  const updates = reordered.map(it =>
    supabase.from('project_images').update({ sort_order: it.sort_order }).eq('id', it.id)
  )
  const results = await Promise.all(updates)
  const firstError = results.find(r => r.error)
  if (firstError?.error) {
    errorMessage.value = firstError.error.message
  }
}
</script>

<template>
  <section class="border border-white/10 px-6 py-6 space-y-6">
    <div class="flex items-end justify-between">
      <h2 class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">Gallery</h2>
      <p v-if="items.length" class="text-xs text-[var(--color-muted)]">
        {{ items.length }} gambar · seret untuk mengurutkan
      </p>
    </div>

    <div v-if="!projectId" class="border border-dashed border-white/10 px-6 py-10 text-center text-sm text-[var(--color-muted)]">
      Simpan projek terlebih dahulu sebelum menambah gambar gallery.
    </div>

    <div v-else-if="isPlaceholder" class="border border-dashed border-white/10 px-6 py-10 text-center text-sm text-[var(--color-muted)]">
      Mode demo: aktifkan Supabase di <code>.env</code> untuk kelola gallery.
    </div>

    <template v-else>
      <ImageUpload
        v-model="newImageUrl"
        label="Tambah gambar baru"
        bucket="project-images"
        :folder="`gallery/${projectSlug}`"
        hint="Setelah upload, gambar akan langsung muncul di urutan terakhir. Isi alt & caption per gambar di bawah."
        @uploaded="onUploaded"
      />

      <div v-if="status === 'loading'" class="text-sm text-[var(--color-muted)]">Memuat gallery…</div>

      <ul v-else-if="items.length" class="space-y-4">
        <li
          v-for="(item, i) in items"
          :key="item.id"
          class="border border-white/10 p-4 grid md:grid-cols-[200px_1fr_auto] gap-4 items-start"
          :class="dragIndex === i ? 'opacity-50' : ''"
          draggable="true"
          @dragstart="onDragStart(i)"
          @dragover="onDragOver"
          @drop.prevent="onDrop(i)"
        >
          <div class="flex flex-col gap-2">
            <div class="aspect-[4/3] overflow-hidden bg-white/5 cursor-move">
              <img :src="item.url" :alt="item.alt.id" class="w-full h-full object-cover" />
            </div>
            <span class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
              #{{ String(i + 1).padStart(2, '0') }} · seret ⠿
            </span>
          </div>

          <div class="space-y-4">
            <AdminI18nField
              v-model="item.alt"
              label="Alt text"
              required
              placeholder="Ringkas, deskriptif (untuk a11y & SEO)"
            />
            <p v-if="!item.alt.id.trim()" class="-mt-2 text-[10px] text-amber-300">
              ⚠ Alt text kosong — wajib diisi sebelum simpan.
            </p>
            <AdminI18nField
              v-model="item.caption"
              label="Caption"
              type="textarea"
              :rows="2"
              placeholder="Opsional"
            />
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="text-xs uppercase tracking-[0.2em] border border-white/40 hover:border-white px-4 py-2 transition-colors disabled:opacity-30"
                :disabled="item._saving"
                @click="saveItem(item)"
              >
                {{ item._saving ? 'Menyimpan…' : 'Simpan teks' }}
              </button>
              <span v-if="item._saved" class="text-xs text-emerald-300">Tersimpan ✓</span>
              <span v-if="item._error" class="text-xs text-red-400">{{ item._error }}</span>
            </div>
          </div>

          <button
            type="button"
            class="text-xs uppercase tracking-[0.2em] border border-red-500/40 text-red-300 hover:bg-red-500/10 px-4 py-2 transition-colors self-start"
            @click="removeItem(item)"
          >
            Hapus
          </button>
        </li>
      </ul>

      <div v-else class="text-sm text-[var(--color-muted)] py-4">
        Belum ada gambar di gallery.
      </div>

      <p v-if="errorMessage" class="text-xs text-red-400">{{ errorMessage }}</p>
    </template>
  </section>
</template>
