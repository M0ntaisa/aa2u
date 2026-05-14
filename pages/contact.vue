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
    Object.assign(form, { name: '', email: '', phone: '', project_type: '', message: '' })
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err?.statusMessage || err?.message || t('contact.form.error')
  }
}
</script>

<template>
  <div class="px-6 pt-32 pb-24">
    <header class="mb-20 md:mb-28">
      <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
        {{ t('contact.eyebrow') }}
      </span>
      <h1 class="mt-4 font-display text-5xl md:text-8xl tracking-tight leading-[0.95] max-w-4xl">
        {{ t('contact.heading') }}
      </h1>
    </header>

    <div class="grid md:grid-cols-12 gap-12 md:gap-16">
      <!-- Studio info -->
      <aside class="md:col-span-4 space-y-10 text-sm">
        <div>
          <div class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] mb-2">
            {{ t('contact.studio') }}
          </div>
          <p class="text-base">{{ site?.studio_name || 'AA2U' }}</p>
          <p class="text-[var(--color-muted)]">{{ tt(site?.address) }}</p>
        </div>
        <div v-if="site?.contact_email">
          <div class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] mb-2">Email</div>
          <a :href="`mailto:${site.contact_email}`" class="hover:underline">
            {{ site.contact_email }}
          </a>
        </div>
        <div v-if="site?.contact_phone">
          <div class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] mb-2">{{ t('contact.phone') }}</div>
          <p>{{ site.contact_phone }}</p>
        </div>
        <div v-if="site?.socials">
          <div class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] mb-2">{{ t('contact.socials') }}</div>
          <ul class="space-y-1">
            <li v-if="site.socials.instagram">
              <a :href="site.socials.instagram" target="_blank" rel="noopener" class="hover:underline">Instagram</a>
            </li>
            <li v-if="site.socials.linkedin">
              <a :href="site.socials.linkedin" target="_blank" rel="noopener" class="hover:underline">LinkedIn</a>
            </li>
            <li v-if="site.socials.behance">
              <a :href="site.socials.behance" target="_blank" rel="noopener" class="hover:underline">Behance</a>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Form -->
      <form @submit.prevent="submit" class="md:col-span-8 space-y-8">
        <div class="grid md:grid-cols-2 gap-6">
          <label class="block">
            <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">{{ t('contact.form.name') }}</span>
            <input v-model="form.name" required type="text" class="mt-2 w-full bg-transparent border-b border-white/30 focus:border-white py-2 outline-none" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">{{ t('contact.form.email') }}</span>
            <input v-model="form.email" required type="email" class="mt-2 w-full bg-transparent border-b border-white/30 focus:border-white py-2 outline-none" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">{{ t('contact.form.phone') }}</span>
            <input v-model="form.phone" type="tel" class="mt-2 w-full bg-transparent border-b border-white/30 focus:border-white py-2 outline-none" />
          </label>
          <label class="block">
            <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">{{ t('contact.form.project_type') }}</span>
            <input v-model="form.project_type" type="text" class="mt-2 w-full bg-transparent border-b border-white/30 focus:border-white py-2 outline-none" />
          </label>
        </div>
        <label class="block">
          <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">{{ t('contact.form.message') }}</span>
          <textarea v-model="form.message" required rows="5" class="mt-2 w-full bg-transparent border-b border-white/30 focus:border-white py-2 outline-none resize-none"></textarea>
        </label>

        <div class="flex items-center gap-6">
          <button
            type="submit"
            :disabled="status === 'submitting'"
            class="text-sm uppercase tracking-[0.25em] border border-white/40 hover:border-white px-6 py-3 transition-colors disabled:opacity-50"
          >
            {{ status === 'submitting' ? t('contact.form.sending') : t('contact.form.send') }}
          </button>
          <span v-if="status === 'success'" class="text-sm text-[var(--color-muted)]">
            {{ t('contact.form.success') }}
          </span>
          <span v-if="status === 'error'" class="text-sm text-red-400">
            {{ errorMessage }}
          </span>
        </div>
      </form>
    </div>
  </div>
</template>
