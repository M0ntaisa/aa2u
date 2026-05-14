<script setup lang="ts">
import type { I18nField, SiteSettings } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()

const blankI18n = (): I18nField => ({ id: '', en: '' })

interface Form {
  studio_name: string
  tagline: I18nField
  manifesto: I18nField
  contact_email: string
  contact_phone: string
  address: I18nField
  socials: {
    instagram: string
    linkedin: string
    behance: string
  }
}

const form = ref<Form>({
  studio_name: '',
  tagline: blankI18n(),
  manifesto: blankI18n(),
  contact_email: '',
  contact_phone: '',
  address: blankI18n(),
  socials: { instagram: '', linkedin: '', behance: '' },
})

const status = ref<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
const errorMessage = ref('')

function applySettings(s: SiteSettings) {
  form.value = {
    studio_name: s.studio_name,
    tagline: s.tagline ?? blankI18n(),
    manifesto: s.manifesto ?? blankI18n(),
    contact_email: s.contact_email ?? '',
    contact_phone: s.contact_phone ?? '',
    address: s.address ?? blankI18n(),
    socials: {
      instagram: s.socials?.instagram ?? '',
      linkedin: s.socials?.linkedin ?? '',
      behance: s.socials?.behance ?? '',
    },
  }
}

async function load() {
  status.value = 'loading'
  if (isPlaceholder) {
    const { siteSettings } = await import('~/data/site')
    applySettings(siteSettings)
    status.value = 'idle'
    return
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  if (data) {
    applySettings({
      studio_name: data.studio_name,
      tagline: data.tagline ?? undefined,
      manifesto: data.manifesto ?? undefined,
      contact_email: data.contact_email ?? undefined,
      contact_phone: data.contact_phone ?? undefined,
      address: data.address ?? undefined,
      socials: data.socials ?? {},
    })
  } else {
    const { siteSettings } = await import('~/data/site')
    applySettings(siteSettings)
  }
  status.value = 'idle'
}

await load()

async function save() {
  if (isPlaceholder) {
    alert('Mode demo: aktifkan Supabase di .env untuk menyimpan.')
    return
  }
  if (!form.value.studio_name.trim()) {
    status.value = 'error'
    errorMessage.value = 'Nama studio wajib diisi.'
    return
  }

  status.value = 'saving'
  errorMessage.value = ''

  const payload = {
    id: 1,
    studio_name: form.value.studio_name.trim(),
    tagline: form.value.tagline,
    manifesto: form.value.manifesto,
    contact_email: form.value.contact_email || null,
    contact_phone: form.value.contact_phone || null,
    address: form.value.address,
    socials: {
      instagram: form.value.socials.instagram || undefined,
      linkedin: form.value.socials.linkedin || undefined,
      behance: form.value.socials.behance || undefined,
    },
  }

  const { error } = await supabase
    .from('site_settings')
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    return
  }

  status.value = 'saved'
  setTimeout(() => { if (status.value === 'saved') status.value = 'idle' }, 2000)
}
</script>

<template>
  <div class="px-8 py-10 max-w-5xl">
    <header class="mb-10">
      <h1 class="font-display text-4xl tracking-tight">Pengaturan situs</h1>
      <p class="mt-2 text-sm text-[var(--color-muted)]">
        Nama studio, tagline, manifesto, kontak, dan link sosial.
      </p>
    </header>

    <form class="space-y-10" @submit.prevent="save">
      <section class="border border-white/10 px-6 py-6 space-y-6">
        <h2 class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">Identitas</h2>

        <label class="block">
          <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Nama studio *</span>
          <input
            v-model="form.studio_name"
            type="text"
            required
            placeholder="Atelier Arsitek 2u"
            class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
          />
          <span class="text-[10px] text-[var(--color-muted)]">Nama proper, tidak diterjemahkan.</span>
        </label>

        <AdminI18nField v-model="form.tagline" label="Tagline" placeholder="Arsitektur tanpa kompromi" />
        <AdminI18nField v-model="form.manifesto" label="Manifesto" type="textarea" :rows="6" />
      </section>

      <section class="border border-white/10 px-6 py-6 space-y-6">
        <h2 class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">Kontak</h2>

        <div class="grid md:grid-cols-2 gap-4">
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Email</span>
            <input
              v-model="form.contact_email"
              type="email"
              placeholder="studio@aa2u.example"
              class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
            />
          </label>
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Telepon</span>
            <input
              v-model="form.contact_phone"
              type="tel"
              placeholder="+62 21 1234 5678"
              class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
            />
          </label>
        </div>

        <AdminI18nField v-model="form.address" label="Alamat" placeholder="Jakarta Selatan, Indonesia" />
      </section>

      <section class="border border-white/10 px-6 py-6 space-y-6">
        <h2 class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">Sosial</h2>

        <div class="grid md:grid-cols-3 gap-4">
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Instagram URL</span>
            <input
              v-model="form.socials.instagram"
              type="url"
              placeholder="https://instagram.com/…"
              class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
            />
          </label>
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">LinkedIn URL</span>
            <input
              v-model="form.socials.linkedin"
              type="url"
              placeholder="https://linkedin.com/…"
              class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
            />
          </label>
          <label class="block">
            <span class="block text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] mb-2">Behance URL</span>
            <input
              v-model="form.socials.behance"
              type="url"
              placeholder="https://behance.net/…"
              class="w-full bg-white/5 border border-white/10 px-3 py-2 focus:border-white/40 outline-none text-sm rounded-sm"
            />
          </label>
        </div>
      </section>

      <div class="flex items-center gap-4 pt-4 border-t border-white/10">
        <button
          type="submit"
          :disabled="status === 'saving'"
          class="text-sm uppercase tracking-[0.25em] border border-white/40 hover:border-white px-6 py-3 transition-colors disabled:opacity-30"
        >
          {{ status === 'saving' ? 'Menyimpan…' : 'Simpan pengaturan' }}
        </button>
        <span v-if="status === 'error'" class="text-sm text-red-400">{{ errorMessage }}</span>
        <span v-if="status === 'saved'" class="text-sm text-emerald-300">Tersimpan ✓</span>
      </div>

      <p v-if="isPlaceholder" class="text-xs text-amber-300">
        Mode demo: perubahan tidak akan tersimpan. Aktifkan Supabase di <code>.env</code>.
      </p>
    </form>
  </div>
</template>
