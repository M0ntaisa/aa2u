<script setup lang="ts">
import type { I18nField } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface TeamRow {
  id: string | null
  name: string
  role: I18nField
  bio: I18nField
  photo_url: string
  social_linkedin: string
  social_instagram: string
  is_active: boolean
  sort_order: number
  _saving?: boolean
  _saved?: boolean
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()

const items = ref<TeamRow[]>([])
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')

const blankI18n = (): I18nField => ({ id: '', en: '' })

const blankRow = (sort = 0): TeamRow => ({
  id: null,
  name: '',
  role: blankI18n(),
  bio: blankI18n(),
  photo_url: '',
  social_linkedin: '',
  social_instagram: '',
  is_active: true,
  sort_order: sort,
})

async function load() {
  status.value = 'loading'
  errorMessage.value = ''

  if (isPlaceholder) {
    const m = await import('~/data/team')
    items.value = m.team.map((t, idx) => ({
      id: null,
      name: t.name,
      role: t.role,
      bio: t.bio ?? blankI18n(),
      photo_url: t.photo_url ?? '',
      social_linkedin: t.social_linkedin ?? '',
      social_instagram: t.social_instagram ?? '',
      is_active: t.is_active !== false,
      sort_order: t.sort_order ?? idx,
    }))
    status.value = 'idle'
    return
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, role, bio, photo_url, social_linkedin, social_instagram, is_active, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  items.value = (data ?? []).map((d: any) => ({
    id: d.id,
    name: d.name ?? '',
    role: d.role ?? blankI18n(),
    bio: d.bio ?? blankI18n(),
    photo_url: d.photo_url ?? '',
    social_linkedin: d.social_linkedin ?? '',
    social_instagram: d.social_instagram ?? '',
    is_active: d.is_active !== false,
    sort_order: d.sort_order ?? 0,
  }))
  status.value = 'idle'
}

await load()

function addRow() {
  items.value.unshift(blankRow(items.value.length))
}

async function saveRow(row: TeamRow) {
  if (isPlaceholder) {
    alert('Mode demo: aktifkan Supabase di .env untuk menyimpan.')
    return
  }
  if (!row.name.trim()) {
    row._error = 'Nama wajib diisi.'
    return
  }
  if (!row.role.id) {
    row._error = 'Peran (ID) wajib diisi.'
    return
  }

  row._saving = true
  row._saved = false
  row._error = ''

  const payload = {
    name: row.name.trim(),
    role: row.role,
    bio: row.bio,
    photo_url: row.photo_url || null,
    social_linkedin: row.social_linkedin || null,
    social_instagram: row.social_instagram || null,
    is_active: row.is_active,
    sort_order: row.sort_order,
  }

  const query = row.id
    ? supabase.from('team_members').update(payload).eq('id', row.id).select('id').maybeSingle()
    : supabase.from('team_members').insert(payload).select('id').maybeSingle()

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

async function removeRow(row: TeamRow, index: number) {
  if (!confirm(`Hapus anggota "${row.name || '(tanpa nama)'}"?`)) return

  if (!row.id) {
    items.value.splice(index, 1)
    return
  }

  if (isPlaceholder) {
    alert('Mode demo: tidak ada yang akan dihapus.')
    return
  }

  const { error } = await supabase.from('team_members').delete().eq('id', row.id)
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
        <h1 class="font-display text-4xl tracking-tight">Tim</h1>
        <p class="mt-2 text-sm text-[var(--color-muted)]">
          {{ items.length }} anggota · tampil di halaman /about
        </p>
      </div>
      <button
        type="button"
        class="text-sm uppercase tracking-[0.2em] border border-white/40 hover:border-white px-5 py-2.5 transition-colors"
        @click="addRow"
      >
        + Tambah anggota
      </button>
    </header>

    <div v-if="status === 'loading'" class="text-sm text-[var(--color-muted)]">Memuat…</div>
    <div v-else-if="status === 'error'" class="text-sm text-red-400">{{ errorMessage }}</div>

    <div v-else-if="items.length" class="space-y-6">
      <article
        v-for="(row, i) in items"
        :key="row.id ?? `new-${i}`"
        class="border border-white/10 p-6 grid lg:grid-cols-[260px_1fr] gap-6"
      >
        <div>
          <ImageUpload
            v-model="row.photo_url"
            label="Foto"
            bucket="team-photos"
            aspect="aspect-[4/5]"
            hint="Rasio 4:5 disarankan."
          />
        </div>

        <div class="space-y-5">
          <div class="grid md:grid-cols-[1fr_120px_auto] gap-4">
            <label class="block">
              <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Nama *</span>
              <input
                v-model="row.name"
                type="text"
                required
                placeholder="Aditya Pratama"
                class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
              />
            </label>
            <label class="block">
              <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Urutan</span>
              <input
                v-model.number="row.sort_order"
                type="number"
                min="0"
                class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
              />
            </label>
            <label class="flex items-end gap-2 pb-2">
              <input v-model="row.is_active" type="checkbox" />
              <span class="text-sm">Aktif</span>
            </label>
          </div>

          <AdminI18nField v-model="row.role" label="Peran" required placeholder="Principal Architect" />
          <AdminI18nField v-model="row.bio" label="Bio" type="textarea" :rows="3" />

          <div class="grid md:grid-cols-2 gap-4">
            <label class="block">
              <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">LinkedIn URL</span>
              <input
                v-model="row.social_linkedin"
                type="url"
                placeholder="https://linkedin.com/in/…"
                class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
              />
            </label>
            <label class="block">
              <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Instagram URL</span>
              <input
                v-model="row.social_instagram"
                type="url"
                placeholder="https://instagram.com/…"
                class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
              />
            </label>
          </div>

          <div class="flex items-center gap-3 pt-3 border-t border-white/5">
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
            <span v-if="row._saved" class="text-xs text-emerald-300">Tersimpan ✓</span>
            <span v-if="row._error" class="text-xs text-red-400">{{ row._error }}</span>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="border border-white/10 px-8 py-16 text-center text-[var(--color-muted)]">
      Belum ada anggota tim. <button class="underline" @click="addRow">Tambah satu</button>.
    </div>

    <p v-if="isPlaceholder" class="mt-6 text-xs text-amber-300">
      Mode demo: perubahan tidak akan tersimpan. Aktifkan Supabase di <code>.env</code>.
    </p>
  </div>
</template>
