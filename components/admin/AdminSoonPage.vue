<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="px-8 py-10">
    <header class="mb-10">
      <h1 class="font-display text-4xl tracking-tight">{{ title }}</h1>
      <p v-if="description" class="mt-2 text-sm text-[var(--color-muted)]">{{ description }}</p>
    </header>

    <div class="border border-white/10 px-8 py-16 text-center">
      <div class="inline-flex items-center justify-center w-12 h-12 border border-white/20 rounded-full mb-5">
        <span class="text-lg">→</span>
      </div>
      <p class="text-sm text-[var(--color-muted)]">
        Halaman ini belum diimplementasikan dalam skeleton.
      </p>
      <p class="mt-2 text-xs text-[var(--color-muted)]">
        Akan menyusul dengan pola yang sama dengan <code>/admin/projects</code>:
        list view, form i18n, integrasi Supabase, validasi, dan delete.
      </p>
    </div>
  </div>
</template>
