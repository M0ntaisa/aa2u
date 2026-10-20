<script setup lang="ts">
import type {
  BuildStatus, Category, Chapter, ClientMode, I18nField, I18nList, ProjectRow, ProjectStatus,
} from '~/types/content'
import { CHAPTERS, PRIVATE_CLIENT_LABEL, roundCoord } from '~/utils/project-mapper'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()

const slugParam = computed(() => String(route.params.id))
const isNew = computed(() => slugParam.value === 'new')

const blankI18n = (): I18nField => ({ id: '', en: '' })
const blankI18nList = (): I18nList => ({ id: [], en: [] })
const blankChapters = (): Record<Chapter, I18nField> =>
  Object.fromEntries(CHAPTERS.map(c => [c, blankI18n()])) as Record<Chapter, I18nField>

interface Form {
  slug: string
  title: I18nField
  year: number | null
  location: I18nField
  category_slug: string
  status: ProjectStatus
  partners: string
  description: I18nField
  process_note: I18nField
  services_performed: I18nList
  cover_image: string
  sort_order: number
  is_featured: boolean
  seo_title: I18nField
  seo_description: I18nField
  // Facts
  build_status: BuildStatus | ''
  area_site_m2: number | null
  area_built_m2: number | null
  client_mode: ClientMode
  client_alias: I18nField
  /** Private: saved to project_private, public only when client_mode = 'name'. */
  client_name: string
  team: string[]
  photographer: string
  // Location — lat/lng are the EXACT values, saved to project_private.
  hide_location: boolean
  lat: number | null
  lng: number | null
  chapter_text: Record<Chapter, I18nField>
}

const form = ref<Form>({
  slug: '',
  title: blankI18n(),
  year: null,
  location: blankI18n(),
  category_slug: '',
  status: 'draft',
  partners: '',
  description: blankI18n(),
  process_note: blankI18n(),
  services_performed: blankI18nList(),
  cover_image: '',
  sort_order: 0,
  is_featured: false,
  seo_title: blankI18n(),
  seo_description: blankI18n(),
  build_status: '',
  area_site_m2: null,
  area_built_m2: null,
  client_mode: 'private',
  client_alias: blankI18n(),
  client_name: '',
  team: [],
  photographer: '',
  hide_location: false,
  lat: null,
  lng: null,
  chapter_text: blankChapters(),
})

const categories = ref<Category[]>([])
const teamNames = ref<string[]>([])
const status = ref<'idle' | 'loading' | 'saving' | 'error'>('idle')
const errorMessage = ref('')
const projectId = ref<string | null>(null)

/** Snapshot of the last persisted state — drives the unsaved-changes guard. */
const savedSnapshot = ref('')
const isDirty = computed(() => JSON.stringify(form.value) !== savedSnapshot.value)

function markClean() {
  savedSnapshot.value = JSON.stringify(form.value)
}

async function loadCategories() {
  if (isPlaceholder) {
    const m = await import('~/data/projects')
    categories.value = m.categories
    return
  }
  const { data } = await supabase.from('categories').select('slug, name').order('sort_order')
  categories.value = (data ?? []) as Category[]
}

/** Studio members as tag suggestions for the Team field. */
async function loadTeamNames() {
  if (isPlaceholder) {
    const m = await import('~/data/team')
    teamNames.value = m.team.map(t => t.name)
    return
  }
  const { data } = await supabase.from('team_members').select('name').order('sort_order')
  teamNames.value = ((data ?? []) as { name: string }[]).map(t => t.name)
}

