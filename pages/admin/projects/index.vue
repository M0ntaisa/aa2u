<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const tt = useT()
const { data: projects } = await useAdminProjects()

const statusBadge = (s: string) => {
  switch (s) {
    case 'published':      return { label: 'Published',     cls: 'bg-emerald-500/20 text-emerald-300' }
    case 'in_development': return { label: 'In development', cls: 'bg-amber-500/20 text-amber-200' }
    default:               return { label: 'Draft',          cls: 'bg-white/10 text-[var(--color-muted)]' }
  }
}
</script>

<template>
  <div class="px-8 py-10">
    <header class="flex items-end justify-between mb-10">
      <div>
        <h1 class="font-display text-4xl tracking-tight">Projek</h1>
        <p class="mt-2 text-sm text-[var(--color-muted)]">
          {{ projects?.length ?? 0 }} projek total
        </p>
      </div>
      <NuxtLink
        to="/admin/projects/new"
        class="text-sm uppercase tracking-[0.2em] border border-white/40 hover:border-white px-5 py-2.5 transition-colors"
      >
        + Tambah projek
      </NuxtLink>
    </header>

    <div v-if="projects?.length" class="border border-white/10">
      <table class="w-full text-sm">
        <thead class="border-b border-white/10 bg-white/5">
          <tr class="text-left text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
            <th class="px-4 py-3 font-normal">#</th>
            <th class="px-4 py-3 font-normal">Title</th>
            <th class="px-4 py-3 font-normal">Year</th>
            <th class="px-4 py-3 font-normal">Category</th>
            <th class="px-4 py-3 font-normal">Status</th>
            <th class="px-4 py-3 font-normal">Featured</th>
            <th class="px-4 py-3 font-normal text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in projects"
            :key="p.slug"
            class="border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <td class="px-4 py-3 text-[var(--color-muted)]">{{ String(p.sort_order + 1).padStart(2, '0') }}</td>
            <td class="px-4 py-3">
              <div class="font-medium">{{ tt(p.title) }}</div>
              <div class="text-xs text-[var(--color-muted)]">/{{ p.slug }}</div>
            </td>
            <td class="px-4 py-3">{{ p.year ?? '—' }}</td>
            <td class="px-4 py-3 text-[var(--color-muted)]">
              {{ p.category ? tt(p.category.name) : '—' }}
            </td>
            <td class="px-4 py-3">
              <span class="inline-block px-2 py-0.5 text-xs rounded-sm" :class="statusBadge(p.status).cls">
                {{ statusBadge(p.status).label }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span v-if="p.is_featured" class="text-xs text-emerald-300">★</span>
              <span v-else class="text-xs text-[var(--color-muted)]">—</span>
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink
                :to="`/admin/projects/${p.slug}`"
                class="text-xs uppercase tracking-[0.2em] hover:text-white text-[var(--color-muted)]"
              >
                Edit →
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="border border-white/10 px-8 py-16 text-center text-[var(--color-muted)]">
      Belum ada projek. <NuxtLink to="/admin/projects/new" class="underline">Tambah satu</NuxtLink>.
    </div>
  </div>
</template>
