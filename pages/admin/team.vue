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
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()

const items = ref<TeamRow[]>([])
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')
const search = ref('')

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

const activeCount = computed(() => items.value.filter(i => i.is_active).length)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(r =>
    r.name.toLowerCase().includes(q) || r.role.id.toLowerCase().includes(q),
  )
})

function addRow() {
  items.value.unshift(blankRow(items.value.length))
  search.value = ''
}

async function saveRow(row: TeamRow) {
  if (isPlaceholder) {
    toast.warning('Mode demo', 'Aktifkan Supabase di .env untuk menyimpan.')
    return
  }
  if (!row.name.trim()) {
    row._error = 'Nama wajib diisi.'
    return
  }
  if (!row.role.id.trim()) {
    row._error = 'Peran (ID) wajib diisi.'
    return
  }

  row._saving = true
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
    toast.error('Gagal menyimpan', error.message)
    return
  }

  const wasNew = !row.id
  if (wasNew && data?.id) row.id = data.id
  toast.success(wasNew ? `${row.name} ditambahkan` : `${row.name} diperbarui`)
}

/** Splice by identity — `filtered` indexes don't line up with `items`. */
function drop(row: TeamRow) {
  const idx = items.value.indexOf(row)
  if (idx !== -1) items.value.splice(idx, 1)
}

async function removeRow(row: TeamRow) {
  const ok = await ask({
    title: 'Hapus anggota tim?',
    message: `"${row.name || '(tanpa nama)'}" akan dihapus dari halaman /about.`,
    confirmLabel: 'Hapus',
    tone: 'danger',
  })
  if (!ok) return

  if (!row.id) {
    drop(row)
    return
  }

  if (isPlaceholder) {
    toast.warning('Mode demo', 'Tidak ada yang dihapus.')
    return
  }

  const { error } = await supabase.from('team_members').delete().eq('id', row.id)
  if (error) {
    row._error = error.message
    toast.error('Gagal menghapus', error.message)
    return
  }
  drop(row)
  toast.success('Anggota dihapus')
}
</script>

<template>
  <div class="mx-auto max-w-[1080px]">
    <AdminPageHeader title="Tim" description="Anggota studio yang tampil di halaman /about.">
      <template #meta>
        <span class="text-[var(--ad-fg-subtle)]">·</span>
        <span>{{ items.length }} anggota</span>
        <span class="text-[var(--ad-fg-subtle)]">·</span>
        <span>{{ activeCount }} aktif</span>
      </template>
      <template #actions>
        <AdminButton variant="primary" icon="plus" @click="addRow">Tambah anggota</AdminButton>
      </template>
    </AdminPageHeader>

    <div v-if="items.length > 3" class="ad-input-group mb-4 max-w-xs">
      <span class="ad-input-group-icon"><AdminIcon name="search" :size="15" /></span>
      <input v-model="search" type="search" placeholder="Cari nama atau peran…" class="ad-input" />
    </div>

    <div v-if="status === 'loading'" class="space-y-4">
      <div v-for="i in 2" :key="i" class="ad-skeleton h-52 w-full" />
    </div>

    <div
      v-else-if="status === 'error'"
      class="ad-panel flex items-start gap-2.5 p-4 text-[13px] text-[var(--ad-danger)]"
    >
      <AdminIcon name="alert" :size="15" class="mt-0.5" />
      {{ errorMessage }}
    </div>

    <div v-else-if="filtered.length" class="space-y-4">
      <AdminCard v-for="(row, i) in filtered" :key="row.id ?? `new-${i}`">
        <template #actions>
          <AdminBadge :tone="row.is_active ? 'success' : 'neutral'" dot>
            {{ row.is_active ? 'Aktif' : 'Nonaktif' }}
          </AdminBadge>
        </template>

        <div class="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AdminImageUpload
            v-model="row.photo_url"
            label="Foto"
            bucket="team-photos"
            aspect="aspect-[4/5]"
            hint="Rasio 4:5 disarankan."
          />

          <div class="space-y-5">
            <div class="grid gap-4 md:grid-cols-[1fr_110px]">
              <AdminField label="Nama" required>
                <input v-model="row.name" type="text" required placeholder="Aditya Pratama" class="ad-input" />
              </AdminField>
              <AdminField label="Urutan">
                <input v-model.number="row.sort_order" type="number" min="0" class="ad-input" />
              </AdminField>
            </div>

            <AdminI18nField v-model="row.role" label="Peran" required placeholder="Principal Architect" />
            <AdminI18nField v-model="row.bio" label="Bio" type="textarea" :rows="3" />

            <div class="grid gap-4 md:grid-cols-2">
              <AdminField label="LinkedIn URL">
                <input v-model="row.social_linkedin" type="url" placeholder="https://linkedin.com/in/…" class="ad-input" />
              </AdminField>
              <AdminField label="Instagram URL">
                <input v-model="row.social_instagram" type="url" placeholder="https://instagram.com/…" class="ad-input" />
              </AdminField>
            </div>

            <label class="ad-switch-row">
              <input v-model="row.is_active" type="checkbox" class="ad-check" />
              <span class="text-[13px]">Tampilkan di halaman /about</span>
            </label>

            <div class="flex flex-wrap items-center gap-2.5 border-t border-[var(--ad-border)] pt-4">
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
              <p v-if="row._error" class="ad-error-text">{{ row._error }}</p>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>

    <AdminEmptyState
      v-else-if="search"
      icon="search"
      title="Tidak ada anggota yang cocok"
      description="Coba kata kunci lain."
    />

    <AdminEmptyState
      v-else
      icon="team"
      title="Belum ada anggota tim"
      description="Tambahkan profil arsitek dan staf agar halaman /about terisi."
    >
      <AdminButton variant="primary" size="sm" icon="plus" @click="addRow">Tambah anggota</AdminButton>
    </AdminEmptyState>
  </div>
</template>