async function loadProject() {
  if (isNew.value) return
  status.value = 'loading'

  let p: (ProjectRow & { seo_title?: I18nField; seo_description?: I18nField }) | null = null
  let priv: { lat_exact: number | null; lng_exact: number | null; client_name: string | null } | null = null

  if (isPlaceholder) {
    // Dummy rows only hold the public (rounded) values; no private data exists.
    const { projectRowBySlug } = await import('~/data/projects')
    p = projectRowBySlug(slugParam.value) ?? null
  } else {
    const { data, error } = await supabase
      .from('projects')
      .select('*, category:categories(slug, name)')
      .eq('slug', slugParam.value)
      .maybeSingle()
    if (error) {
      status.value = 'error'
      errorMessage.value = error.message
      return
    }
    p = data as any

    if (p?.id) {
      const res = await supabase
        .from('project_private')
        .select('lat_exact, lng_exact, client_name')
        .eq('project_id', p.id)
        .maybeSingle()
      if (res.error) {
        status.value = 'error'
        errorMessage.value = res.error.message
        return
      }
      priv = res.data as any
    }
  }

  if (!p) {
    throw createError({ statusCode: 404, statusMessage: 'Projek tidak ditemukan' })
  }

  projectId.value = p.id ?? null

  const chapterText = blankChapters()
  for (const c of CHAPTERS) {
    const f = p.chapter_text?.[c]
    if (f) chapterText[c] = { id: f.id ?? '', en: f.en ?? '' }
  }

  form.value = {
    slug: p.slug,
    title: p.title ?? blankI18n(),
    year: p.year ?? null,
    location: p.location ?? blankI18n(),
    category_slug: p.category?.slug ?? '',
    status: p.status,
    partners: (p.partners ?? []).join(', '),
    description: p.description ?? blankI18n(),
    process_note: p.process_note ?? blankI18n(),
    services_performed: p.services_performed ?? blankI18nList(),
    cover_image: p.cover_image ?? '',
    sort_order: p.sort_order ?? 0,
    is_featured: !!p.is_featured,
    seo_title: p.seo_title ?? blankI18n(),
    seo_description: p.seo_description ?? blankI18n(),
    build_status: p.build_status ?? '',
    area_site_m2: p.area_site_m2 != null ? Number(p.area_site_m2) : null,
    area_built_m2: p.area_built_m2 != null ? Number(p.area_built_m2) : null,
    client_mode: p.client_mode ?? 'private',
    client_alias: p.client_alias ?? blankI18n(),
    client_name: priv?.client_name ?? p.client_name_public ?? '',
    team: p.team ?? [],
    photographer: p.photographer ?? '',
    hide_location: !!p.hide_location,
    lat: priv ? priv.lat_exact : (p.lat ?? null),
    lng: priv ? priv.lng_exact : (p.lng ?? null),
    chapter_text: chapterText,
  }

  status.value = 'idle'
}

await Promise.all([loadCategories(), loadTeamNames()])
await loadProject()
markClean()

/** Slug helper — only auto-fills while creating and untouched by the user. */
const slugTouched = ref(false)
watch(() => form.value.title.id, (title) => {
  if (!isNew.value || slugTouched.value || !title) return
  form.value.slug = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
})

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_development', label: 'In development' },
  { value: 'published', label: 'Published' },
]

const buildStatusOptions: { value: BuildStatus; label: string }[] = [
  { value: 'concept', label: 'Konsep' },
  { value: 'design', label: 'Desain' },
  { value: 'construction', label: 'Konstruksi' },
  { value: 'completed', label: 'Selesai' },
  { value: 'unbuilt', label: 'Tidak dibangun (kompetisi)' },
]

const clientModeOptions: { value: ClientMode; label: string }[] = [
  { value: 'private', label: 'Pribadi' },
  { value: 'alias', label: 'Alias' },
  { value: 'name', label: 'Nama asli' },
]

const chapterLabels: Record<Chapter, string> = {
  site: '01 Tapak', concept: '02 Konsep', plan: '03 Denah',
  section: '04 Potongan', material: '05 Material', built: '06 Terbangun',
}

/** v-model.number leaves '' in an emptied number input. */
const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// ---------- Location helpers ----------
const coordsPaste = ref('')
const coordsPasteError = ref('')

function applyPastedCoords() {
  const parsed = parseLatLng(coordsPaste.value)
  if (!parsed) {
    coordsPasteError.value = 'Format tidak dikenali. Contoh: -6.1754, 106.8272'
    return
  }
  form.value.lat = parsed.lat
  form.value.lng = parsed.lng
  coordsPaste.value = ''
  coordsPasteError.value = ''
}

/** Pasting a recognisable pair applies it right away. */
function onCoordsPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!parseLatLng(text)) return
  e.preventDefault()
  coordsPaste.value = text
  applyPastedCoords()
}

const hasCoords = computed(() => num(form.value.lat) !== null && num(form.value.lng) !== null)

/** What the public site will get (DB trigger applies the same rule). */
const publicCoords = computed(() => {
  if (form.value.hide_location) return 'Disembunyikan — tidak ada koordinat di situs publik.'
  if (!hasCoords.value) return 'Belum diisi — projek masuk daftar "Not mapped".'
  return `${roundCoord(num(form.value.lat)!).toFixed(2)}, ${roundCoord(num(form.value.lng)!).toFixed(2)} (±1 km)`
})

