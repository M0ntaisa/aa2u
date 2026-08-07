<script setup lang="ts">
import type { I18nField } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

interface PrincipleRow {
  id: string | null
  title: I18nField
  description: I18nField
  sort_order: number
  _saving?: boolean
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()

const items = ref<PrincipleRow[]>([])
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')

const blankI18n = (): I18nField => ({ id: '', en: '' })

async function load() {
  status.value = 'loading'
  errorMessage.value = ''

  if (isPlaceholder) {
    const m = await import('~/data/principles')
    items.value = m.principles.map((p, idx) => ({
      id: null,
      title: p.title,
      description: p.description ?? blankI18n(),
      sort_order: p.sort_order ?? idx,
    }))
    status.value = 'idle'
    return
  }

  const { data, error } = await supabase
    .from('studio_principles')
    .select('id, title, description, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  items.value = (data ?? []).map((d: any) => ({
    id: d.id,
    title: d.title ?? blankI18n(),
    description: d.description ?? blankI18n(),
    sort_order: d.sort_order ?? 0,
  }))
  status.value = 'idle'
}

await load()

function addRow() {
  items.value.push({
    id: null,
    title: blankI18n(),
    description: blankI18n(),
    sort_order: items.value.length,
  })
}

async function saveRow(row: PrincipleRow) {
  if (isPlaceholder) {
    toast.warning('Mode demo', 'Aktifkan Supabase di .env untuk menyimpan.')
    return
  }
  if (!row.title.id.trim()) {
    row._error = 'Judul (ID) wajib diisi.'
    return
  }

  row._saving = true
  row._error = ''

  const payload = {
    title: row.title,
    description: row.description,
    sort_order: row.sort_order,
  }

  const query = row.id
    ? supabase.from('studio_principles').update(payload).eq('id', row.id).select('id').maybeSingle()
    : supabase.from('studio_principles').insert(payload).select('id').maybeSingle()

  const { data, error } = await query
  row._saving = false

  if (error) {
    row._error = error.message
    toast.error('Gagal menyimpan', error.message)
    return
  }

  const wasNew = !row.id
  if (wasNew && data?.id) row.id = data.id
  toast.success(wasNew ? 'Prinsip dibuat' : 'Prinsip diperbarui')
}

async function removeRow(row: PrincipleRow) {
  const ok = await ask({
    title: 'Hapus prinsip?',
    message: `"${row.title.id || '(tanpa judul)'}" akan dihapus dari halaman /about.`,
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

  const { error } = await supabase.from('studio_principles').delete().eq('id', row.id)
  if (error) {
    row._error = error.message
    toast.error('Gagal menghapus', error.message)
    return
  }
  drop()
  toast.success('Prinsip dihapus')
}
</script>

<template>
  <div class="mx-auto max-w-[960px]">
    <AdminPageHeader title="Prinsip studio" description="Nilai kerja yang tampil di halaman /about.">
      <template #meta>
        <span class="text-[var(--ad-fg-subtle)]">·</span>
        <span>{{ items.length }} prinsip</span>
      </template>
      <template #actions>
        <AdminButton variant="primary" icon="plus" @click="addRow">Tambah prinsip</AdminButton>
      </template>
    </AdminPageHeader>

    <div v-if="status === 'loading'" class="space-y-3">
      <div v-for="i in 3" :key="i" class="ad-skeleton h-40 w-full" />
    </div>

    <div
      v-else-if="status === 'error'"
      class="ad-panel flex items-start gap-2.5 p-4 text-[13px] text-[var(--ad-danger)]"
    >
      <AdminIcon name="alert" :size="15" class="mt-0.5" />
      {{ errorMessage }}
    </div>

    <div v-else-if="items.length" class="space-y-3">
      <AdminCard
        v-for="(row, i) in items"
        :key="row.id ?? `new-${i}`"
        :title="row.title.id || `Prinsip ${String(i + 1).padStart(2, '0')}`"
      >
        <template #actions>
          <AdminField label="Urutan" class="w-20">
            <input v-model.number="row.sort_order" type="number" min="0" class="ad-input ad-input-compact" />
          </AdminField>
        </template>

        <div class="space-y-5">
          <AdminI18nField v-model="row.title" label="Judul" required placeholder="Berpikir / Think" />
          <AdminI18nField
            v-model="row.description"
            label="Deskripsi"
            type="textarea"
            :rows="3"
            placeholder="Kalimat ringkas yang menjelaskan prinsip ini"
          />

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
      </AdminCard>
    </div>

    <AdminEmptyState
      v-else
      icon="compass"
      title="Belum ada prinsip"
      description="Prinsip studio mengisi bagian manifesto di halaman /about."
    >
      <AdminButton variant="primary" size="sm" icon="plus" @click="addRow">Tambah prinsip</AdminButton>
    </AdminEmptyState>
  </div>
</template>
