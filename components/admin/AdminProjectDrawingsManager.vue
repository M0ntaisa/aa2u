<script setup lang="ts">
import type { Chapter, DrawingKind, I18nField } from '~/types/content'
import { CHAPTERS, DRAWING_KINDS, defaultDrawingChapter } from '~/utils/project-mapper'

const props = defineProps<{
  projectId: string | null
  projectSlug: string
}>()

interface DrawingItem {
  id: string
  url: string
  kind: DrawingKind
  caption: I18nField
  alt: I18nField
  scale: string
  level: string
  invert: boolean
  /** '' = default by kind */
  chapter: Chapter | ''
  sort_order: number
  _saving?: boolean
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()

const items = ref<DrawingItem[]>([])
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')
const newUrl = ref('')

const blankI18n = (): I18nField => ({ id: '', en: '' })
const SELECT = 'id, url, kind, caption, alt, scale, level, invert, chapter, sort_order'

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

const kindLabels: Record<DrawingKind, string> = {
  site_plan: 'Rencana tapak', plan: 'Denah', section: 'Potongan',
  elevation: 'Tampak', diagram: 'Diagram', axonometric: 'Aksonometri',
}
const chapterLabels: Record<Chapter, string> = {
  site: '01 Tapak', concept: '02 Konsep', plan: '03 Denah',
  section: '04 Potongan', material: '05 Material', built: '06 Terbangun',
}

const toItem = (d: any): DrawingItem => ({
  id: d.id,
  url: d.url,
  kind: d.kind,
  caption: d.caption ?? blankI18n(),
  alt: d.alt ?? blankI18n(),
  scale: d.scale ?? '',
  level: d.level ?? '',
  invert: !!d.invert,
  chapter: d.chapter ?? '',
  sort_order: d.sort_order,
})

/**
 * Why an SVG is unsafe, or null. Parsed with DOMParser (admin-only, runs in
 * the browser) so entity-encoded tricks like `java&#x73;cript:` are
 * decoded before the checks. Rejects script-capable elements, any on*
 * attribute, and href / xlink:href that isn't a #fragment or data:image.
 * SVGs are only rendered through <img> publicly; this is defence in depth.
 */
function svgProblem(text: string): string | null {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  if (doc.getElementsByTagName('parsererror').length || doc.documentElement?.localName !== 'svg') {
    return 'File SVG tidak valid.'
  }
  const BANNED = new Set(['script', 'foreignobject', 'iframe', 'embed', 'object', 'handler', 'listener'])
  for (const el of [doc.documentElement, ...Array.from(doc.documentElement.querySelectorAll('*'))]) {
    if (BANNED.has(el.localName.toLowerCase())) return `elemen <${el.localName}>`
    for (const attr of Array.from(el.attributes)) {
      const name = attr.localName.toLowerCase()
      const value = attr.value.trim().replace(/[\u0000-\u0020]+/g, '').toLowerCase()
      if (name.startsWith('on')) return `atribut ${attr.name}`
      if ((name === 'href' || name === 'src') && value && !value.startsWith('#') && !/^data:image\/(png|jpe?g|webp|gif);/.test(value)) {
        return `tautan ${attr.name}="${attr.value.slice(0, 40)}"`
      }
      if (/javascript:|vbscript:/.test(value)) return `nilai ${attr.name}`
    }
  }
  return null
}

/**
 * Runs after the type/size check. PDFs get a specific hint (the studio's
 * CAD exports are often PDF); SVGs go through svgProblem().
 */
async function checkDrawingFile(file: File): Promise<string | null> {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    const problem = svgProblem(await file.text())
    if (problem) {
      return `SVG ditolak (${problem}). Ekspor ulang sebagai SVG polos tanpa script/tautan, atau sebagai PNG.`
    }
  }
  return null
}

/** PDF hint has to win over the generic "format tidak didukung" message. */
const pdfHint = 'PDF tidak diterima. Ekspor dulu ke PNG (±300 dpi, latar transparan bila bisa) atau SVG dari CAD, lalu unggah hasilnya.'

