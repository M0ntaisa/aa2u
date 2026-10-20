<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

interface Inquiry {
  id: string
  name: string
  email: string
  phone: string | null
  project_type: string | null
  message: string
  locale: string
  is_read: boolean
  created_at: string
}

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()
const { refreshUnread } = useAdminCounts()

const items = ref<Inquiry[]>([])
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')
const filter = ref<'all' | 'unread' | 'read'>('all')
const search = ref('')
const expandedId = ref<string | null>(null)

async function load() {
  status.value = 'loading'
  errorMessage.value = ''

  if (isPlaceholder) {
    items.value = []
    status.value = 'idle'
    return
  }

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  items.value = (data ?? []) as Inquiry[]
  status.value = 'idle'
}

await load()

const unreadCount = computed(() => items.value.filter(i => !i.is_read).length)

const counts = computed(() => ({
  all: items.value.length,
  unread: unreadCount.value,
  read: items.value.length - unreadCount.value,
}))

const filtered = computed(() => {
  let list = items.value
  if (filter.value === 'unread') list = list.filter(i => !i.is_read)
  if (filter.value === 'read') list = list.filter(i => i.is_read)

  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(i =>
      i.name.toLowerCase().includes(q)
      || i.email.toLowerCase().includes(q)
      || i.message.toLowerCase().includes(q)
      || (i.project_type ?? '').toLowerCase().includes(q),
    )
  }
  return list
})

const filterTabs: { key: 'all' | 'unread' | 'read'; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'unread', label: 'Belum dibaca' },
  { key: 'read', label: 'Sudah dibaca' },
]

function toggleExpand(inquiry: Inquiry) {
  if (expandedId.value === inquiry.id) {
    expandedId.value = null
    return
  }
  expandedId.value = inquiry.id
  if (!inquiry.is_read) void markRead(inquiry, true)
}

async function markRead(inquiry: Inquiry, read: boolean) {
  if (isPlaceholder) return
  const previous = inquiry.is_read
  inquiry.is_read = read

  const { error } = await supabase
    .from('inquiries')
    .update({ is_read: read })
    .eq('id', inquiry.id)

  if (error) {
    inquiry.is_read = previous
    errorMessage.value = error.message
    toast.error('Gagal memperbarui status', error.message)
    return
  }
  void refreshUnread()
}

async function markAllRead() {
  if (isPlaceholder) return
  const unread = items.value.filter(i => !i.is_read)
  if (!unread.length) return

  const ok = await ask({
    title: 'Tandai semua sudah dibaca?',
    message: `${unread.length} pesan akan ditandai sudah dibaca.`,
    confirmLabel: 'Tandai semua',
  })
  if (!ok) return

  const { error } = await supabase
    .from('inquiries')
    .update({ is_read: true })
    .in('id', unread.map(i => i.id))

  if (error) {
    toast.error('Gagal memperbarui', error.message)
    return
  }
  unread.forEach((i) => { i.is_read = true })
  void refreshUnread()
  toast.success(`${unread.length} pesan ditandai sudah dibaca`)
}

async function remove(inquiry: Inquiry) {
  const ok = await ask({
    title: 'Hapus pesan ini?',
    message: `Pesan dari ${inquiry.name} akan dihapus permanen.`,
    confirmLabel: 'Hapus permanen',
    tone: 'danger',
  })
  if (!ok) return
  if (isPlaceholder) return

  // .select() returns the deleted rows, so an RLS-blocked delete
  // (0 rows, no error) is detected instead of silently "succeeding".
  const { data, error } = await supabase
    .from('inquiries')
    .delete()
    .eq('id', inquiry.id)
    .select('id')
  if (error || !data?.length) {
    const message = error?.message || 'Pesan tidak terhapus — periksa izin admin.'
    errorMessage.value = message
    toast.error('Gagal menghapus', message)
    return
  }
  items.value = items.value.filter(i => i.id !== inquiry.id)
  if (expandedId.value === inquiry.id) expandedId.value = null
  void refreshUnread()
  toast.success('Pesan dihapus')
}

