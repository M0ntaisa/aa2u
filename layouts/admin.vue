<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { isPlaceholder } = useContentSource()

const navItems = [
  { to: '/admin',            label: 'Dashboard' },
  { to: '/admin/projects',   label: 'Projek' },
  { to: '/admin/team',       label: 'Tim' },
  { to: '/admin/categories', label: 'Kategori' },
  { to: '/admin/principles', label: 'Prinsip' },
  { to: '/admin/inquiries',  label: 'Inquiries' },
  { to: '/admin/settings',   label: 'Pengaturan' },
]

const isActive = (path: string) => {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}

async function signOut() {
  if (isPlaceholder) {
    alert('Demo mode: tidak ada session aktif untuk logout.')
    return
  }
  await supabase.auth.signOut()
  router.push('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex">
    <!-- Sidebar -->
    <aside class="w-60 shrink-0 border-r border-white/10 flex flex-col">
      <div class="px-6 py-6 border-b border-white/10">
        <NuxtLink to="/admin" class="font-display text-lg tracking-tight">
          AA2U <span class="text-[var(--color-muted)]">Admin</span>
        </NuxtLink>
      </div>

      <nav class="flex-1 py-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="block px-6 py-2.5 text-sm transition-colors"
          :class="isActive(item.to) ? 'bg-white/5 text-white border-l-2 border-white' : 'text-[var(--color-muted)] hover:text-white hover:bg-white/5'"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="px-6 py-4 border-t border-white/10 text-xs text-[var(--color-muted)] space-y-2">
        <p v-if="user" class="truncate">{{ user.email }}</p>
        <p v-else-if="isPlaceholder" class="text-amber-300">Demo mode</p>
        <button
          class="block w-full text-left hover:text-white transition-colors"
          @click="signOut"
        >
          ↪ Sign out
        </button>
        <NuxtLink to="/" class="block hover:text-white transition-colors">
          → Lihat situs
        </NuxtLink>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 min-w-0">
      <div v-if="isPlaceholder" class="bg-amber-300/10 border-b border-amber-300/30 px-8 py-2.5 text-xs text-amber-200">
        ⚠ Mode demo — Supabase belum dikonfigurasi. Tindakan simpan/hapus tidak akan dipersist.
      </div>
      <slot />
    </main>
  </div>
</template>
