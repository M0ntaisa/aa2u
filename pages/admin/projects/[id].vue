<script setup lang="ts">
import type { Project, ProjectStatus, Category, I18nField, I18nList } from '~/types/content'

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
})

const categories = ref<Category[]>([])
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

async function loadProject() {
  if (isNew.value) return
  status.value = 'loading'

  let p: Project | null = null

  if (isPlaceholder) {
    const { projectBySlug } = await import('~/data/projects')
    p = projectBySlug(slugParam.value) ?? null
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
  }

  if (!p) {
    throw createError({ statusCode: 404, statusMessage: 'Projek tidak ditemukan' })
  }

  projectId.value = (p as any).id ?? null

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
    seo_title: (p as any).seo_title ?? blankI18n(),
    seo_description: (p as any).seo_description ?? blankI18n(),
  }

  status.value = 'idle'
}

await loadCategories()
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

const validationError = computed(() => {
  if (!form.value.slug.trim()) return 'Slug wajib diisi.'
  if (!/^[a-z0-9-]+$/.test(form.value.slug)) return 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'
  if (!form.value.title.id.trim()) return 'Judul (ID) wajib diisi.'
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
    year: form.value.year,
    location: form.value.location,
    category_id,
    status: form.value.status,
    partners: form.value.partners.split(',').map(s => s.trim()).filter(Boolean),
    description: form.value.description,
    process_note: form.value.process_note,
    services_performed: form.value.services_performed,
    cover_image: form.value.cover_image || null,
    sort_order: form.value.sort_order,
    is_featured: form.value.is_featured,
    seo_title: form.value.seo_title,
    seo_description: form.value.seo_description,
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

  const query = isNew.value
    ? supabase.from('projects').insert(payload).select('id, slug').maybeSingle()
    : supabase.from('projects').update(payload).eq('slug', slugParam.value).select('id, slug').maybeSingle()
  const { data: saved, error } = await query

  if (error) {
    status.value = 'error'
    errorMessage.value = (error as any).code === '23505'
      ? `Slug "${form.value.slug}" sudah dipakai projek lain.`
      : error.message
    toast.error('Gagal menyimpan', errorMessage.value)
    return
  }

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
                pattern="[a-z0-9-]+"
                placeholder="rumah-selat"
                class="ad-input"
                @input="slugTouched = true"
              />
            </AdminField>

            <AdminField label="Status" hint="Hanya status published yang tampil di situs publik.">
              <select v-model="form.status" class="ad-select">
                <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </AdminField>
          </div>

          <AdminI18nField v-model="form.title" label="Judul" required placeholder="Rumah Selat" />

          <div class="grid gap-4 md:grid-cols-3">
            <AdminField label="Tahun">
              <input v-model.number="form.year" type="number" min="1900" max="2100" placeholder="2024" class="ad-input" />
            </AdminField>

            <AdminField label="Kategori">
              <select v-model="form.category_slug" class="ad-select">
                <option value="">— Pilih —</option>
                <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name.id }}</option>
              </select>
            </AdminField>

            <AdminField label="Urutan" hint="Makin kecil, makin awal tampil.">
              <input v-model.number="form.sort_order" type="number" min="0" class="ad-input" />
            </AdminField>
          </div>

          <AdminI18nField v-model="form.location" label="Lokasi" placeholder="Bali, Indonesia" />

          <AdminField label="Kolaborator" hint="Pisahkan dengan koma.">
            <input
              v-model="form.partners"
              type="text"
              placeholder="Studio Tanah, Arch. Putri Maharani"
              class="ad-input"
            />
          </AdminField>

          <label class="ad-switch-row rounded-[var(--ad-radius-sm)] border border-[var(--ad-border)] bg-[var(--ad-surface-sunk)] px-3.5 py-3">
            <input v-model="form.is_featured" type="checkbox" class="ad-check" />
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

          <p v-if="errorMessage" class="ad-error-text flex items-center gap-1.5">
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
