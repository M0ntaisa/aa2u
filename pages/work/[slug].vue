<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const tt = useT()
const ttList = useTList()
const localePath = useLocalePath()

const slug = computed(() => String(route.params.slug))

const { data: project, pending } = await useProject(slug)
const { data: allProjects } = await useProjects()

if (!project.value && !pending.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

const showSkeleton = computed(() => pending.value && !project.value)

const nextProject = computed(() => {
  const list = allProjects.value ?? []
  const idx = list.findIndex(p => p.slug === slug.value)
  if (idx < 0 || list.length === 0) return null
  return list[(idx + 1) % list.length]
})

useSiteSeo({
  title: () => `${tt(project.value?.title)} — AA2U`,
  description: () => tt(project.value?.description),
  image: () => project.value?.cover_image,
  type: 'article',
})

const config = useRuntimeConfig()
const siteUrl = (config.public as any).siteUrl as string

const projectJsonLd = computed(() => {
  if (!project.value) return ''
  const pageUrl = `${siteUrl.replace(/\/$/, '')}${route.path}`
  const workUrl = `${siteUrl.replace(/\/$/, '')}${localePath('/work')}`
  return JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: tt(project.value.title),
      description: tt(project.value.description),
      url: pageUrl,
      image: project.value.cover_image,
      dateCreated: project.value.year ? String(project.value.year) : undefined,
      locationCreated: tt(project.value.location),
      contributor: project.value.partners,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('nav.work'), item: workUrl },
        { '@type': 'ListItem', position: 2, name: tt(project.value.title), item: pageUrl },
      ],
    },
  ])
})

useHead({
  script: [
    { type: 'application/ld+json', innerHTML: () => projectJsonLd.value },
  ],
})

const coverRef = ref<HTMLElement | null>(null)
const coverFlipId = computed(() => `project-cover-${slug.value}`)

onMounted(async () => {
  const { consume } = useSharedFlip()
  const payload = consume()
  if (!payload || payload.flipId !== coverFlipId.value) return
  if (prefersReducedMotion()) return

  await nextTick()

  const target = coverRef.value
  if (!target) return

  const { $gsap } = useNuxtApp() as any
  if (!$gsap) return

  const targetRect = target.getBoundingClientRect()
  const dx = payload.rect.x - targetRect.x
  const dy = payload.rect.y - targetRect.y
  const sx = payload.rect.width / targetRect.width
  const sy = payload.rect.height / targetRect.height

  $gsap.from(target, {
    x: dx,
    y: dy,
    scaleX: sx,
    scaleY: sy,
    transformOrigin: '0 0',
    duration: 1,
    ease: 'power3.inOut',
    clearProps: 'transform',
  })
})
</script>