// Mini locator using the /work map's equirectangular bounds (lon 94.5–141.5,
// lat +6.5 to −11.5). A point outside usually means swapped lat/lng or a sign error.
const locator = computed(() => {
  const lat = num(form.value.lat)
  const lng = num(form.value.lng)
  if (lat === null || lng === null) return null
  const x = (lng - 94.5) / 47
  const y = (6.5 - lat) / 18
  return { x, y, inside: x >= 0 && x <= 1 && y >= 0 && y <= 1 }
})

const mapsLink = computed(() =>
  hasCoords.value ? `https://www.google.com/maps?q=${num(form.value.lat)},${num(form.value.lng)}` : '',
)

const filledChapters = computed(() =>
  CHAPTERS.filter(c => form.value.chapter_text[c].id.trim() || form.value.chapter_text[c].en.trim()).length,
)

const validationError = computed(() => {
  const f = form.value
  if (!f.slug.trim()) return 'Slug wajib diisi.'
  if (!/^[a-z0-9-]+$/.test(f.slug)) return 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'
  if (!f.title.id.trim()) return 'Judul (ID) wajib diisi.'
  for (const [label, v] of [['Luas tapak', f.area_site_m2], ['Luas bangunan', f.area_built_m2]] as const) {
    const n = num(v)
    if (n !== null && (n <= 0 || n > 999_999_999)) return `${label} harus lebih dari 0.`
  }
  const lat = num(f.lat)
  const lng = num(f.lng)
  if ((lat === null) !== (lng === null)) return 'Isi latitude dan longitude sekaligus, atau kosongkan keduanya.'
  if (lat !== null && Math.abs(lat) > 90) return 'Latitude harus di antara -90 dan 90.'
  if (lng !== null && Math.abs(lng) > 180) return 'Longitude harus di antara -180 dan 180.'
  if (f.client_mode === 'alias' && !f.client_alias.id.trim()) return 'Alias klien (ID) wajib diisi untuk mode Alias.'
  if (f.client_mode === 'name' && !f.client_name.trim()) return 'Nama klien wajib diisi untuk mode Nama asli.'
  if (f.client_name.length > 200) return 'Nama klien maksimal 200 karakter.'
  if (f.photographer.length > 200) return 'Nama fotografer maksimal 200 karakter.'
  return ''
})

