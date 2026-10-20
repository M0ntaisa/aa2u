<script setup lang="ts">
const { t, locale } = useI18n()
const tt = useT()

const { data: site } = await useSiteSettings()

useSiteSeo({
  title: () => `${t('nav.contact')} — AA2U`,
  description: () => t('contact.description'),
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  project_type: '',
  message: '',
  // Honeypot — hidden from humans; bots that fill it are dropped server-side.
  hp_field: '',
})

const status = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function submit() {
  status.value = 'submitting'
  errorMessage.value = ''
  try {
    await $fetch('/api/inquiries', {
      method: 'POST',
      body: { ...form, locale: locale.value },
    })
    status.value = 'success'
    Object.assign(form, { name: '', email: '', phone: '', project_type: '', message: '', hp_field: '' })
  } catch (err: any) {
    status.value = 'error'
    // Never surface raw server text; map status codes to translated copy.
    const code = err?.statusCode ?? err?.response?.status
    errorMessage.value = code === 429
      ? t('contact.form.rate_limited')
      : code === 400
        ? t('contact.form.invalid')
        : t('contact.form.error')
  }
}

// Only render social links that are real web URLs (guards against
// `javascript:` or other schemes stored in site_settings).
const socialLinks = computed(() => {
  const socials = (site.value?.socials ?? {}) as Record<string, unknown>
  return [
    { key: 'instagram', label: 'Instagram' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'behance', label: 'Behance' },
  ].flatMap(({ key, label }) => {
    const href = socials[key]
    return isHttpUrl(href) ? [{ key, label, href: href.trim() }] : []
  })
})
</script>

<template>
  <div class="sheet-wrap pt-32 pb-24">
    <header class="mb-20 md:mb-28">
      <SheetRuler sheet="A-04" :label="t('contact.eyebrow')" class="mb-6" />
      <h1 v-reveal="{ lines: true }" class="font-display text-5xl md:text-8xl tracking-tight leading-[0.95] max-w-4xl">
        {{ t('contact.heading') }}
      </h1>
    </header>

    <div class="grid md:grid-cols-12 gap-12 md:gap-16">
      <!-- Studio info -->
      <aside class="md:col-span-4 space-y-10 text-sm">
        <div>
          <div class="mono-s text-muted mb-2">
            {{ t('contact.studio') }}
          </div>
          <p class="text-base">{{ site?.studio_name || 'AA2U' }}</p>
          <p class="text-fg-2">{{ tt(site?.address) }}</p>
        </div>
        <div v-if="site?.contact_email">
          <div class="mono-s text-muted mb-2">{{ t('contact.email') }}</div>
          <a :href="`mailto:${site.contact_email}`" class="hover:underline">
            {{ site.contact_email }}
          </a>
        </div>
        <div v-if="site?.contact_phone">
          <div class="mono-s text-muted mb-2">{{ t('contact.phone') }}</div>
          <p>{{ site.contact_phone }}</p>
        </div>
        <div v-if="socialLinks.length">
          <div class="mono-s text-muted mb-2">{{ t('contact.socials') }}</div>
          <ul class="space-y-1">
            <li v-for="link in socialLinks" :key="link.key">
              <a :href="link.href" target="_blank" rel="noopener" class="hover:underline">{{ link.label }}</a>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Form -->
      <form @submit.prevent="submit" class="md:col-span-8 space-y-8">
        <div class="grid md:grid-cols-2 gap-6">
          <label class="block">
            <span class="mono-s text-muted">{{ t('contact.form.name') }}</span>
            <input v-model="form.name" required type="text" class="mt-2 w-full bg-transparent border-b border-line-strong focus:border-white py-2 outline-none" />
          </label>
          <label class="block">
            <span class="mono-s text-muted">{{ t('contact.form.email') }}</span>
            <input v-model="form.email" required type="email" class="mt-2 w-full bg-transparent border-b border-line-strong focus:border-white py-2 outline-none" />
          </label>
          <label class="block">
            <span class="mono-s text-muted">{{ t('contact.form.phone') }}</span>
            <input v-model="form.phone" type="tel" class="mt-2 w-full bg-transparent border-b border-line-strong focus:border-white py-2 outline-none" />
          </label>
          <label class="block">
            <span class="mono-s text-muted">{{ t('contact.form.project_type') }}</span>
            <input v-model="form.project_type" type="text" class="mt-2 w-full bg-transparent border-b border-line-strong focus:border-white py-2 outline-none" />
          </label>
        </div>
        <!-- Honeypot: off-screen, skipped by keyboard and screen readers. -->
        <div aria-hidden="true" class="absolute -left-[9999px] w-px h-px overflow-hidden">
          <input v-model="form.hp_field" type="text" name="hp_field" tabindex="-1" autocomplete="off" />
        </div>
        <label class="block">
          <span class="mono-s text-muted">{{ t('contact.form.message') }}</span>
          <textarea v-model="form.message" required rows="5" class="mt-2 w-full bg-transparent border-b border-line-strong focus:border-white py-2 outline-none resize-none"></textarea>
        </label>

        <div class="flex items-center gap-6">
          <button
            type="submit"
            :disabled="status === 'submitting'"
            class="mono-s border border-line-strong hover:bg-white hover:text-[var(--color-bg)] px-6 min-h-11 transition-colors duration-[var(--d-1)] disabled:opacity-50"
          >
            {{ status === 'submitting' ? t('contact.form.sending') : t('contact.form.send') }}
          </button>
          <div aria-live="polite" role="status">
            <span v-if="status === 'success'" class="text-sm text-fg-2">
              {{ t('contact.form.success') }}
            </span>
            <span v-if="status === 'error'" class="text-sm text-red-400">
              {{ errorMessage }}
            </span>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
