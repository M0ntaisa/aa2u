<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const tt = useT()
const ttList = useTList()
const localePath = useLocalePath()

const slug = computed(() => String(route.params.slug))

const { data: project } = await useProject(slug)
const { data: allProjects } = await useProjects()

if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

const nextProject = computed(() => {
  const list = allProjects.value ?? []
  const idx = list.findIndex(p => p.slug === slug.value)
  if (idx < 0 || list.length === 0) return null
  return list[(idx + 1) % list.length]
})

useSeoMeta({
  title: () => `${tt(project.value?.title)} — AA2U`,
  description: () => tt(project.value?.description),
})

const coverRef = ref<HTMLElement | null>(null)
const coverFlipId = computed(() => `project-cover-${slug.value}`)

onMounted(async () => {
  const { consume } = useSharedFlip()
  const payload = consume()
  if (!payload || payload.flipId !== coverFlipId.value) return

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
  <article v-if="project" class="pb-24">
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
        <img :src="project.cover_image" :alt="tt(project.title)" class="w-full h-full object-cover" />
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
        <img :src="img.url" :alt="img.alt ? tt(img.alt) : tt(project.title)" class="w-full h-full object-cover" />
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