async function save() {
  if (isPlaceholder) {
    toast.warning('Mode demo', 'Aktifkan Supabase di .env untuk menyimpan.')
    return
  }
  if (validationError.value) {
    status.value = 'error'
    errorMessage.value = validationError.value
    toast.error('Belum bisa disimpan', validationError.value)
    return
  }

  status.value = 'saving'
  errorMessage.value = ''

  const category_id = form.value.category_slug
    ? (await supabase.from('categories').select('id').eq('slug', form.value.category_slug).maybeSingle()).data?.id
    : null

  const payload = {
    slug: form.value.slug,
    title: form.value.title,
    // v-model.number leaves '' in a cleared input; the RPC casts to int.
    year: num(form.value.year) !== null ? Math.round(num(form.value.year)!) : null,
    location: form.value.location,
    category_id,
    status: form.value.status,
    partners: form.value.partners.split(',').map(s => s.trim()).filter(Boolean),
    description: form.value.description,
    process_note: form.value.process_note,
    services_performed: form.value.services_performed,
    cover_image: form.value.cover_image || null,
    sort_order: Math.round(num(form.value.sort_order) ?? 0),
    is_featured: form.value.is_featured,
    seo_title: form.value.seo_title,
    seo_description: form.value.seo_description,
    build_status: form.value.build_status || null,
    area_site_m2: num(form.value.area_site_m2),
    area_built_m2: num(form.value.area_built_m2),
    client_mode: form.value.client_mode,
    client_alias: form.value.client_alias.id.trim() || form.value.client_alias.en.trim()
      ? form.value.client_alias
      : null,
    team: form.value.team.map(t => t.trim()).filter(Boolean),
    photographer: form.value.photographer.trim() || null,
    hide_location: form.value.hide_location,
    // Only filled chapters; the public mapper treats missing keys as empty.
    chapter_text: Object.fromEntries(
      CHAPTERS
        .filter(c => form.value.chapter_text[c].id.trim() || form.value.chapter_text[c].en.trim())
        .map(c => [c, form.value.chapter_text[c]]),
    ),
    // lat / lng / client_name_public are NOT sent: a DB trigger derives
    // them from project_private (rounded / only when mode = 'name').
  }

  // Pre-check slug uniqueness when slug changed (or on create) — gives a
  // friendlier message than the raw 23505 unique_violation.
  const slugChanged = isNew.value || form.value.slug !== slugParam.value
  if (slugChanged) {
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', form.value.slug)
      .maybeSingle()
    if (existing) {
      status.value = 'error'
      errorMessage.value = `Slug "${form.value.slug}" sudah dipakai projek lain.`
      toast.error('Slug bentrok', errorMessage.value)
      return
    }
  }

  // One RPC writes projects + project_private in a single transaction
  // (supabase/schema.sql: save_project). Nothing is saved if any part
  // fails, and the public columns are derived from the NEW private row,
  // so a hidden client name can never be left public by a partial save.
  const { data: rpcData, error } = await (supabase.rpc as any)('save_project', {
    p_slug: isNew.value ? null : slugParam.value,
    p_project: payload,
    p_private: {
      lat_exact: num(form.value.lat),
      lng_exact: num(form.value.lng),
      client_name: form.value.client_name.trim() || null,
    },
  })
  const saved = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as { id: string; slug: string } | null

  if (error) {
    status.value = 'error'
    errorMessage.value = (error as any).code === '23505'
      ? `Slug "${form.value.slug}" sudah dipakai projek lain.`
      : (error as any).code === '42501'
        ? 'Tidak punya akses admin untuk menyimpan.'
        : error.message
    toast.error('Gagal menyimpan', errorMessage.value)
    return
  }

  if (!saved?.id) {
    status.value = 'error'
    errorMessage.value = 'Projek tidak tersimpan (tidak ditemukan atau tidak punya akses).'
    toast.error('Gagal menyimpan', errorMessage.value)
    return
  }

  projectId.value = saved.id
  status.value = 'idle'
  markClean()
  toast.success(isNew.value ? 'Projek dibuat' : 'Perubahan tersimpan')

  if (isNew.value && saved?.slug) {
    // Redirect ke edit page supaya gallery bisa langsung dikelola
    router.replace(`/admin/projects/${saved.slug}`)
    return
  }

  if (saved?.slug && saved.slug !== slugParam.value) {
    router.replace(`/admin/projects/${saved.slug}`)
  }
}

async function remove() {
  const ok = await ask({
    title: 'Hapus projek ini?',
    message: `"${form.value.title.id || form.value.slug}" akan dihapus permanen beserta entri gallery-nya. Tindakan ini tidak bisa dibatalkan.`,
    confirmLabel: 'Hapus permanen',
    tone: 'danger',
  })
  if (!ok) return

  if (isPlaceholder) {
    toast.warning('Mode demo', 'Tidak ada yang dihapus.')
    return
  }

  const { error } = await supabase.from('projects').delete().eq('slug', slugParam.value)
  if (error) {
    errorMessage.value = error.message
    toast.error('Gagal menghapus', error.message)
    return
  }
  markClean()
  toast.success('Projek dihapus')
  router.push('/admin/projects')
}

// Unsaved-changes guards: in-app navigation and browser unload.
onBeforeRouteLeave(async () => {
  if (!isDirty.value) return true
  return await ask({
    title: 'Tinggalkan tanpa menyimpan?',
    message: 'Ada perubahan yang belum disimpan. Perubahan tersebut akan hilang.',
    confirmLabel: 'Tinggalkan',
    tone: 'danger',
  })
})

