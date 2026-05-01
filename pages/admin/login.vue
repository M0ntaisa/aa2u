<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()
const route = useRoute()
const { isPlaceholder } = useContentSource()

const form = reactive({ email: '', password: '' })
const status = ref<'idle' | 'submitting' | 'error'>('idle')
const errorMessage = ref('')

const showUnauthorizedNote = computed(() => route.query.error === 'unauthorized')

async function submit() {
  if (isPlaceholder) {
    errorMessage.value = 'Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_KEY di .env, lalu restart dev server.'
    status.value = 'error'
    return
  }
  status.value = 'submitting'
  errorMessage.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password,
  })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  router.push('/admin')
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-6">
    <div class="w-full max-w-sm">
      <div class="mb-12 text-center">
        <h1 class="font-display text-3xl tracking-tight">AA2U Admin</h1>
        <p class="mt-2 text-sm text-[var(--color-muted)]">Masuk untuk mengelola konten</p>
      </div>

      <div v-if="isPlaceholder" class="mb-6 bg-amber-300/10 border border-amber-300/30 px-4 py-3 text-xs text-amber-200">
        Mode demo aktif — login tidak tersedia. Tambahkan kredensial Supabase di
        <code>.env</code> untuk mengaktifkan.
      </div>

      <div v-if="showUnauthorizedNote" class="mb-6 bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300">
        Akun ini tidak punya akses admin. Hubungi pengelola untuk diberi flag <code>is_admin</code>.
      </div>

      <form class="space-y-6" @submit.prevent="submit">
        <label class="block">
          <span class="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Email</span>
          <input
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            class="mt-2 w-full bg-transparent border-b border-white/30 focus:border-white py-2 outline-none text-sm"
          />
        </label>
        <label class="block">
          <span class="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Password</span>
          <input
            v-model="form.password"
            type="password"
            required
            autocomplete="current-password"
            class="mt-2 w-full bg-transparent border-b border-white/30 focus:border-white py-2 outline-none text-sm"
          />
        </label>

        <p v-if="errorMessage" class="text-xs text-red-400">{{ errorMessage }}</p>

        <button
          type="submit"
          :disabled="status === 'submitting' || isPlaceholder"
          class="w-full text-sm uppercase tracking-[0.25em] border border-white/40 hover:border-white py-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {{ status === 'submitting' ? 'Masuk…' : 'Masuk' }}
        </button>
      </form>

      <p class="mt-12 text-center text-xs text-[var(--color-muted)]">
        <NuxtLink to="/" class="hover:text-white">← Kembali ke situs</NuxtLink>
      </p>
    </div>
  </div>
</template>
