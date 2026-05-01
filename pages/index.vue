<script setup lang="ts">
const { t } = useI18n()
const tt = useT()

const { data: projects } = await useProjects({ featured: true })
const { data: site } = await useSiteSettings()

useSeoMeta({
  title: () => t('home.seo_title'),
  description: () => t('home.seo_description'),
})
</script>

<template>
  <div>
    <HeroIntro
      :studio-name="site?.studio_name || '2A2U'"
      :intro="tt(site?.manifesto)"
      :scroll-hint="t('home.scroll_hint')"
    />

    <ProjectShowcase
      v-if="projects?.length"
      :projects="projects"
      :eyebrow="t('home.featured_eyebrow')"
      :heading="t('home.featured_heading')"
    />
  </div>
</template>