<template>
  <div v-if="showSkeleton" class="pb-24" aria-busy="true">
    <header class="px-6 pt-32 pb-12 grid md:grid-cols-12 gap-6">
      <div class="md:col-span-12 space-y-5">
        <div class="h-3 w-32 bg-white/[0.04] skeleton-line rounded-sm" />
        <div class="h-16 md:h-32 w-3/4 bg-white/[0.06] skeleton-line rounded-sm" />
      </div>
      <div class="md:col-span-12 mt-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 border-t border-white/10 pt-8">
        <div v-for="i in 4" :key="i" class="space-y-2">
          <div class="h-3 w-16 bg-white/[0.04] skeleton-line rounded-sm" />
          <div class="h-4 w-24 bg-white/[0.06] skeleton-line rounded-sm" />
        </div>
      </div>
    </header>
    <div class="px-6">
      <div class="aspect-[16/9] bg-white/[0.04] skeleton-line" />
    </div>
  </div>

  <article v-else-if="project" class="pb-24">
    <!-- Hero -->
    <header class="px-6 pt-32 pb-12 grid md:grid-cols-12 gap-6">
      <div class="md:col-span-12">
        <span class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
          {{ project.category ? tt(project.category.name) : '' }}
        </span>
        <h1 class="mt-4 font-display text-5xl md:text-9xl tracking-tight leading-[0.9]">
          {{ tt(project.title) }}
        </h1>
      </div>
      <dl class="md:col-span-12 mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 border-t border-white/10 pt-8 text-sm">
        <div>
          <dt class="text-[var(--color-muted)] text-xs uppercase tracking-[0.2em] mb-1">{{ t('project.location') }}</dt>
          <dd>{{ tt(project.location) || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[var(--color-muted)] text-xs uppercase tracking-[0.2em] mb-1">{{ t('project.year') }}</dt>
          <dd>{{ project.year || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[var(--color-muted)] text-xs uppercase tracking-[0.2em] mb-1">{{ t('project.type') }}</dt>
          <dd>{{ project.category ? tt(project.category.name) : '—' }}</dd>
        </div>
        <div>
          <dt class="text-[var(--color-muted)] text-xs uppercase tracking-[0.2em] mb-1">{{ t('project.partners') }}</dt>
          <dd>{{ project.partners?.length ? project.partners.join(', ') : '—' }}</dd>
        </div>
      </dl>
    </header>

    <!-- Cover image -->
    <div class="px-6">
      <div
        ref="coverRef"
        :data-flip-id="coverFlipId"
        class="aspect-[16/9] overflow-hidden bg-[var(--color-muted)]/10 will-change-transform"
      >
        <NuxtImg :src="project.cover_image" :alt="tt(project.title)" sizes="100vw" format="webp" loading="eager" class="w-full h-full object-cover" />
      </div>
    </div>

    <!-- Description -->
    <section v-if="project.description" v-reveal class="px-6 pt-20 pb-12 grid md:grid-cols-12 gap-6">
      <div class="md:col-span-3 text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
        N°001
      </div>
      <p class="md:col-span-9 text-xl md:text-2xl leading-[1.5] max-w-3xl">
        {{ tt(project.description) }}
      </p>
    </section>

    <!-- Gallery -->
    <section
      v-if="project.images?.length"
      v-reveal-stagger="{ stagger: 0.1, y: 30 }"
      class="px-6 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div
        v-for="(img, i) in project.images"
        :key="i"
        class="aspect-[4/3] overflow-hidden bg-[var(--color-muted)]/10"
        :class="i === 0 ? 'md:col-span-2 md:aspect-[16/9]' : ''"
      >
        <NuxtImg :src="img.url" :alt="img.alt ? tt(img.alt) : tt(project.title)" :sizes="i === 0 ? '100vw' : '(max-width: 768px) 100vw, 50vw'" format="webp" loading="lazy" class="w-full h-full object-cover" />
      </div>
    </section>

    <!-- Process note -->
    <section v-if="project.process_note" v-reveal class="px-6 pt-20 pb-12 grid md:grid-cols-12 gap-6">
      <div class="md:col-span-3 text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
        N°002
      </div>
      <p class="md:col-span-9 text-xl md:text-2xl leading-[1.5] max-w-3xl text-[var(--color-muted)]">
        {{ tt(project.process_note) }}
      </p>
    </section>

    <!-- Services performed -->
    <section v-if="project.services_performed" class="px-6 pt-20 pb-24 grid md:grid-cols-12 gap-6 border-t border-white/10">
      <div v-reveal class="md:col-span-3 mt-2 text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
        {{ t('project.what_we_did') }}
      </div>
      <ul
        v-reveal-stagger="{ stagger: 0.08, y: 20 }"
        class="md:col-span-9 space-y-3 text-lg md:text-xl"
      >
        <li
          v-for="(svc, i) in ttList(project.services_performed)"
          :key="i"
          class="flex items-baseline gap-4"
        >
          <span class="text-xs text-[var(--color-muted)]">{{ String(i + 1).padStart(2, '0') }}</span>
          {{ svc }}
        </li>
      </ul>
    </section>

    <!-- Next project -->
    <NuxtLink
      v-if="nextProject"
      v-reveal
      :to="localePath(`/work/${nextProject.slug}`)"
      class="block px-6 pt-16 pb-24 border-t border-white/10 group"
    >
      <div class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] mb-4">
        {{ t('project.next') }}
      </div>
      <div class="font-display text-4xl md:text-7xl tracking-tight leading-[0.95] transition-transform duration-700 ease-out group-hover:translate-x-2">
        {{ tt(nextProject.title) }} →
      </div>
    </NuxtLink>
  </article>
</template>
