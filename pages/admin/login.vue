<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const router = useRouter()
const route = useRoute()
const { isPlaceholder } = useContentSource()

const form = reactive({ email: '', password: '' })
const status = ref<'idle' | 'submitting' | 'error'>('idle')
const errorMessage = ref('')
const showPassword = ref(false)

const showUnauthorizedNote = computed(() => route.query.error === 'unauthorized')

/** Supabase returns raw English strings; map the common ones to plain Indonesian. */
function humanize(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Email atau password salah.'
  if (/email not confirmed/i.test(message)) return 'Email belum dikonfirmasi. Cek kotak masuk kamu.'
  if (/rate limit|too many/i.test(message)) return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.'
  if (/network|fetch/i.test(message)) return 'Tidak bisa terhubung ke server. Periksa koneksi internet.'
  return message
}

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
    errorMessage.value = humanize(error.message)
    return
  }

  router.push('/admin')
}

useHead({ title: 'Masuk — AA2U Admin' })
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ad-canvas)] px-6 py-12">
    <!-- Ambient background: soft accent glow + faint grid -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.55]"
      style="background:
        radial-gradient(60rem 40rem at 50% -10%, rgba(122,162,247,0.14), transparent 70%),
        radial-gradient(40rem 30rem at 10% 110%, rgba(192,202,245,0.06), transparent 70%);"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.35]"
      style="background-image:
        linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px);
        background-size: 56px 56px;
        mask-image: radial-gradient(60rem 40rem at 50% 40%, black, transparent 75%);"
      aria-hidden="true"
    />

    <div class="relative w-full max-w-[380px]">
      <div class="mb-7 text-center">
        <span class="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ad-accent)] font-display text-lg font-bold text-[var(--ad-accent-fg)]">
          A
        </span>
        <h1 class="font-display text-[22px] tracking-tight text-[var(--ad-fg)]">AA2U Admin</h1>
        <p class="mt-1.5 text-[13px] text-[var(--ad-fg-muted)]">Masuk untuk mengelola konten studio</p>
      </div>

      <div
        v-if="isPlaceholder"
        class="mb-4 flex items-start gap-2.5 rounded-[var(--ad-radius)] border border-[rgba(224,175,104,0.28)] bg-[rgba(224,175,104,0.09)] px-3.5 py-3 text-[12.5px] text-[var(--ad-warning)]"
      >
        <AdminIcon name="alert" :size="14" class="mt-0.5" />
        <p>
          Mode demo aktif — login tidak tersedia. Tambahkan kredensial Supabase di
          <code class="cms-kbd">.env</code> untuk mengaktifkan.
        </p>
      </div>

      <div
        v-if="showUnauthorizedNote"
        class="mb-4 flex items-start gap-2.5 rounded-[var(--ad-radius)] border border-[rgba(247,118,142,0.28)] bg-[rgba(247,118,142,0.09)] px-3.5 py-3 text-[12.5px] text-[var(--ad-danger)]"
      >
        <AdminIcon name="lock" :size="14" class="mt-0.5" />
        <p>
          Akun ini tidak punya akses admin. Hubungi pengelola untuk diberi flag
          <code class="cms-kbd">is_admin</code>.
        </p>
      </div>

      <div class="cms-panel p-6">
        <form class="space-y-4" @submit.prevent="submit">
          <AdminField label="Email">
            <div class="cms-input-group">
              <span class="cms-input-group-icon"><AdminIcon name="mail" :size="14" /></span>
              <input
                v-model="form.email"
                type="email"
                required
                autocomplete="email"
                placeholder="kamu@studio.com"
                class="cms-input"
                :class="status === 'error' ? 'cms-input-invalid' : ''"
              />
            </div>
          </AdminField>

          <AdminField label="Password">
            <div class="cms-input-group">
              <span class="cms-input-group-icon"><AdminIcon name="lock" :size="14" /></span>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="cms-input cms-input-action"
                :class="status === 'error' ? 'cms-input-invalid' : ''"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[var(--ad-fg-subtle)] transition-colors hover:text-[var(--ad-fg)]"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                @click="showPassword = !showPassword"
              >
                <AdminIcon :name="showPassword ? 'eyeOff' : 'eye'" :size="15" />
              </button>
            </div>
          </AdminField>

          <p v-if="errorMessage" class="cms-error-text flex items-start gap-1.5">
            <AdminIcon name="alert" :size="13" class="mt-0.5" />
            {{ errorMessage }}
          </p>

          <AdminButton
            type="submit"
            variant="primary"
            class="w-full"
            :loading="status === 'submitting'"
            :disabled="isPlaceholder"
          >
            {{ status === 'submitting' ? 'Memverifikasi…' : 'Masuk' }}
          </AdminButton>
        </form>
      </div>

      <p class="mt-6 text-center text-[12.5px]">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1.5 text-[var(--ad-fg-subtle)] transition-colors hover:text-[var(--ad-fg)]"
        >
          <AdminIcon name="arrowLeft" :size="13" />
          Kembali ke situs
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
