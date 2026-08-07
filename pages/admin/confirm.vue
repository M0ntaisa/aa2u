<script setup lang="ts">
definePageMeta({ layout: false })

// The Supabase Nuxt module places this page at the OAuth/email callback URL.
// It exchanges the code for a session, then sends the user onward.
const router = useRouter()
const user = useSupabaseUser()

watch(user, (u) => {
  if (u) router.push('/admin')
}, { immediate: true })
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--ad-canvas)]">
    <AdminIcon name="loader" :size="20" class="ad-spin text-[var(--ad-accent)]" />
    <p class="text-[13px] text-[var(--ad-fg-muted)]">Memverifikasi sesi…</p>
  </div>
</template>
