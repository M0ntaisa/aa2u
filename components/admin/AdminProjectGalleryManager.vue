<script setup lang="ts">
import type { Chapter, I18nField, ImageLayout } from '~/types/content'
import { CHAPTERS, IMAGE_LAYOUTS } from '~/utils/project-mapper'

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
  chapter: Chapter
  layout: ImageLayout
  width: number | null
  height: number | null
  focal_x: number | null
  focal_y: number | null
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

const SELECT = 'id, url, alt, caption, sort_order, chapter, layout, width, height, focal_x, focal_y'

const chapterLabels: Record<Chapter, string> = {
  site: '01 Tapak', concept: '02 Konsep', plan: '03 Denah',
  section: '04 Potongan', material: '05 Material', built: '06 Terbangun',
}
const layoutLabels: Record<ImageLayout, string> = {
  auto: 'Otomatis', full: 'Full (selebar layar)', wide: 'Wide', inset: 'Inset', pair: 'Pair (berpasangan)', tall: 'Tall (portrait)',
}

const toItem = (d: any): GalleryItem => ({
  id: d.id,
  url: d.url,
  alt: d.alt ?? blankI18n(),
  caption: d.caption ?? blankI18n(),
  sort_order: d.sort_order,
  chapter: d.chapter ?? 'built',
  layout: d.layout ?? 'auto',
  width: d.width ?? null,
  height: d.height ?? null,
  focal_x: d.focal_x ?? null,
  focal_y: d.focal_y ?? null,
})

/** Intrinsic size, read once on upload (needed for auto layout + CLS). */
function readImageSize(url: string): Promise<{ width: number; height: number } | null> {
  if (!import.meta.client) return Promise.resolve(null)
  return new Promise((resolve) => {
    const el = new Image()
    el.onload = () => resolve(el.naturalWidth ? { width: el.naturalWidth, height: el.naturalHeight } : null)
    el.onerror = () => resolve(null)
    el.src = url
  })
}

/** Backfill size for older rows the first time their thumbnail loads. */
function onThumbLoad(item: GalleryItem, e: Event) {
  if (item.width && item.height) return
  const el = e.target as HTMLImageElement
  if (el.naturalWidth) {
    item.width = el.naturalWidth
    item.height = el.naturalHeight
  }
}

/** Click on the thumbnail sets the crop focal point (0–1). */
function setFocal(item: GalleryItem, e: MouseEvent) {
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const clamp = (v: number) => Math.min(1, Math.max(0, Math.round(v * 100) / 100))
  item.focal_x = clamp((e.clientX - box.left) / box.width)
  item.focal_y = clamp((e.clientY - box.top) / box.height)
}

async function load() {
  if (!props.projectId || isPlaceholder) return
  status.value = 'loading'
  const { data, error } = await supabase
    .from('project_images')
    .select(SELECT)
    .eq('project_id', props.projectId)
    .order('sort_order', { ascending: true })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  items.value = (data ?? []).map(toItem)
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
  const size = await readImageSize(url)
  const { data, error } = await supabase
    .from('project_images')
    .insert({
      project_id: props.projectId,
      url,
      alt: blankI18n(),
      caption: blankI18n(),
      sort_order: nextOrder,
      width: size?.width ?? null,
      height: size?.height ?? null,
    })
    .select(SELECT)
    .maybeSingle()

  if (error) {
    errorMessage.value = error.message
    toast.error('Gagal menambah gambar', error.message)
    return
  }

  if (data) {
    items.value.push(toItem(data))
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
    .update({
      alt: item.alt,
      caption: item.caption,
      chapter: item.chapter,
      layout: item.layout,
      width: item.width,
      height: item.height,
      focal_x: item.focal_x,
      focal_y: item.focal_y,
    })
    .eq('id', item.id)
  item._saving = false
  if (error) {
    item._error = error.message
    toast.error('Gagal menyimpan', error.message)
    return
  }
  toast.success('Detail gambar tersimpan')
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

const { dragIndex, dropIndex, busy: reordering, onDragStart, onDragOver, onDragEnd, onDrop, move } =
  useProjectMediaReorder(items, 'project_images', 'Urutan gallery diperbarui')
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
        <div v-for="i in 2" :key="i" class="cms-skeleton h-40 w-full" />
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
          :draggable="!reordering"
          @dragstart="onDragStart(i)"
          @dragover="onDragOver($event, i)"
          @dragend="onDragEnd"
          @drop.prevent="onDrop(i)"
        >
          <div class="space-y-2">
            <div
              class="relative aspect-[4/3] cursor-crosshair overflow-hidden rounded bg-[var(--ad-surface-hover)]"
              title="Klik untuk mengatur titik fokus crop"
              @click="setFocal(item, $event)"
            >
              <img
                :src="item.url"
                :alt="item.alt.id"
                class="h-full w-full object-cover"
                :style="{ objectPosition: `${(item.focal_x ?? 0.5) * 100}% ${(item.focal_y ?? 0.5) * 100}%` }"
                loading="lazy"
                @load="onThumbLoad(item, $event)"
              />
              <span
                v-if="item.focal_x !== null && item.focal_y !== null"
                class="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                :style="{ left: `${item.focal_x * 100}%`, top: `${item.focal_y * 100}%` }"
              />
            </div>
            <p class="text-[11px] text-[var(--ad-fg-subtle)]">
              {{ item.width && item.height ? `${item.width}×${item.height}px` : 'ukuran belum terbaca' }}
              · fokus {{ item.focal_x ?? 0.5 }}, {{ item.focal_y ?? 0.5 }}
            </p>

            <div class="flex items-center gap-1">
              <span class="cms-eyebrow flex items-center gap-1">
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
                  :disabled="reordering || i === 0"
                  @click="move(i, -1)"
                />
                <AdminButton
                  variant="ghost"
                  size="sm"
                  icon-only
                  icon="chevronDown"
                  label="Turunkan urutan"
                  :disabled="reordering || i === items.length - 1"
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

            <div class="grid gap-4 md:grid-cols-2">
              <AdminField label="Bab" hint="Bagian dossier tempat gambar tampil.">
                <select v-model="item.chapter" class="cms-select">
                  <option v-for="c in CHAPTERS" :key="c" :value="c">{{ chapterLabels[c] }}</option>
                </select>
              </AdminField>
              <AdminField label="Layout" hint="Otomatis: lebar/portrait/pasangan dipilih dari ukuran gambar.">
                <select v-model="item.layout" class="cms-select">
                  <option v-for="l in IMAGE_LAYOUTS" :key="l" :value="l">{{ layoutLabels[l] }}</option>
                </select>
              </AdminField>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <AdminButton
                variant="secondary"
                size="sm"
                icon="save"
                :loading="item._saving"
                @click="saveItem(item)"
              >
                Simpan
              </AdminButton>
              <AdminButton variant="danger" size="sm" icon="trash" @click="removeItem(item)">Hapus</AdminButton>
              <p v-if="item._error" class="cms-error-text">{{ item._error }}</p>
            </div>
          </div>
        </li>
      </ul>

      <p v-else class="mt-5 text-[13px] text-[var(--ad-fg-subtle)]">
        Belum ada gambar di gallery.
      </p>

      <p v-if="errorMessage" class="cms-error-text mt-4">{{ errorMessage }}</p>
    </template>
  </AdminCard>
</template>
