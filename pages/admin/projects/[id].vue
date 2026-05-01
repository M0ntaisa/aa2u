<script setup lang="ts">
import type { Project, ProjectStatus, Category, I18nField, I18nList } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()

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
const status = ref<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
const errorMessage = ref('')

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

async function save() {
  if (isPlaceholder) {
    alert('Mode demo: aktifkan Supabase di .env untuk menyimpan.')
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

  const { error } = isNew.value
    ? await supabase.from('projects').insert(payload)
    : await supabase.from('projects').update(payload).eq('slug', slugParam.value)

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  status.value = 'saved'
  router.push('/admin/projects')
}

async function remove() {
  if (!confirm(`Hapus projek "${form.value.slug}"? Tindakan ini tidak bisa dibatalkan.`)) return
  if (isPlaceholder) {
    alert('Mode demo: tidak ada yang akan dihapus.')
    return
  }
  const { error } = await supabase.from('projects').delete().eq('slug', slugParam.value)
  if (error) {
    errorMessage.value = error.message
    return
  }
  router.push('/admin/projects')
}
</script>

<template>
  <div class="px-8 py-10 max-w-5xl">
    <header class="mb-10 flex items-end justify-between">
      <div>
        <NuxtLink to="/admin/projects" class="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] hover:text-white">
          ← Projek
        </NuxtLink>
        <h1 class="mt-3 font-display text-4xl tracking-tight">
          {{ isNew ? 'Projek baru' : form.title.id || form.slug }}
        </h1>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="!isNew"
          type="button"
          class="text-xs uppercase tracking-[0.2em] border border-red-500/40 text-red-300 hover:bg-red-500/10 px-4 py-2 transition-colors"
          @click="remove"
        >
          Hapus
        </button>
      </div>
    </header>

    <form class="space-y-10" @submit.prevent="save">
      <!-- Basic -->
      <section class="border border-white/10 px-6 py-6 space-y-6">
        <h2 class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">Informasi dasar</h2>

        <div class="grid md:grid-cols-2 gap-4">
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Slug *</span>
            <input v-model="form.slug" type="text" required pattern="[a-z0-9-]+" placeholder="rumah-selat"
                   class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm" />
          </label>
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Status</span>
            <select v-model="form.status"
                    class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm">
              <option value="draft">Draft</option>
              <option value="in_development">In development</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <AdminI18nField v-model="form.title" label="Judul" required placeholder="Rumah Selat" />

        <div class="grid md:grid-cols-3 gap-4">
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Tahun</span>
            <input v-model.number="form.year" type="number" min="1900" max="2100" placeholder="2024"
                   class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm" />
          </label>
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Kategori</span>
            <select v-model="form.category_slug"
                    class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm">
              <option value="">— Pilih —</option>
              <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name.id }}</option>
            </select>
          </label>
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Urutan</span>
            <input v-model.number="form.sort_order" type="number" min="0"
                   class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm" />
          </label>
        </div>

        <AdminI18nField v-model="form.location" label="Lokasi" placeholder="Bali, Indonesia" />

        <label class="block">
          <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Kolaborator</span>
          <input v-model="form.partners" type="text" placeholder="Studio Tanah, Arch. Putri Maharani"
                 class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm" />
          <span class="text-[10px] text-[var(--color-muted)]">Pisahkan dengan koma</span>
        </label>

        <label class="flex items-center gap-3">
          <input v-model="form.is_featured" type="checkbox" class="bg-white/5" />
          <span class="text-sm">Tampilkan di showcase homepage</span>
        </label>
      </section>

      <!-- Content -->
      <section class="border border-white/10 px-6 py-6 space-y-6">
        <h2 class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">Konten</h2>
        <AdminI18nField v-model="form.description" label="Deskripsi" type="textarea" :rows="5" />
        <AdminI18nField v-model="form.process_note" label="Catatan proses" type="textarea" :rows="4" />
        <AdminI18nList v-model="form.services_performed" label="Layanan yang dikerjakan" :rows="4" />
      </section>

      <!-- Media -->
      <section class="border border-white/10 px-6 py-6 space-y-6">
        <h2 class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">Media</h2>
        <label class="block">
          <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">URL gambar cover</span>
          <input v-model="form.cover_image" type="url" placeholder="https://…"
                 class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm" />
          <span class="text-[10px] text-[var(--color-muted)]">Upload ke Supabase Storage atau paste URL eksternal. Manajemen gallery menyusul.</span>
        </label>
        <div v-if="form.cover_image" class="aspect-[16/9] overflow-hidden bg-white/5 max-w-md">
          <img :src="form.cover_image" alt="cover preview" class="w-full h-full object-cover" />
        </div>
      </section>

      <!-- SEO -->
      <section class="border border-white/10 px-6 py-6 space-y-6">
        <h2 class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">SEO (opsional)</h2>
        <AdminI18nField v-model="form.seo_title" label="Title meta" placeholder="60–70 karakter" />
        <AdminI18nField v-model="form.seo_description" label="Description meta" type="textarea" :rows="3" placeholder="150–160 karakter" />
      </section>

      <!-- Actions -->
      <div class="flex items-center gap-4 pt-4 border-t border-white/10">
        <button
          type="submit"
          :disabled="status === 'saving'"
          class="text-sm uppercase tracking-[0.25em] border border-white/40 hover:border-white px-6 py-3 transition-colors disabled:opacity-30"
        >
          {{ status === 'saving' ? 'Menyimpan…' : (isNew ? 'Buat projek' : 'Simpan perubahan') }}
        </button>
        <NuxtLink to="/admin/projects" class="text-sm text-[var(--color-muted)] hover:text-white">
          Batal
        </NuxtLink>
        <span v-if="status === 'error'" class="text-sm text-red-400">{{ errorMessage }}</span>
        <span v-if="status === 'saved'" class="text-sm text-emerald-300">Tersimpan ✓</span>
      </div>
    </form>
  </div>
</template>
