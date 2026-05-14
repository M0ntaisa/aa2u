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

const items = ref<Inquiry[]>([])
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMessage = ref('')
const filter = ref<'all' | 'unread' | 'read'>('all')
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

const filtered = computed(() => {
  if (filter.value === 'unread') return items.value.filter(i => !i.is_read)
  if (filter.value === 'read') return items.value.filter(i => i.is_read)
  return items.value
})

const unreadCount = computed(() => items.value.filter(i => !i.is_read).length)

function toggleExpand(id: string, inquiry: Inquiry) {
  if (expandedId.value === id) {
    expandedId.value = null
    return
  }
  expandedId.value = id
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
  }
}

async function remove(inquiry: Inquiry) {
  if (!confirm(`Hapus pesan dari ${inquiry.name}? Tindakan ini tidak bisa dibatalkan.`)) return
  if (isPlaceholder) return
  const { error } = await supabase.from('inquiries').delete().eq('id', inquiry.id)
  if (error) {
    errorMessage.value = error.message
    return
  }
  items.value = items.value.filter(i => i.id !== inquiry.id)
  if (expandedId.value === inquiry.id) expandedId.value = null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="px-8 py-10">
    <header class="flex items-end justify-between mb-10">
      <div>
        <h1 class="font-display text-4xl tracking-tight">Inquiries</h1>
        <p class="mt-2 text-sm text-[var(--color-muted)]">
          {{ items.length }} total · <span class="text-emerald-300">{{ unreadCount }} belum dibaca</span>
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs uppercase tracking-[0.2em]">
        <button
          v-for="f in (['all', 'unread', 'read'] as const)"
          :key="f"
          class="px-4 py-2 border transition-colors"
          :class="filter === f ? 'border-white text-white' : 'border-white/20 text-[var(--color-muted)] hover:text-white'"
          @click="filter = f"
        >
          {{ f === 'all' ? 'Semua' : f === 'unread' ? 'Belum dibaca' : 'Sudah dibaca' }}
        </button>
      </div>
    </header>

    <div v-if="status === 'loading'" class="text-sm text-[var(--color-muted)]">Memuat…</div>
    <div v-else-if="status === 'error'" class="text-sm text-red-400">{{ errorMessage }}</div>

    <div v-else-if="isPlaceholder" class="border border-dashed border-white/10 px-8 py-16 text-center text-sm text-[var(--color-muted)]">
      Mode demo: aktifkan Supabase di <code>.env</code> untuk melihat pesan yang masuk dari form kontak.
    </div>

    <div v-else-if="filtered.length" class="border border-white/10">
      <ul>
        <li
          v-for="inquiry in filtered"
          :key="inquiry.id"
          class="border-b border-white/5 last:border-b-0"
        >
          <button
            type="button"
            class="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
            @click="toggleExpand(inquiry.id, inquiry)"
          >
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="inquiry.is_read ? 'bg-white/20' : 'bg-emerald-400'"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-3">
                <span class="font-medium truncate">{{ inquiry.name }}</span>
                <span class="text-xs text-[var(--color-muted)] truncate">{{ inquiry.email }}</span>
                <span v-if="inquiry.project_type" class="text-[10px] uppercase tracking-wide text-[var(--color-muted)] border border-white/10 px-2 py-0.5">
                  {{ inquiry.project_type }}
                </span>
              </div>
              <p class="text-xs text-[var(--color-muted)] mt-1 line-clamp-1">{{ inquiry.message }}</p>
            </div>
            <span class="text-xs text-[var(--color-muted)] flex-shrink-0">{{ formatDate(inquiry.created_at) }}</span>
            <span class="text-xs text-[var(--color-muted)] flex-shrink-0">{{ expandedId === inquiry.id ? '−' : '+' }}</span>
          </button>

          <div v-if="expandedId === inquiry.id" class="px-5 pb-5 pt-2 space-y-4 bg-white/[0.02]">
            <dl class="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Email</dt>
                <dd><a :href="`mailto:${inquiry.email}`" class="underline">{{ inquiry.email }}</a></dd>
              </div>
              <div v-if="inquiry.phone">
                <dt class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Telepon</dt>
                <dd><a :href="`tel:${inquiry.phone}`" class="underline">{{ inquiry.phone }}</a></dd>
              </div>
              <div v-if="inquiry.project_type">
                <dt class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Jenis projek</dt>
                <dd>{{ inquiry.project_type }}</dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Locale</dt>
                <dd>{{ inquiry.locale }}</dd>
              </div>
            </dl>

            <div>
              <dt class="text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-2">Pesan</dt>
              <p class="text-sm whitespace-pre-wrap">{{ inquiry.message }}</p>
            </div>

            <div class="flex items-center gap-3 pt-3 border-t border-white/5">
              <a
                :href="`mailto:${inquiry.email}?subject=Re: Pesan untuk AA2U&body=${encodeURIComponent('Halo ' + inquiry.name + ',\n\n')}`"
                class="text-xs uppercase tracking-[0.2em] border border-white/40 hover:border-white px-4 py-2 transition-colors"
              >
                Balas via email
              </a>
              <button
                type="button"
                class="text-xs uppercase tracking-[0.2em] border border-white/20 hover:border-white/60 px-4 py-2 transition-colors"
                @click="markRead(inquiry, !inquiry.is_read)"
              >
                Tandai {{ inquiry.is_read ? 'belum dibaca' : 'sudah dibaca' }}
              </button>
              <button
                type="button"
                class="text-xs uppercase tracking-[0.2em] border border-red-500/40 text-red-300 hover:bg-red-500/10 px-4 py-2 transition-colors ml-auto"
                @click="remove(inquiry)"
              >
                Hapus
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div v-else class="border border-white/10 px-8 py-16 text-center text-[var(--color-muted)]">
      Belum ada inquiry yang masuk.
    </div>
  </div>
</template>
