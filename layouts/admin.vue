<script setup lang="ts">
import type { AdminIconName } from '~/utils/admin-icons'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { isPlaceholder } = useContentSource()
const toast = useToast()
const { ask } = useConfirm()
const { unreadInquiries, ensureLoaded } = useAdminCounts()

interface NavItem {
  to: string
  label: string
  icon: AdminIconName
  badge?: () => number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Ringkasan',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    label: 'Konten',
    items: [
      { to: '/admin/projects',   label: 'Projek',   icon: 'projects' },
      { to: '/admin/team',       label: 'Tim',      icon: 'team' },
      { to: '/admin/categories', label: 'Kategori', icon: 'tag' },
      { to: '/admin/principles', label: 'Prinsip',  icon: 'compass' },
    ],
  },
  {
    label: 'Komunikasi',
    items: [
      { to: '/admin/inquiries', label: 'Inquiries', icon: 'inbox', badge: () => unreadInquiries.value },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/admin/settings', label: 'Pengaturan', icon: 'settings' },
    ],
  },
]

const isActive = (path: string) => {
  if (path === '/admin') return route.path === '/admin' || route.path === '/en/admin'
  return route.path.includes(path)
}

const currentItem = computed(() =>
  navGroups.flatMap(g => g.items).find(i => isActive(i.to)),
)

/** Mobile drawer state — the sidebar is off-canvas below lg. */
const mobileNavOpen = ref(false)
watch(() => route.fullPath, () => { mobileNavOpen.value = false })

const userInitial = computed(() => (user.value?.email?.[0] ?? 'A').toUpperCase())

async function signOut() {
  if (isPlaceholder) {
    toast.info('Mode demo', 'Tidak ada sesi aktif untuk di-logout.')
    return
  }
  const ok = await ask({
    title: 'Keluar dari admin?',
    message: 'Sesi akan diakhiri dan kamu diarahkan ke halaman login.',
    confirmLabel: 'Keluar',
  })
  if (!ok) return
  await supabase.auth.signOut()
  router.push('/admin/login')
}

onMounted(() => { void ensureLoaded() })
</script>

<template>
  <div class="min-h-screen bg-[var(--ad-canvas)] text-[var(--ad-fg)] lg:flex">
    <!-- Mobile drawer backdrop -->
    <Transition name="ad-fade">
      <div
        v-if="mobileNavOpen"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        @click="mobileNavOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col border-r border-[var(--ad-border)] bg-[var(--ad-surface)] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
      :class="mobileNavOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-14 items-center justify-between border-b border-[var(--ad-border)] px-4">
        <NuxtLink to="/admin" class="flex items-center gap-2.5 min-w-0">
          <span class="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--ad-accent)] font-display text-[13px] font-bold text-[var(--ad-accent-fg)]">
            A
          </span>
          <span class="min-w-0">
            <span class="block font-display text-[14px] leading-tight tracking-tight">AA2U</span>
            <span class="block text-[10px] uppercase tracking-[0.16em] text-[var(--ad-fg-subtle)]">Content Studio</span>
          </span>
        </NuxtLink>
        <button
          type="button"
          class="ad-btn ad-btn-ghost ad-btn-sm ad-btn-icon lg:hidden"
          aria-label="Tutup menu"
          @click="mobileNavOpen = false"
        >
          <AdminIcon name="x" :size="15" />
        </button>
      </div>

      <nav class="ad-scroll flex-1 overflow-y-auto px-3 py-4">
        <div v-for="group in navGroups" :key="group.label" class="mb-5 last:mb-0">
          <p class="ad-eyebrow mb-1.5 px-2.5">{{ group.label }}</p>
          <ul class="space-y-0.5">
            <li v-for="item in group.items" :key="item.to">
              <NuxtLink :to="item.to" class="ad-nav-item" :data-active="isActive(item.to)">
                <AdminIcon :name="item.icon" :size="15" />
                <span class="flex-1 truncate">{{ item.label }}</span>
                <span
                  v-if="item.badge && item.badge() > 0"
                  class="ad-badge ad-badge-accent px-1.5 text-[10px] leading-[15px]"
                >
                  {{ item.badge() }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>

      <div class="border-t border-[var(--ad-border)] p-3">
        <div class="mb-2 flex items-center gap-2.5 rounded-[var(--ad-radius-sm)] px-2 py-2">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ad-surface-hover)] text-[11px] font-semibold text-[var(--ad-fg-muted)]">
            {{ userInitial }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[12.5px] text-[var(--ad-fg)]">
              {{ user?.email ?? (isPlaceholder ? 'Demo user' : 'Admin') }}
            </p>
            <p class="text-[10.5px] text-[var(--ad-fg-subtle)]">
              {{ isPlaceholder ? 'Mode demo' : 'Administrator' }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          <NuxtLink to="/" target="_blank" class="ad-btn ad-btn-ghost ad-btn-sm justify-start">
            <AdminIcon name="external" :size="13" />
            <span>Situs</span>
          </NuxtLink>
          <button type="button" class="ad-btn ad-btn-ghost ad-btn-sm justify-start" @click="signOut">
            <AdminIcon name="logout" :size="13" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main column -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Top bar -->
      <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--ad-border)] bg-[rgba(20,21,29,0.85)] px-4 backdrop-blur-md lg:px-8">
        <button
          type="button"
          class="ad-btn ad-btn-ghost ad-btn-sm ad-btn-icon lg:hidden"
          aria-label="Buka menu"
          @click="mobileNavOpen = true"
        >
          <AdminIcon name="menu" :size="17" />
        </button>

        <nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-1.5 text-[13px]">
          <NuxtLink to="/admin" class="text-[var(--ad-fg-subtle)] transition-colors hover:text-[var(--ad-fg)]">
            Admin
          </NuxtLink>
          <template v-if="currentItem && currentItem.to !== '/admin'">
            <AdminIcon name="chevronRight" :size="12" class="text-[var(--ad-fg-subtle)]" />
            <span class="truncate text-[var(--ad-fg)]">{{ currentItem.label }}</span>
          </template>
        </nav>

        <div class="ml-auto flex items-center gap-2">
          <AdminBadge v-if="isPlaceholder" tone="warning" dot>Demo</AdminBadge>
          <AdminBadge v-else tone="success" dot>Terhubung</AdminBadge>
        </div>
      </header>

      <!-- Demo-mode notice -->
      <div
        v-if="isPlaceholder"
        class="flex items-start gap-2.5 border-b border-[rgba(224,175,104,0.24)] bg-[rgba(224,175,104,0.08)] px-4 py-2.5 text-[12.5px] text-[var(--ad-warning)] lg:px-8"
      >
        <AdminIcon name="alert" :size="14" class="mt-0.5 shrink-0" />
        <p>
          Mode demo — Supabase belum dikonfigurasi. Data yang tampil berasal dari
          <code class="ad-kbd">/data</code>, dan simpan/hapus tidak dipersist.
        </p>
      </div>

      <main class="ad-scroll flex-1 px-4 py-7 lg:px-8 lg:py-9">
        <slot />
      </main>
    </div>

    <AdminToaster />
    <AdminConfirmDialog />
  </div>
</template>
