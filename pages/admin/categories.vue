<script setup lang="ts">
import type { I18nField } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface CategoryRow {
  id: string | null
  slug: string
  name: I18nField
  sort_order: number
  _saving?: boolean
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()

const items = ref<CategoryRow[]>([])
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')

const blankI18n = (): I18nField => ({ id: '', en: '' })

async function load() {
  status.value = 'loading'
  errorMessage.value = ''

  if (isPlaceholder) {
    const m = await import('~/data/projects')
    items.value = m.categories.map((c, idx) => ({
      id: null,
      slug: c.slug,
      name: c.name,
      sort_order: idx,
    }))
    status.value = 'idle'
    return
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  items.value = (data ?? []).map((d: any) => ({
    id: d.id,
    slug: d.slug,
    name: d.name ?? blankI18n(),
    sort_order: d.sort_order ?? 0,
  }))
  status.value = 'idle'
}

await load()

function addRow() {
  items.value.push({
    id: null,
    slug: '',
    name: blankI18n(),
    sort_order: items.value.length,
  })
}

/** Auto-slug from the Indonesian name while the row is still new. */
function syncSlug(row: CategoryRow) {
  if (row.id || row.slug) return
  row.slug = row.name.id
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function saveRow(row: CategoryRow) {
  if (isPlaceholder) {
    toast.warning('Mode demo', 'Aktifkan Supabase di .env untuk menyimpan.')
    return
  }
  if (!row.slug.trim() || !row.name.id.trim()) {
    row._error = 'Slug dan nama (ID) wajib diisi.'
    return
  }
  if (!/^[a-z0-9-]+$/.test(row.slug)) {
    row._error = 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'
    return
  }

  row._saving = true
  row._error = ''

  const payload = {
    slug: row.slug,
    name: row.name,
    sort_order: row.sort_order,
  }

  const query = row.id
    ? supabase.from('categories').update(payload).eq('id', row.id).select('id').maybeSingle()
    : supabase.from('categories').insert(payload).select('id').maybeSingle()

  const { data, error } = await query
  row._saving = false

  if (error) {
    row._error = (error as any).code === '23505'
      ? `Slug "${row.slug}" sudah dipakai kategori lain.`
      : error.message
    toast.error('Gagal menyimpan', row._error)
    return
  }

  const wasNew = !row.id
  if (wasNew && data?.id) row.id = data.id
  toast.success(wasNew ? 'Kategori dibuat' : 'Kategori diperbarui')
}

async function removeRow(row: CategoryRow) {
  const ok = await ask({
    title: 'Hapus kategori?',
    message: `"${row.name.id || row.slug}" akan dihapus. Projek yang memakainya akan kehilangan kategori.`,
    confirmLabel: 'Hapus',
    tone: 'danger',
  })
  if (!ok) return

  const drop = () => {
    const idx = items.value.indexOf(row)
    if (idx !== -1) items.value.splice(idx, 1)
  }

  if (!row.id) return drop()

  if (isPlaceholder) {
    toast.warning('Mode demo', 'Tidak ada yang dihapus.')
    return
  }

  const { error } = await supabase.from('categories').delete().eq('id', row.id)
  if (error) {
    row._error = error.message
    toast.error('Gagal menghapus', error.message)
    return
  }
  drop()
  toast.success('Kategori dihapus')
}
</script>

<template>
  <div class="mx-auto max-w-[960px]">
    <AdminPageHeader title="Kategori" description="Dipakai untuk grouping projek dan filter di halaman /work.">
      <template #meta>
        <span class="text-[var(--ad-fg-subtle)]">·</span>
        <span>{{ items.length }} kategori</span>
      </template>
      <template #actions>
        <AdminButton variant="primary" icon="plus" @click="addRow">Tambah kategori</AdminButton>
      </template>
    </AdminPageHeader>

    <div v-if="status === 'loading'" class="space-y-3">
      <div v-for="i in 3" :key="i" class="ad-skeleton h-24 w-full" />
    </div>

    <div
      v-else-if="status === 'error'"
      class="ad-panel flex items-start gap-2.5 p-4 text-[13px] text-[var(--ad-danger)]"
    >
      <AdminIcon name="alert" :size="15" class="mt-0.5" />
      {{ errorMessage }}
    </div>

    <div v-else-if="items.length" class="space-y-3">
      <AdminCard v-for="(row, i) in items" :key="row.id ?? `new-${i}`">
        <div class="grid gap-4 lg:grid-cols-[150px_1fr_auto]">
          <div class="space-y-4">
            <AdminField label="Slug" required>
              <input
                v-model="row.slug"
                type="text"
                pattern="[a-z0-9\-]+"
                placeholder="residensial"
                class="ad-input"
              />
            </AdminField>
            <AdminField label="Urutan">
              <input v-model.number="row.sort_order" type="number" min="0" class="ad-input" />
            </AdminField>
          </div>

          <div @blur.capture="syncSlug(row)">
            <AdminI18nField v-model="row.name" label="Nama" required placeholder="Residensial / Residential" />
          </div>

          <div class="flex flex-row gap-2 lg:w-32 lg:flex-col">
            <AdminButton
              variant="primary"
              size="sm"
              icon="save"
              :loading="row._saving"
              @click="saveRow(row)"
            >
              {{ row.id ? 'Simpan' : 'Buat' }}
            </AdminButton>
            <AdminButton variant="danger" size="sm" icon="trash" @click="removeRow(row)">Hapus</AdminButton>
          </div>
        </div>

        <p v-if="row._error" class="ad-error-text mt-3">{{ row._error }}</p>
      </AdminCard>
    </div>

    <AdminEmptyState
      v-else
      icon="tag"
      title="Belum ada kategori"
      description="Kategori mengelompokkan projek dan mengisi filter di halaman /work."
    >
      <AdminButton variant="primary" size="sm" icon="plus" @click="addRow">Tambah kategori</AdminButton>
    </AdminEmptyState>
  </div>
</template>
