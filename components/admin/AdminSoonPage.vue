<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mx-auto max-w-[960px]">
    <AdminPageHeader :title="title" :description="description" />

    <AdminEmptyState
      icon="layers"
      title="Halaman ini belum diimplementasikan"
      description="Akan menyusul dengan pola yang sama seperti /admin/projects: list view, form i18n, integrasi Supabase, validasi, dan delete."
    />
  </div>
</template>
