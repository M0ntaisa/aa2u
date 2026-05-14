<script setup lang="ts">
const { t } = useI18n()
const tt = useT()

const { data: team } = await useTeam()
const { data: principles } = await usePrinciples()
const { data: site } = await useSiteSettings()

useSiteSeo({
  title: () => `${t('nav.about')} — AA2U`,
  description: () => tt(site.value?.manifesto),
})

const config = useRuntimeConfig()
const siteUrl = (config.public as any).siteUrl as string

const organizationJsonLd = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.value?.studio_name ?? 'AA2U',
  url: siteUrl,
  email: site.value?.contact_email,
  telephone: site.value?.contact_phone,
  address: tt(site.value?.address),
  sameAs: [
    site.value?.socials?.instagram,
    site.value?.socials?.linkedin,
    site.value?.socials?.behance,
  ].filter(Boolean),
  description: tt(site.value?.manifesto),
}))

useHead({
  script: [
    { type: 'application/ld+json', innerHTML: () => organizationJsonLd.value },
  ],
})
</script>

<template>
  <div class="px-6 pt-32 pb-24">
    <header class="mb-20 md:mb-28">
      <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
        {{ t('about.eyebrow') }}
      </span>
      <h1 class="mt-4 font-display text-5xl md:text-8xl tracking-tight leading-[0.95] max-w-4xl">
        {{ t('about.heading') }}
      </h1>
    </header>

    <div v-reveal>
      <AboutBlock number="001" :heading="t('about.who.heading')" :body="t('about.who.body')" />
    </div>
    <div v-reveal>
      <AboutBlock number="002" :heading="t('about.what.heading')" :body="t('about.what.body')" />
    </div>

    <!-- Studio principles -->
    <section v-if="principles?.length" class="py-16 md:py-24 border-t border-white/10">
      <span v-reveal class="block text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
        N°003 — {{ t('about.principles_label') }}
      </span>
      <div
        v-reveal-stagger="{ stagger: 0.1, y: 30 }"
        class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12"
      >
        <div
          v-for="(p, i) in principles"
          :key="i"
          class="border-t border-white/10 pt-4"
        >
          <span class="text-xs text-[var(--color-muted)] tracking-[0.25em]">
            N°{{ String(i + 1).padStart(2, '0') }}
          </span>
          <h3 class="mt-3 font-display text-3xl md:text-4xl tracking-tight">
            {{ tt(p.title) }}
          </h3>
          <p v-if="p.description" class="mt-3 text-sm text-[var(--color-muted)] leading-relaxed">
            {{ tt(p.description) }}
          </p>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section v-if="team?.length" class="py-16 md:py-24 border-t border-white/10">
      <div v-reveal>
        <span class="block text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
          N°004 — {{ t('about.team_label') }}
        </span>
        <h2 class="mt-4 font-display text-4xl md:text-6xl tracking-tight leading-[1] mb-12">
          {{ t('about.team_heading') }}
        </h2>
      </div>
      <div
        v-reveal-stagger="{ stagger: 0.08, y: 40 }"
        class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12"
      >
        <TeamMember
          v-for="(m, i) in team"
          :key="m.name"
          :member="m"
          :index="i"
        />
      </div>
    </section>
  </div>
</template>
