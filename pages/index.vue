<script setup lang="ts">
const { t } = useI18n()
const tt = useT()

const { data: projects } = await useProjects({ featured: true })
const { data: site } = await useSiteSettings()

useSiteSeo({
  title: () => t('home.seo_title'),
  description: () => t('home.seo_description'),
  image: () => projects.value?.[0]?.cover_image,
})
</script>

<template>
  <div>
    <HeroIntro
      :studio-name="site?.studio_name || 'AA2U'"
      :scroll-hint="t('home.scroll_hint')"
      :projects="projects ?? []"
    />

    <ManifestoSection
      v-if="site?.manifesto"
      :text="tt(site.manifesto)"
      :eyebrow="t('home.manifesto_eyebrow')"
      :signature="site?.studio_name || 'AA2U'"
    />

    <ProjectShowcase
      v-if="projects?.length"
      :projects="projects"
      :eyebrow="t('home.featured_eyebrow')"
      :heading="t('home.featured_heading')"
    />
  </div>
</template>
