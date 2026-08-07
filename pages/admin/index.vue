<script setup lang="ts">
import type { AdminIconName } from '~/utils/admin-icons'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const tt = useT()
const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const { unreadInquiries, refreshUnread } = useAdminCounts()

const { data: projects } = await useAdminProjects()
const { data: team } = await useTeam()
const { data: principles } = await usePrinciples()

interface RecentInquiry {
  id: string
  name: string
  email: string
  message: string
  is_read: boolean
  created_at: string
}

const recentInquiries = ref<RecentInquiry[]>([])
const inquiriesLoading = ref(!isPlaceholder)

onMounted(async () => {
  if (isPlaceholder) return
  const [{ data }] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id, name, email, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    refreshUnread(),
  ])
  recentInquiries.value = (data ?? []) as RecentInquiry[]
  inquiriesLoading.value = false
})

const byStatus = computed(() => {
  const list = projects.value ?? []
  return {
    published: list.filter(p => p.status === 'published').length,
    in_development: list.filter(p => p.status === 'in_development').length,
    draft: list.filter(p => p.status === 'draft').length,
    featured: list.filter(p => p.is_featured).length,
  }
})

const stats = computed(() => [
  {
    label: 'Projek',
    value: projects.value?.length ?? 0,
    icon: 'projects' as AdminIconName,
    to: '/admin/projects',
    hint: `${byStatus.value.published} published · ${byStatus.value.draft} draft`,
    tone: 'accent' as const,
  },
  {
    label: 'Anggota tim',
    value: team.value?.length ?? 0,
    icon: 'team' as AdminIconName,
    to: '/admin/team',
    hint: 'Tampil di halaman /about',
    tone: 'neutral' as const,
  },
  {
    label: 'Prinsip studio',
    value: principles.value?.length ?? 0,
    icon: 'compass' as AdminIconName,
    to: '/admin/principles',
    hint: 'Tampil di halaman /about',
    tone: 'neutral' as const,
  },
  {
    label: 'Inquiry belum dibaca',
    value: unreadInquiries.value,
    icon: 'inbox' as AdminIconName,
    to: '/admin/inquiries',
    hint: unreadInquiries.value > 0 ? 'Butuh tindak lanjut' : 'Semua sudah dibaca',
    tone: unreadInquiries.value > 0 ? ('warning' as const) : ('success' as const),
  },
])