async function load() {
  if (!props.projectId || isPlaceholder) return
  status.value = 'loading'
  const { data, error } = await supabase
    .from('project_drawings')
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

const { dragIndex, dropIndex, busy: reordering, onDragStart, onDragOver, onDragEnd, onDrop, move } =
  useProjectMediaReorder(items, 'project_drawings', 'Urutan gambar kerja diperbarui')

const missingAlt = computed(() => items.value.filter(i => !i.alt.id.trim()).length)

async function onUploaded(url: string) {
  if (!props.projectId || !url) return
  const nextOrder = items.value.length
    ? Math.max(...items.value.map(i => i.sort_order)) + 1
    : 0
  const { data, error } = await (supabase.from('project_drawings') as any)
    .insert({
      project_id: props.projectId,
      url,
      kind: 'plan',
      caption: blankI18n(),
      alt: blankI18n(),
      invert: false,
      sort_order: nextOrder,
    })
    .select(SELECT)
    .maybeSingle()

  if (error) {
    errorMessage.value = error.message
    toast.error('Gagal menambah gambar kerja', error.message)
    return
  }
  if (data) {
    items.value.push(toItem(data))
    toast.success('Gambar kerja ditambahkan', 'Atur jenis, skala, dan caption di bawah.')
  }
  newUrl.value = ''
}

async function saveItem(item: DrawingItem) {
  item._saving = true
  item._error = ''
  const { error } = await (supabase.from('project_drawings') as any)
    .update({
      kind: item.kind,
      caption: item.caption,
      alt: item.alt,
      scale: item.scale.trim().slice(0, 40) || null,
      level: item.level.trim().slice(0, 40) || null,
      invert: item.invert,
      chapter: item.chapter || null,
    })
    .eq('id', item.id)
  item._saving = false
  if (error) {
    item._error = error.message
    toast.error('Gagal menyimpan', error.message)
    return
  }
  toast.success('Gambar kerja tersimpan')
}

async function removeItem(item: DrawingItem) {
  const ok = await ask({
    title: 'Hapus gambar kerja?',
    message: 'Entri akan dihapus. File di storage tidak ikut terhapus.',
    confirmLabel: 'Hapus',
    tone: 'danger',
  })
  if (!ok) return

  const { error } = await supabase.from('project_drawings').delete().eq('id', item.id)
  if (error) {
    item._error = error.message
    toast.error('Gagal menghapus', error.message)
    return
  }
  items.value = items.value.filter(i => i.id !== item.id)
  toast.success('Gambar kerja dihapus')
}
</script>

<template>
  <AdminCard
    title="Gambar kerja"
    icon="layers"
    description="Denah, potongan, tampak, diagram. Tanpa gambar kerja, bab Denah dan Potongan disembunyikan."
  >
    <template #actions>
      <AdminBadge v-if="missingAlt" tone="warning">{{ missingAlt }} tanpa alt text</AdminBadge>
      <span v-if="items.length" class="text-[11.5px] text-[var(--ad-fg-subtle)]">{{ items.length }} gambar</span>
    </template>

    <AdminEmptyState
      v-if="!projectId"
      icon="save"
      title="Simpan projek dulu"
      description="Gambar kerja butuh ID projek. Simpan sebagai draft, lalu tambahkan di sini."
    />

    <AdminEmptyState
      v-else-if="isPlaceholder"
      icon="database"
      title="Tidak tersedia di mode demo"
      description="Aktifkan Supabase di .env untuk mengelola gambar kerja."
    />

    <template v-else>
      <AdminImageUpload
        v-model="newUrl"
        label="Tambah gambar kerja"
        bucket="project-drawings"
        :folder="`drawings/${projectSlug}`"
        :accept="ACCEPT"
        :max-size-mb="10"
        :validate-file="checkDrawingFile"
        :type-hints="{ 'application/pdf': pdfHint }"
        fit="contain"
        hint="Terbaik: garis putih di latar transparan (SVG/PNG). Ekspor CAD hitam-di-putih juga bisa — nyalakan Invert. PDF tidak diterima: ekspor ke PNG dulu."
        @uploaded="onUploaded"
      />

      <div v-if="status === 'loading'" class="mt-5 space-y-3">
        <div v-for="i in 2" :key="i" class="cms-skeleton h-40 w-full" />
      </div>

      <ul v-else-if="items.length" class="mt-6 space-y-3">
        <li
          v-for="(item, i) in items"
          :key="item.id"
          class="grid gap-4 rounded-[var(--ad-radius-sm)] border p-4 transition-colors md:grid-cols-[230px_1fr]"
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
            <!-- Preview on the public page background, with the same invert filter. -->
            <div class="aspect-[4/3] cursor-move overflow-hidden rounded border border-[var(--ad-border)] bg-[#1a1b26] p-2">
              <img
                :src="item.url"
                :alt="item.alt.id"
                class="h-full w-full object-contain"
                :style="item.invert ? { filter: 'invert(1) hue-rotate(180deg)', mixBlendMode: 'screen' } : undefined"
                loading="lazy"
              />
            </div>
            <div class="flex items-center gap-1">
              <span class="cms-eyebrow flex items-center gap-1">
                <AdminIcon name="grip" :size="12" />
                #{{ String(i + 1).padStart(2, '0') }}
              </span>
              <div class="ml-auto flex gap-1">
                <AdminButton variant="ghost" size="sm" icon-only icon="chevronUp" label="Naikkan urutan" :disabled="reordering || i === 0" @click="move(i, -1)" />
                <AdminButton variant="ghost" size="sm" icon-only icon="chevronDown" label="Turunkan urutan" :disabled="reordering || i === items.length - 1" @click="move(i, 1)" />
              </div>
            </div>
            <label class="cms-switch-row text-[12.5px]">
              <input v-model="item.invert" type="checkbox" class="cms-check" />
              Invert (CAD hitam-di-putih)
            </label>
          </div>

          <div class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <AdminField label="Jenis">
                <select v-model="item.kind" class="cms-select">
                  <option v-for="k in DRAWING_KINDS" :key="k" :value="k">{{ kindLabels[k] }}</option>
                </select>
              </AdminField>
              <AdminField label="Bab">
                <select v-model="item.chapter" class="cms-select">
                  <option value="">Otomatis ({{ chapterLabels[defaultDrawingChapter(item.kind)] }})</option>
                  <option v-for="c in CHAPTERS" :key="c" :value="c">{{ chapterLabels[c] }}</option>
                </select>
              </AdminField>
              <AdminField label="Skala" hint="Hanya tampilan, mis. 1:200.">
                <input v-model="item.scale" type="text" maxlength="40" placeholder="1:200" class="cms-input" />
              </AdminField>
              <AdminField label="Level" hint="Mis. Level 1 atau +3.20.">
                <input v-model="item.level" type="text" maxlength="40" placeholder="Level 1" class="cms-input" />
              </AdminField>
            </div>

            <AdminI18nField v-model="item.caption" label="Caption" placeholder="Denah lantai dasar" />
            <AdminI18nField v-model="item.alt" label="Alt text" placeholder="Denah lantai dasar rumah, tiga ruang di sekitar halaman" />

            <div class="flex flex-wrap items-center gap-2.5">
              <AdminButton variant="secondary" size="sm" icon="save" :loading="item._saving" @click="saveItem(item)">
                Simpan
              </AdminButton>
              <AdminButton variant="danger" size="sm" icon="trash" @click="removeItem(item)">Hapus</AdminButton>
              <p v-if="item._error" class="cms-error-text">{{ item._error }}</p>
            </div>
          </div>
        </li>
      </ul>

      <p v-else class="mt-5 text-[13px] text-[var(--ad-fg-subtle)]">Belum ada gambar kerja.</p>

      <p v-if="errorMessage" class="cms-error-text mt-4">{{ errorMessage }}</p>
    </template>
  </AdminCard>
</template>
