<script setup lang="ts">
const { t } = useI18n()
const tt = useT()

const { data: featured } = await useProjects({ featured: true })
const { data: site } = await useSiteSettings()

// Hero falls back to the first published project when nothing is featured.
const fallback = featured.value?.length ? null : await useProjects()
const heroProjects = computed(() =>
  featured.value?.length
    ? featured.value
    : (fallback?.data.value ?? []).slice(0, 1),
)

useSiteSeo({
  title: () => t('home.seo_title'),
  description: () => t('home.seo_description'),
  image: () => heroProjects.value[0]?.cover_image,
})
</script>

<template>
  <div>
    <HeroIntro
      :intro="t('home.intro')"
      :projects="heroProjects"
    />

    <ManifestoSection
      v-if="site?.manifesto"
      :text="tt(site.manifesto)"
      :eyebrow="t('home.manifesto_eyebrow')"
      :signature="site?.studio_name || 'AA2U'"
    />

    <ProjectShowcase
      v-if="featured?.length"
      :projects="featured"
      :eyebrow="t('home.featured_eyebrow')"
      :heading="t('home.featured_heading')"
    />
  </div>
</template>