/** Newest first, capped — the dashboard is a jumping-off point, not a list. */
const recentProjects = computed(() =>
  [...(projects.value ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, 5),
)

const quickActions: { label: string; description: string; to: string; icon: AdminIconName }[] = [
  { label: 'Tambah projek', description: 'Buat entri portofolio baru', to: '/admin/projects/new', icon: 'plus' },
  { label: 'Kelola tim',    description: 'Perbarui anggota studio',    to: '/admin/team',         icon: 'team' },
  { label: 'Cek inquiries', description: 'Pesan dari form kontak',     to: '/admin/inquiries',    icon: 'mail' },
  { label: 'Info studio',   description: 'Tagline, kontak, sosial',    to: '/admin/settings',     icon: 'settings' },
]

const statusTone = (s: string) =>
  s === 'published' ? 'success' : s === 'in_development' ? 'warning' : 'neutral'

const statusLabel = (s: string) =>
  s === 'published' ? 'Published' : s === 'in_development' ? 'In development' : 'Draft'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// useAdminProjects only selects list columns, so cover presence is the one
// completeness signal available without a second round-trip.
const withCover = computed(() => {
  const list = projects.value ?? []
  if (!list.length) return 0
  return Math.round((list.filter(p => !!p.cover_image).length / list.length) * 100)
})
</script>

<template>
  <div class="mx-auto max-w-[1180px]">
    <AdminPageHeader
      title="Dashboard"
      description="Ringkasan konten studio dan pintasan ke pekerjaan yang tertunda."
    >
      <template #actions>
        <AdminButton to="/admin/projects/new" variant="primary" icon="plus">
          Projek baru
        </AdminButton>
      </template>
    </AdminPageHeader>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        v-for="s in stats"
        :key="s.label"
        :label="s.label"
        :value="s.value"
        :icon="s.icon"
        :to="s.to"
        :hint="s.hint"
        :tone="s.tone"
      />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
      <!-- Recent projects -->
      <AdminCard title="Projek terbaru" description="Lima entri teratas berdasarkan urutan tampil." flush>
        <template #actions>
          <AdminButton to="/admin/projects" variant="ghost" size="sm" icon-right="arrowRight">
            Semua
          </AdminButton>
        </template>

        <ul v-if="recentProjects.length" class="divide-y divide-[rgba(255,255,255,0.05)]">
          <li v-for="p in recentProjects" :key="p.slug">
            <NuxtLink
              :to="`/admin/projects/${p.slug}`"
              class="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
            >
              <div class="h-10 w-14 shrink-0 overflow-hidden rounded bg-[var(--ad-surface-sunk)]">
                <img
                  v-if="p.cover_image"
                  :src="p.cover_image"
                  alt=""
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-[var(--ad-fg-subtle)]">
                  <AdminIcon name="image" :size="14" />
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <p class="truncate text-[13.5px] font-medium">{{ tt(p.title) }}</p>
                <p class="truncate text-[11.5px] text-[var(--ad-fg-subtle)]">
                  /{{ p.slug }}<span v-if="p.year"> · {{ p.year }}</span>
                </p>
              </div>

              <AdminBadge :tone="statusTone(p.status)">{{ statusLabel(p.status) }}</AdminBadge>
              <AdminIcon name="chevronRight" :size="14" class="text-[var(--ad-fg-subtle)]" />
            </NuxtLink>
          </li>
        </ul>

        <div v-else class="p-5">
          <AdminEmptyState
            icon="projects"
            title="Belum ada projek"
            description="Portofolio masih kosong. Mulai dengan satu entri."
          >
            <AdminButton to="/admin/projects/new" variant="primary" size="sm" icon="plus">
              Tambah projek
            </AdminButton>
          </AdminEmptyState>
        </div>
      </AdminCard>

      <!-- Right column -->
      <div class="space-y-6">
        <AdminCard title="Inquiry terbaru" flush>
          <template #actions>
            <AdminButton to="/admin/inquiries" variant="ghost" size="sm" icon-right="arrowRight">
              Semua
            </AdminButton>
          </template>

          <div v-if="inquiriesLoading" class="space-y-3 p-5">
            <div v-for="i in 3" :key="i" class="ad-skeleton h-9 w-full" />
          </div>

          <ul v-else-if="recentInquiries.length" class="divide-y divide-[rgba(255,255,255,0.05)]">
            <li v-for="q in recentInquiries" :key="q.id">
              <NuxtLink
                to="/admin/inquiries"
                class="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
              >
                <span
                  class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  :class="q.is_read ? 'bg-[var(--ad-border-strong)]' : 'bg-[var(--ad-accent)]'"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline justify-between gap-2">
                    <p class="truncate text-[13px] font-medium">{{ q.name }}</p>
                    <span class="shrink-0 text-[11px] text-[var(--ad-fg-subtle)]">{{ formatDate(q.created_at) }}</span>
                  </div>
                  <p class="mt-0.5 truncate text-[11.5px] text-[var(--ad-fg-subtle)]">{{ q.message }}</p>
                </div>
              </NuxtLink>
            </li>
          </ul>

          <div v-else class="px-5 py-8 text-center text-[13px] text-[var(--ad-fg-subtle)]">
            {{ isPlaceholder ? 'Tidak tersedia di mode demo.' : 'Belum ada pesan masuk.' }}
          </div>
        </AdminCard>

        <AdminCard title="Kondisi konten">
          <dl class="space-y-3.5 text-[13px]">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-[var(--ad-fg-muted)]">Published</dt>
              <dd class="tabular-nums">{{ byStatus.published }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-[var(--ad-fg-muted)]">In development</dt>
              <dd class="tabular-nums">{{ byStatus.in_development }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-[var(--ad-fg-muted)]">Draft</dt>
              <dd class="tabular-nums">{{ byStatus.draft }}</dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-[var(--ad-fg-muted)]">Featured di homepage</dt>
              <dd class="tabular-nums">{{ byStatus.featured }}</dd>
            </div>

            <hr class="ad-divider" />

            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <dt class="text-[var(--ad-fg-muted)]">Projek dengan cover image</dt>
                <dd class="tabular-nums">{{ withCover }}%</dd>
              </div>
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ad-surface-sunk)]">
                <div
                  class="h-full rounded-full bg-[var(--ad-accent)] transition-[width] duration-500"
                  :style="{ width: `${withCover}%` }"
                />
              </div>
            </div>
          </dl>
        </AdminCard>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="mt-6">
      <p class="ad-eyebrow mb-2.5">Aksi cepat</p>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="a in quickActions"
          :key="a.to"
          :to="a.to"
          class="ad-panel group flex items-center gap-3 p-4 transition-colors hover:border-[var(--ad-border-strong)] hover:bg-[var(--ad-surface-hover)]"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[rgba(255,255,255,0.05)] text-[var(--ad-fg-muted)] transition-colors group-hover:text-[var(--ad-accent)]">
            <AdminIcon :name="a.icon" :size="15" />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-[13px] font-medium">{{ a.label }}</span>
            <span class="block truncate text-[11.5px] text-[var(--ad-fg-subtle)]">{{ a.description }}</span>
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
