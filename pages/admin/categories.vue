<script setup lang="ts">
import type { I18nField } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface CategoryRow {
  id: string | null
  slug: string
  name: I18nField
  sort_order: number
  _saving?: boolean
  _saved?: boolean
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()

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

async function saveRow(row: CategoryRow) {
  if (isPlaceholder) {
    alert('Mode demo: aktifkan Supabase di .env untuk menyimpan.')
    return
  }
  if (!row.slug || !row.name.id) {
    row._error = 'Slug dan nama (ID) wajib diisi.'
    return
  }

  row._saving = true
  row._saved = false
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
    row._error = error.message
    return
  }

  if (!row.id && data?.id) row.id = data.id
  row._saved = true
  setTimeout(() => { row._saved = false }, 1500)
}

async function removeRow(row: CategoryRow, index: number) {
  if (!confirm(`Hapus kategori "${row.name.id || row.slug}"?`)) return

  if (!row.id) {
    items.value.splice(index, 1)
    return
  }

  if (isPlaceholder) {
    alert('Mode demo: tidak ada yang akan dihapus.')
    return
  }

  const { error } = await supabase.from('categories').delete().eq('id', row.id)
  if (error) {
    row._error = error.message
    return
  }
  items.value.splice(index, 1)
}
</script>

<template>
  <div class="px-8 py-10">
    <header class="flex items-end justify-between mb-10">
      <div>
        <h1 class="font-display text-4xl tracking-tight">Kategori</h1>
        <p class="mt-2 text-sm text-[var(--color-muted)]">
          {{ items.length }} kategori · digunakan untuk grouping projek
        </p>
      </div>
      <button
        type="button"
        class="text-sm uppercase tracking-[0.2em] border border-white/40 hover:border-white px-5 py-2.5 transition-colors"
        @click="addRow"
      >
        + Tambah
      </button>
    </header>

    <div v-if="status === 'loading'" class="text-sm text-[var(--color-muted)]">Memuat…</div>
    <div v-else-if="status === 'error'" class="text-sm text-red-400">{{ errorMessage }}</div>

    <div v-else-if="items.length" class="space-y-4">
      <div
        v-for="(row, i) in items"
        :key="row.id ?? `new-${i}`"
        class="border border-white/10 p-5 grid md:grid-cols-[120px_1fr_auto] gap-4 items-start"
      >
        <label class="block">
          <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Slug *</span>
          <input
            v-model="row.slug"
            type="text"
            pattern="[a-z0-9-]+"
            placeholder="residensial"
            class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
          />
          <label class="mt-3 block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Urutan</span>
            <input
              v-model.number="row.sort_order"
              type="number"
              min="0"
              class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
            />
          </label>
        </label>

        <AdminI18nField v-model="row.name" label="Nama" required placeholder="Residensial / Residential" />

        <div class="flex flex-col gap-2 items-stretch">
          <button
            type="button"
            class="text-xs uppercase tracking-[0.2em] border border-white/40 hover:border-white px-4 py-2 transition-colors disabled:opacity-30"
            :disabled="row._saving"
            @click="saveRow(row)"
          >
            {{ row._saving ? 'Menyimpan…' : (row.id ? 'Simpan' : 'Buat') }}
          </button>
          <button
            type="button"
            class="text-xs uppercase tracking-[0.2em] border border-red-500/40 text-red-300 hover:bg-red-500/10 px-4 py-2 transition-colors"
            @click="removeRow(row, i)"
          >
            Hapus
          </button>
          <span v-if="row._saved" class="text-xs text-emerald-300 text-center">Tersimpan ✓</span>
          <span v-if="row._error" class="text-xs text-red-400">{{ row._error }}</span>
        </div>
      </div>
    </div>

    <div v-else class="border border-white/10 px-8 py-16 text-center text-[var(--color-muted)]">
      Belum ada kategori. <button class="underline" @click="addRow">Tambah satu</button>.
    </div>

    <p v-if="isPlaceholder" class="mt-6 text-xs text-amber-300">
      Mode demo: perubahan tidak akan tersimpan. Aktifkan Supabase di <code>.env</code>.
    </p>
  </div>
</template>