function beforeUnload(e: BeforeUnloadEvent) {
  if (!isDirty.value) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <div class="mx-auto max-w-[980px] pb-24">
    <AdminPageHeader
      :title="isNew ? 'Projek baru' : (form.title.id || form.slug)"
      back-to="/admin/projects"
      back-label="Projek"
    >
      <template #meta>
        <AdminBadge
          :tone="form.status === 'published' ? 'success' : form.status === 'in_development' ? 'warning' : 'neutral'"
          dot
        >
          {{ statusOptions.find(o => o.value === form.status)?.label }}
        </AdminBadge>
        <span v-if="!isNew" class="text-[var(--ad-fg-subtle)]">/{{ form.slug }}</span>
        <AdminBadge v-if="isDirty" tone="accent">Belum disimpan</AdminBadge>
      </template>

      <template #actions>
        <AdminButton
          v-if="!isNew && form.status === 'published'"
          :href="`/work/${form.slug}`"
          variant="ghost"
          icon="external"
        >
          Lihat
        </AdminButton>
        <AdminButton v-if="!isNew" variant="danger" icon="trash" @click="remove">Hapus</AdminButton>
      </template>
    </AdminPageHeader>

    <form class="space-y-5" @submit.prevent="save">
      <AdminCard title="Informasi dasar" icon="info">
        <div class="space-y-5">
          <div class="grid gap-4 md:grid-cols-2">
            <AdminField label="Slug" required hint="URL projek: /work/slug — huruf kecil, angka, tanda hubung.">
              <input
                v-model="form.slug"
                type="text"
                required
                pattern="[a-z0-9\-]+"
                placeholder="rumah-selat"
                class="cms-input"
                @input="slugTouched = true"
              />
            </AdminField>

            <AdminField label="Status" hint="Hanya status published yang tampil di situs publik.">
              <select v-model="form.status" class="cms-select">
                <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </AdminField>
          </div>

          <AdminI18nField v-model="form.title" label="Judul" required placeholder="Rumah Selat" />

          <div class="grid gap-4 md:grid-cols-3">
            <AdminField label="Tahun">
              <input v-model.number="form.year" type="number" min="1900" max="2100" placeholder="2024" class="cms-input" />
            </AdminField>

            <AdminField label="Kategori">
              <select v-model="form.category_slug" class="cms-select">
                <option value="">— Pilih —</option>
                <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name.id }}</option>
              </select>
            </AdminField>

            <AdminField label="Urutan" hint="Makin kecil, makin awal tampil.">
              <input v-model.number="form.sort_order" type="number" min="0" class="cms-input" />
            </AdminField>
          </div>

          <AdminI18nField v-model="form.location" label="Lokasi" placeholder="Bali, Indonesia" />

          <AdminField label="Kolaborator" hint="Pisahkan dengan koma.">
            <input
              v-model="form.partners"
              type="text"
              placeholder="Studio Tanah, Arch. Putri Maharani"
              class="cms-input"
            />
          </AdminField>

          <label class="cms-switch-row rounded-[var(--ad-radius-sm)] border border-[var(--ad-border)] bg-[var(--ad-surface-sunk)] px-3.5 py-3">
            <input v-model="form.is_featured" type="checkbox" class="cms-check" />
            <span class="min-w-0">
              <span class="block text-[13px]">Tampilkan di showcase homepage</span>
              <span class="block text-[11.5px] text-[var(--ad-fg-subtle)]">
                Projek featured muncul di section utama halaman depan.
              </span>
            </span>
          </label>
        </div>
      </AdminCard>

      <AdminCard title="Konten" icon="edit" description="Teks dua bahasa — kolom ID wajib, EN opsional tapi disarankan.">
        <div class="space-y-5">
          <AdminI18nField v-model="form.description" label="Deskripsi" type="textarea" :rows="5" />
          <AdminI18nField v-model="form.process_note" label="Catatan proses" type="textarea" :rows="4" />
          <AdminI18nList v-model="form.services_performed" label="Layanan yang dikerjakan" :rows="4" />
        </div>
      </AdminCard>

      <AdminCard title="Fakta" icon="info" description="Fact sheet di halaman projek. Baris kosong tidak ditampilkan.">
        <div class="space-y-5">
          <div class="grid gap-4 md:grid-cols-3">
            <AdminField label="Status bangunan" hint="Tampil sebagai Status publik (beda dengan status publish).">
              <select v-model="form.build_status" class="cms-select">
                <option value="">— Tidak ditampilkan —</option>
                <option v-for="o in buildStatusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </AdminField>
            <AdminField label="Luas tapak (m²)">
              <input v-model.number="form.area_site_m2" type="number" min="0.1" step="0.1" placeholder="2800" class="cms-input" />
            </AdminField>
            <AdminField label="Luas bangunan (m²)">
              <input v-model.number="form.area_built_m2" type="number" min="0.1" step="0.1" placeholder="1240" class="cms-input" />
            </AdminField>
          </div>

          <div class="space-y-3">
            <span class="cms-label">Klien</span>
            <div class="cms-seg" role="group" aria-label="Tampilan nama klien">
              <button
                v-for="o in clientModeOptions"
                :key="o.value"
                type="button"
                class="cms-seg-item"
                :aria-pressed="form.client_mode === o.value"
                @click="form.client_mode = o.value"
              >
                {{ o.label }}
              </button>
            </div>
            <p class="cms-hint">
              <template v-if="form.client_mode === 'private'">
                Publik melihat “{{ PRIVATE_CLIENT_LABEL.id }}” / “{{ PRIVATE_CLIENT_LABEL.en }}”.
              </template>
              <template v-else-if="form.client_mode === 'alias'">Publik melihat alias di bawah.</template>
              <template v-else>Publik melihat nama asli klien.</template>
            </p>

            <AdminI18nField
              v-if="form.client_mode === 'alias'"
              v-model="form.client_alias"
              label="Alias klien"
              required
              placeholder="Rumah produksi independen"
            />

            <AdminField
              label="Nama asli klien"
              :required="form.client_mode === 'name'"
              :hint="form.client_mode === 'name'
                ? 'Ditampilkan publik.'
                : 'Privat — hanya admin yang bisa membaca. Tidak pernah dikirim ke situs publik.'"
            >
              <span class="relative block">
                <input v-model="form.client_name" type="text" maxlength="200" placeholder="PT Contoh Abadi" class="cms-input cms-input-action" />
                <span v-if="form.client_mode !== 'name'" class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ad-fg-subtle)]">
                  <AdminIcon name="lock" :size="13" />
                </span>
              </span>
            </AdminField>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <AdminTagInput
              v-model="form.team"
              label="Tim studio"
              :suggestions="teamNames"
              hint="Enter atau koma untuk menambah. Nama dari halaman Tim muncul sebagai saran."
            />
            <AdminField label="Fotografer">
              <input v-model="form.photographer" type="text" maxlength="200" placeholder="Mario Wibowo" class="cms-input" />
            </AdminField>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Lokasi" icon="compass" description="Koordinat persis hanya bisa dibaca admin. Publik melihat versi dibulatkan (±1 km) atau tidak sama sekali.">
        <div class="space-y-5">
          <AdminField label="Tempel dari Google Maps" :error="coordsPasteError" hint="Klik kanan titik di Google Maps → salin angka, lalu tempel di sini.">
            <span class="flex gap-2">
              <input
                v-model="coordsPaste"
                type="text"
                placeholder="-6.1754, 106.8272"
                class="cms-input"
                @keydown.enter.prevent="applyPastedCoords"
                @paste="onCoordsPaste"
              />
              <AdminButton variant="secondary" @click="applyPastedCoords">Pakai</AdminButton>
            </span>
          </AdminField>

          <div class="grid gap-4 md:grid-cols-[1fr_1fr_200px]">
            <AdminField label="Latitude" hint="Selatan khatulistiwa = negatif.">
              <input v-model.number="form.lat" type="number" step="any" min="-90" max="90" placeholder="-6.1754" class="cms-input" />
            </AdminField>
            <AdminField label="Longitude">
              <input v-model.number="form.lng" type="number" step="any" min="-180" max="180" placeholder="106.8272" class="cms-input" />
            </AdminField>
            <div>
              <span class="cms-label">Pratinjau</span>
              <!-- Indonesia bounds box; the marker should sit inside it. -->
              <div class="relative aspect-[47/18] overflow-hidden rounded-[var(--ad-radius-sm)] border border-[var(--ad-border)] bg-[#1a1b26]">
                <span
                  v-if="locator?.inside"
                  class="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-white"
                  :style="{ left: `${locator.x * 100}%`, top: `${locator.y * 100}%` }"
                />
              </div>
            </div>
          </div>
          <p v-if="locator && !locator.inside" class="flex items-center gap-1.5 text-[12px] text-[var(--ad-warning)]">
            <AdminIcon name="alert" :size="13" />
            Titik di luar Indonesia — cek tanda minus atau urutan lat/lng.
          </p>

          <label class="cms-switch-row rounded-[var(--ad-radius-sm)] border border-[var(--ad-border)] bg-[var(--ad-surface-sunk)] px-3.5 py-3">
            <input v-model="form.hide_location" type="checkbox" class="cms-check" />
            <span class="min-w-0">
              <span class="block text-[13px]">Sembunyikan lokasi</span>
              <span class="block text-[11.5px] text-[var(--ad-fg-subtle)]">
                Tidak ada koordinat di situs publik (fact sheet, peta, JSON-LD). Hanya teks Lokasi di atas yang tampil — tulis seperlunya, mis. “Bali”.
              </span>
            </span>
          </label>

          <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ad-fg-muted)]">
            <span><span class="cms-eyebrow mr-1.5">Publik</span>{{ publicCoords }}</span>
            <a v-if="mapsLink" :href="mapsLink" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-[var(--ad-accent)]">
              Cek di Google Maps <AdminIcon name="external" :size="12" />
            </a>
          </p>
        </div>
      </AdminCard>

      <AdminCard title="Bab" icon="layers" description="Teks pembuka per bab dossier. Bab tanpa teks, gambar, atau gambar kerja tidak ditampilkan.">
        <template #actions>
          <span class="text-[11.5px] text-[var(--ad-fg-subtle)]">{{ filledChapters }} / {{ CHAPTERS.length }} terisi</span>
        </template>
        <div class="space-y-2">
          <details
            v-for="c in CHAPTERS"
            :key="c"
            class="rounded-[var(--ad-radius-sm)] border border-[var(--ad-border)] bg-[var(--ad-surface-sunk)] px-3.5 py-2.5"
          >
            <summary class="flex cursor-pointer items-center gap-2 text-[13px]">
              <span
                class="h-2 w-2 shrink-0 border border-[var(--ad-fg-subtle)]"
                :class="form.chapter_text[c].id.trim() || form.chapter_text[c].en.trim() ? 'bg-[var(--ad-accent)] border-[var(--ad-accent)]' : ''"
                aria-hidden="true"
              />
              {{ chapterLabels[c] }}
              <span class="ml-auto text-[11px] text-[var(--ad-fg-subtle)]">
                {{ form.chapter_text[c].id.trim() || form.chapter_text[c].en.trim() ? 'terisi' : 'kosong' }}
              </span>
            </summary>
            <div class="pt-3">
              <AdminI18nField v-model="form.chapter_text[c]" :label="chapterLabels[c]" type="textarea" :rows="4" />
            </div>
          </details>
        </div>
      </AdminCard>

      <AdminCard title="Media" icon="image">
        <AdminImageUpload
          v-model="form.cover_image"
          label="Gambar cover"
          bucket="project-images"
          folder="cover"
          hint="Tampil di list projek, hero detail page, dan OG image. Rasio 16:9 disarankan."
        />
      </AdminCard>

      <AdminProjectGalleryManager :project-id="projectId" :project-slug="form.slug || slugParam" />

      <AdminProjectDrawingsManager :project-id="projectId" :project-slug="form.slug || slugParam" />

      <AdminProjectMaterialsManager :project-id="projectId" :project-slug="form.slug || slugParam" />

      <AdminCard title="SEO" icon="globe" description="Opsional — kosongkan untuk memakai judul dan deskripsi projek.">
        <div class="space-y-5">
          <AdminI18nField v-model="form.seo_title" label="Title meta" placeholder="60–70 karakter" />
          <AdminI18nField
            v-model="form.seo_description"
            label="Description meta"
            type="textarea"
            :rows="3"
            placeholder="150–160 karakter"
          />
        </div>
      </AdminCard>

      <!-- Sticky action bar -->
      <div class="sticky bottom-0 -mx-4 mt-2 border-t border-[var(--ad-border)] bg-[rgba(20,21,29,0.92)] px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
        <div class="mx-auto flex max-w-[980px] flex-wrap items-center gap-3">
          <AdminButton type="submit" variant="primary" icon="save" :loading="status === 'saving'">
            {{ isNew ? 'Buat projek' : 'Simpan perubahan' }}
          </AdminButton>
          <AdminButton to="/admin/projects" variant="ghost">Batal</AdminButton>

          <p v-if="errorMessage" class="cms-error-text flex items-center gap-1.5">
            <AdminIcon name="alert" :size="13" />
            {{ errorMessage }}
          </p>
          <p v-else-if="isDirty" class="text-[12px] text-[var(--ad-fg-subtle)]">Ada perubahan yang belum disimpan.</p>
          <p v-else-if="!isNew" class="flex items-center gap-1.5 text-[12px] text-[var(--ad-fg-subtle)]">
            <AdminIcon name="check" :size="13" />
            Tersimpan
          </p>
        </div>
      </div>
    </form>
  </div>
</template>
