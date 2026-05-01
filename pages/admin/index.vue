<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: projects } = await useProjects()
const { data: team } = await useTeam()
const { data: principles } = await usePrinciples()

const stats = computed(() => [
  { label: 'Projek published', value: projects.value?.length ?? 0, to: '/admin/projects' },
  { label: 'Anggota tim',       value: team.value?.length ?? 0,    to: '/admin/team' },
  { label: 'Prinsip studio',    value: principles.value?.length ?? 0, to: '/admin/principles' },
])
</script>

<template>
  <div class="px-8 py-10">
    <header class="mb-12">
      <h1 class="font-display text-4xl tracking-tight">Dashboard</h1>
      <p class="mt-2 text-sm text-[var(--color-muted)]">Ringkasan konten studio</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
      <NuxtLink
        v-for="s in stats"
        :key="s.label"
        :to="s.to"
        class="block border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-6 py-8"
      >
        <div class="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">{{ s.label }}</div>
        <div class="mt-3 font-display text-5xl tracking-tight">{{ s.value }}</div>
      </NuxtLink>
    </div>

    <section class="border border-white/10 px-6 py-6">
      <h2 class="text-sm uppercase tracking-[0.2em] text-[var(--color-muted)] mb-4">Aksi cepat</h2>
      <ul class="space-y-2 text-sm">
        <li><NuxtLink to="/admin/projects/new" class="hover:underline">→ Tambah projek baru</NuxtLink></li>
        <li><NuxtLink to="/admin/projects" class="hover:underline">→ Lihat semua projek</NuxtLink></li>
        <li><NuxtLink to="/admin/inquiries" class="hover:underline">→ Cek pesan masuk</NuxtLink></li>
        <li><NuxtLink to="/admin/settings" class="hover:underline">→ Edit info studio</NuxtLink></li>
      </ul>
    </section>
  </div>
</template>
