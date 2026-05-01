<script setup lang="ts">
const { t } = useI18n()
const { data: projects } = await useProjects()

useSeoMeta({
  title: () => `${t('nav.work')} — AA2U`,
  description: () => t('work.description'),
})
</script>

<template>
  <section class="px-6 pt-32 pb-24">
    <div class="mb-16 md:mb-24">
      <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
        {{ t('work.eyebrow') }}
      </span>
      <h1 class="mt-4 font-display text-5xl md:text-8xl tracking-tight leading-[0.95] max-w-4xl">
        {{ t('work.heading') }}
      </h1>
    </div>

    <div
      v-if="projects?.length"
      v-reveal-stagger="{ stagger: 0.12, y: 50, start: 'top 90%' }"
      class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-20"
    >
      <ProjectCard
        v-for="(p, i) in projects"
        :key="p.slug"
        :project="p"
        :index="i"
        variant="grid"
      />
    </div>
    <p v-else class="text-[var(--color-muted)]">{{ t('work.empty') }}</p>
  </section>
</template>
