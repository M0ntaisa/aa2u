<script setup lang="ts">
import type { I18nField } from '~/types/content'

const props = defineProps<{
  projectId: string | null
  projectSlug: string
}>()

interface MaterialItem {
  id: string
  name: I18nField
  note: I18nField
  image: string
  sort_order: number
  _saving?: boolean
  _error?: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()

const items = ref<MaterialItem[]>([])
const status = ref<'idle' | 'loading' | 'adding' | 'error'>('idle')
const errorMessage = ref('')

const blankI18n = (): I18nField => ({ id: '', en: '' })
const SELECT = 'id, name, note, image, sort_order'

const draft = ref({ name: blankI18n(), note: blankI18n(), image: '' })

const toItem = (d: any): MaterialItem => ({
  id: d.id,
  name: d.name ?? blankI18n(),
  note: d.note ?? blankI18n(),
  image: d.image ?? '',
  sort_order: d.sort_order,
})

async function load() {
  if (!props.projectId || isPlaceholder) return
  status.value = 'loading'
  const { data, error } = await supabase
    .from('project_materials')
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
  useProjectMediaReorder(items, 'project_materials', 'Urutan material diperbarui')

async function add() {
  if (!props.projectId) return
  if (!draft.value.name.id.trim()) {
    errorMessage.value = 'Nama material (ID) wajib diisi.'
    return
  }
  status.value = 'adding'
  errorMessage.value = ''
  const nextOrder = items.value.length
    ? Math.max(...items.value.map(i => i.sort_order)) + 1
    : 0
  const { data, error } = await (supabase.from('project_materials') as any)
    .insert({
      project_id: props.projectId,
      name: draft.value.name,
      note: draft.value.note,
      image: draft.value.image || null,
      sort_order: nextOrder,
    })
    .select(SELECT)
    .maybeSingle()
  status.value = 'idle'

  if (error) {
    errorMessage.value = error.message
    toast.error('Gagal menambah material', error.message)
    return
  }
  if (data) items.value.push(toItem(data))
  draft.value = { name: blankI18n(), note: blankI18n(), image: '' }
  toast.success('Material ditambahkan')
}

async function saveItem(item: MaterialItem) {
  if (!item.name.id.trim()) {
    item._error = 'Nama material (ID) wajib diisi.'
    return
  }
  item._saving = true
  item._error = ''
  const { error } = await (supabase.from('project_materials') as any)
    .update({ name: item.name, note: item.note, image: item.image || null })
    .eq('id', item.id)
  item._saving = false
  if (error) {
    item._error = error.message
    toast.error('Gagal menyimpan', error.message)
    return
  }
  toast.success('Material tersimpan')
}

async function removeItem(item: MaterialItem) {
  const ok = await ask({
    title: 'Hapus material?',
    message: `"${item.name.id}" akan dihapus. File foto di storage tidak ikut terhapus.`,
    confirmLabel: 'Hapus',
    tone: 'danger',
  })
  if (!ok) return

  const { error } = await supabase.from('project_materials').delete().eq('id', item.id)
  if (error) {
    item._error = error.message
    toast.error('Gagal menghapus', error.message)
    return
  }
  items.value = items.value.filter(i => i.id !== item.id)
  toast.success('Material dihapus')
}
</script>

<template>
  <AdminCard title="Material" icon="layers" description="3–5 material utama, tampil sebagai strip swatch di bab Material.">
    <template #actions>
      <span v-if="items.length" class="text-[11.5px] text-[var(--ad-fg-subtle)]">{{ items.length }} material</span>
    </template>

    <AdminEmptyState
      v-if="!projectId"
      icon="save"
      title="Simpan projek dulu"
      description="Material butuh ID projek. Simpan sebagai draft, lalu tambahkan di sini."
    />

    <AdminEmptyState
      v-else-if="isPlaceholder"
      icon="database"
      title="Tidak tersedia di mode demo"
      description="Aktifkan Supabase di .env untuk mengelola material."
    />

    <template v-else>
      <ul v-if="status === 'loading'" class="space-y-3">
        <li v-for="i in 2" :key="i" class="cms-skeleton h-32 w-full" />
      </ul>

      <ul v-else-if="items.length" class="mb-6 space-y-3">
        <li
          v-for="(item, i) in items"
          :key="item.id"
          class="grid gap-4 rounded-[var(--ad-radius-sm)] border p-4 transition-colors md:grid-cols-[160px_1fr]"
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
            <AdminImageUpload
              v-model="item.image"
              label="Foto makro"
              bucket="project-images"
              :folder="`materials/${projectSlug}`"
              aspect="aspect-square"
            />
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
          </div>

          <div class="space-y-4">
            <AdminI18nField v-model="item.name" label="Nama" required placeholder="Batu paras Kerobokan" />
            <AdminI18nField v-model="item.note" label="Catatan" placeholder="Asal / finishing" />
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

      <div class="rounded-[var(--ad-radius-sm)] border border-dashed border-[var(--ad-border-strong)] p-4">
        <p class="cms-eyebrow mb-3">Material baru</p>
        <div class="grid gap-4 md:grid-cols-[160px_1fr]">
          <AdminImageUpload
            v-model="draft.image"
            label="Foto makro"
            bucket="project-images"
            :folder="`materials/${projectSlug}`"
            aspect="aspect-square"
          />
          <div class="space-y-4">
            <AdminI18nField v-model="draft.name" label="Nama" required placeholder="Batu paras Kerobokan" />
            <AdminI18nField v-model="draft.note" label="Catatan" placeholder="Asal / finishing" />
            <AdminButton variant="secondary" size="sm" icon="plus" :loading="status === 'adding'" @click="add">
              Tambah material
            </AdminButton>
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="cms-error-text mt-4">{{ errorMessage }}</p>
    </template>
  </AdminCard>
</template>