async function copyEmail(email: string) {
  try {
    await navigator.clipboard.writeText(email)
    toast.success('Email disalin', email)
  } catch {
    toast.error('Gagal menyalin email')
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** "3 hari lalu" style stamp — quicker to scan than a full timestamp. */
function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return formatDate(iso)
}

function replyHref(inquiry: Inquiry) {
  const body = encodeURIComponent(`Halo ${inquiry.name},\n\n`)
  return `mailto:${inquiry.email}?subject=Re: Pesan untuk AA2U&body=${body}`
}
</script>

<template>
  <div class="mx-auto max-w-[1080px]">
    <AdminPageHeader title="Inquiries" description="Pesan masuk dari form kontak situs.">
      <template #meta>
        <span class="text-[var(--ad-fg-subtle)]">·</span>
        <span>{{ counts.all }} total</span>
        <AdminBadge v-if="unreadCount" tone="accent" dot>{{ unreadCount }} belum dibaca</AdminBadge>
      </template>
      <template #actions>
        <AdminButton
          v-if="unreadCount"
          variant="secondary"
          icon="checkCircle"
          @click="markAllRead"
        >
          Tandai semua dibaca
        </AdminButton>
        <AdminButton variant="ghost" icon-only icon="refresh" label="Muat ulang" @click="load" />
      </template>
    </AdminPageHeader>

    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="cms-input-group max-w-xs flex-1">
        <span class="cms-input-group-icon"><AdminIcon name="search" :size="15" /></span>
        <input v-model="search" type="search" placeholder="Cari nama, email, isi pesan…" class="cms-input" />
      </div>

      <div class="cms-seg self-start lg:self-auto">
        <button
          v-for="t in filterTabs"
          :key="t.key"
          type="button"
          class="cms-seg-item"
          :aria-pressed="filter === t.key"
          @click="filter = t.key"
        >
          {{ t.label }}
          <span class="tabular-nums text-[var(--ad-fg-subtle)]">{{ counts[t.key] }}</span>
        </button>
      </div>
    </div>

    <div v-if="status === 'loading'" class="space-y-2">
      <div v-for="i in 5" :key="i" class="cms-skeleton h-14 w-full" />
    </div>

    <div
      v-else-if="status === 'error'"
      class="cms-panel flex items-start gap-2.5 p-4 text-[13px] text-[var(--ad-danger)]"
    >
      <AdminIcon name="alert" :size="15" class="mt-0.5" />
      {{ errorMessage }}
    </div>

    <AdminEmptyState
      v-else-if="isPlaceholder"
      icon="database"
      title="Tidak tersedia di mode demo"
      description="Aktifkan Supabase di .env untuk melihat pesan yang masuk dari form kontak."
    />

    <AdminCard v-else-if="filtered.length" flush>
      <ul class="divide-y divide-[rgba(255,255,255,0.05)]">
        <li v-for="inquiry in filtered" :key="inquiry.id">
          <button
            type="button"
            class="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-[rgba(255,255,255,0.03)]"
            :aria-expanded="expandedId === inquiry.id"
            @click="toggleExpand(inquiry)"
          >
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              :class="inquiry.is_read ? 'bg-[var(--ad-border-strong)]' : 'bg-[var(--ad-accent)]'"
              :title="inquiry.is_read ? 'Sudah dibaca' : 'Belum dibaca'"
            />

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span class="truncate text-[13.5px]" :class="inquiry.is_read ? 'font-normal' : 'font-semibold'">
                  {{ inquiry.name }}
                </span>
                <span class="truncate text-[12px] text-[var(--ad-fg-subtle)]">{{ inquiry.email }}</span>
                <AdminBadge v-if="inquiry.project_type" tone="neutral">{{ inquiry.project_type }}</AdminBadge>
              </div>
              <p class="mt-1 truncate text-[12px] text-[var(--ad-fg-subtle)]">{{ inquiry.message }}</p>
            </div>

            <span class="hidden shrink-0 text-[11.5px] text-[var(--ad-fg-subtle)] sm:block">
              {{ relative(inquiry.created_at) }}
            </span>
            <AdminIcon
              :name="expandedId === inquiry.id ? 'chevronUp' : 'chevronDown'"
              :size="14"
              class="shrink-0 text-[var(--ad-fg-subtle)]"
            />
          </button>

          <div
            v-if="expandedId === inquiry.id"
            class="space-y-5 border-t border-[var(--ad-border)] bg-[rgba(0,0,0,0.16)] px-5 py-5"
          >
            <dl class="grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
              <div>
                <dt class="cms-eyebrow mb-1">Email</dt>
                <dd class="flex items-center gap-2">
                  <a :href="`mailto:${inquiry.email}`" class="text-[var(--ad-accent)] hover:underline">
                    {{ inquiry.email }}
                  </a>
                  <button
                    type="button"
                    class="text-[var(--ad-fg-subtle)] transition-colors hover:text-[var(--ad-fg)]"
                    title="Salin email"
                    @click="copyEmail(inquiry.email)"
                  >
                    <AdminIcon name="copy" :size="13" />
                  </button>
                </dd>
              </div>

              <div v-if="inquiry.phone">
                <dt class="cms-eyebrow mb-1">Telepon</dt>
                <dd>
                  <a :href="`tel:${inquiry.phone}`" class="text-[var(--ad-accent)] hover:underline">
                    {{ inquiry.phone }}
                  </a>
                </dd>
              </div>

              <div v-if="inquiry.project_type">
                <dt class="cms-eyebrow mb-1">Jenis projek</dt>
                <dd>{{ inquiry.project_type }}</dd>
              </div>

              <div>
                <dt class="cms-eyebrow mb-1">Diterima</dt>
                <dd class="text-[var(--ad-fg-muted)]">
                  {{ formatDate(inquiry.created_at) }} · locale {{ inquiry.locale }}
                </dd>
              </div>
            </dl>

            <div>
              <p class="cms-eyebrow mb-2">Pesan</p>
              <p class="whitespace-pre-wrap rounded-[var(--ad-radius-sm)] border border-[var(--ad-border)] bg-[var(--ad-surface-sunk)] p-3.5 text-[13px] leading-relaxed">
                {{ inquiry.message }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <AdminButton :href="replyHref(inquiry)" variant="primary" size="sm" icon="mail">
                Balas via email
              </AdminButton>
              <AdminButton
                variant="secondary"
                size="sm"
                :icon="inquiry.is_read ? 'mail' : 'mailOpen'"
                @click="markRead(inquiry, !inquiry.is_read)"
              >
                Tandai {{ inquiry.is_read ? 'belum dibaca' : 'sudah dibaca' }}
              </AdminButton>
              <AdminButton
                variant="danger"
                size="sm"
                icon="trash"
                class="ml-auto"
                @click="remove(inquiry)"
              >
                Hapus
              </AdminButton>
            </div>
          </div>
        </li>
      </ul>
    </AdminCard>

    <AdminEmptyState
      v-else-if="search || filter !== 'all'"
      icon="search"
      title="Tidak ada pesan yang cocok"
      description="Coba kata kunci lain atau ganti filter."
    >
      <AdminButton variant="secondary" size="sm" icon="refresh" @click="search = ''; filter = 'all'">
        Reset filter
      </AdminButton>
    </AdminEmptyState>

    <AdminEmptyState
      v-else
      icon="inbox"
      title="Belum ada pesan masuk"
      description="Pesan dari form kontak di halaman /contact akan muncul di sini."
    />
  </div>
</template>
