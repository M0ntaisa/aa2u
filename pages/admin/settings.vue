<script setup lang="ts">
import type { I18nField, SiteSettings } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const supabase = useSupabaseClient()
const { isPlaceholder } = useContentSource()
const toast = useToast()

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

const status = ref<'idle' | 'loading' | 'saving' | 'error'>('idle')
const errorMessage = ref('')

const savedSnapshot = ref('')
const isDirty = computed(() => JSON.stringify(form.value) !== savedSnapshot.value)
const markClean = () => { savedSnapshot.value = JSON.stringify(form.value) }

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
markClean()

async function save() {
  if (isPlaceholder) {
    toast.warning('Mode demo', 'Aktifkan Supabase di .env untuk menyimpan.')
    return
  }
  if (!form.value.studio_name.trim()) {
    status.value = 'error'
    errorMessage.value = 'Nama studio wajib diisi.'
    toast.error('Belum bisa disimpan', errorMessage.value)
    return
  }
  // Socials end up as public hrefs — only accept http(s) links.
  const badSocial = (Object.entries(form.value.socials) as [string, string][])
    .find(([, url]) => url.trim() && !isHttpUrl(url))
  if (badSocial) {
    status.value = 'error'
    errorMessage.value = `Tautan ${badSocial[0]} harus diawali http:// atau https://.`
    toast.error('Belum bisa disimpan', errorMessage.value)
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
      instagram: form.value.socials.instagram.trim() || undefined,
      linkedin: form.value.socials.linkedin.trim() || undefined,
      behance: form.value.socials.behance.trim() || undefined,
    },
  }

  const { error } = await supabase
    .from('site_settings')
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    status.value = 'error'
    errorMessage.value = error.message
    toast.error('Gagal menyimpan', error.message)
    return
  }

  status.value = 'idle'
  markClean()
  toast.success('Pengaturan tersimpan')
}

const manifestoLength = computed(() => form.value.manifesto.id.length)
</script>

<template>
  <div class="mx-auto max-w-[900px] pb-24">
    <AdminPageHeader
      title="Pengaturan situs"
      description="Identitas studio, kontak, dan tautan sosial yang dipakai di seluruh situs."
    >
      <template #meta>
        <AdminBadge v-if="isDirty" tone="accent">Belum disimpan</AdminBadge>
      </template>
    </AdminPageHeader>

    <form class="space-y-5" @submit.prevent="save">
      <AdminCard title="Identitas" icon="layers">
        <div class="space-y-5">
          <AdminField label="Nama studio" required hint="Nama proper — tidak diterjemahkan.">
            <input
              v-model="form.studio_name"
              type="text"
              required
              placeholder="Atelier Arsitek 2u"
              class="cms-input"
            />
          </AdminField>

          <AdminI18nField v-model="form.tagline" label="Tagline" placeholder="Arsitektur tanpa kompromi" />
          <AdminI18nField
            v-model="form.manifesto"
            label="Manifesto"
            type="textarea"
            :rows="6"
          />
          <p class="cms-hint -mt-2">{{ manifestoLength }} karakter (ID) · tampil di halaman depan dan /about.</p>
        </div>
      </AdminCard>

      <AdminCard title="Kontak" icon="phone" description="Dipakai di footer dan halaman /contact.">
        <div class="space-y-5">
          <div class="grid gap-4 md:grid-cols-2">
            <AdminField label="Email">
              <div class="cms-input-group">
                <span class="cms-input-group-icon"><AdminIcon name="mail" :size="14" /></span>
                <input v-model="form.contact_email" type="email" placeholder="studio@aa2u.example" class="cms-input" />
              </div>
            </AdminField>

            <AdminField label="Telepon">
              <div class="cms-input-group">
                <span class="cms-input-group-icon"><AdminIcon name="phone" :size="14" /></span>
                <input v-model="form.contact_phone" type="tel" placeholder="+62 21 1234 5678" class="cms-input" />
              </div>
            </AdminField>
          </div>

          <AdminI18nField v-model="form.address" label="Alamat" placeholder="Jakarta Selatan, Indonesia" />
        </div>
      </AdminCard>

      <AdminCard title="Sosial" icon="globe" description="Kosongkan untuk menyembunyikan tautan dari footer.">
        <div class="grid gap-4 md:grid-cols-3">
          <AdminField label="Instagram">
            <input v-model="form.socials.instagram" type="url" placeholder="https://instagram.com/…" class="cms-input" />
          </AdminField>
          <AdminField label="LinkedIn">
            <input v-model="form.socials.linkedin" type="url" placeholder="https://linkedin.com/…" class="cms-input" />
          </AdminField>
          <AdminField label="Behance">
            <input v-model="form.socials.behance" type="url" placeholder="https://behance.net/…" class="cms-input" />
          </AdminField>
        </div>
      </AdminCard>

      <div class="sticky bottom-0 -mx-4 border-t border-[var(--ad-border)] bg-[rgba(20,21,29,0.92)] px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
        <div class="mx-auto flex max-w-[900px] flex-wrap items-center gap-3">
          <AdminButton type="submit" variant="primary" icon="save" :loading="status === 'saving'">
            Simpan pengaturan
          </AdminButton>

          <p v-if="errorMessage" class="cms-error-text flex items-center gap-1.5">
            <AdminIcon name="alert" :size="13" />
            {{ errorMessage }}
          </p>
          <p v-else-if="isDirty" class="text-[12px] text-[var(--ad-fg-subtle)]">Ada perubahan yang belum disimpan.</p>
          <p v-else class="flex items-center gap-1.5 text-[12px] text-[var(--ad-fg-subtle)]">
            <AdminIcon name="check" :size="13" />
            Tersimpan
          </p>
        </div>
      </div>
    </form>
  </div>
</template>
