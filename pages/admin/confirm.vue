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
  <div class="min-h-screen bg-[var(--color-bg)] flex items-center justify-center text-sm text-[var(--color-muted)]">
    Memverifikasi sesi…
  </div>
</template>
