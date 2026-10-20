<script setup lang="ts">
/**
 * Project dossier (identity-dossier §3.7, roadmap #14).
 *
 * Cover → ruler → [sticky rail: fact sheet + chapter nav | chapters
 * Site … Material] → Built (the rail ends here so full-bleed images can
 * span the viewport) → services → next-project band.
 * Tablet/mobile: compact fact summary + <details>, sticky chapter bar.
 *
 * Data per docs/design/api-contract.md. lat/lng are public, already
 * rounded values; when absent no coordinates are shown anywhere.
 */
import type { Chapter } from '~/types/content'
import type DossierLightbox from '~/components/dossier/Lightbox.vue'

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

const listIndex = computed(() => (allProjects.value ?? []).findIndex(p => p.slug === slug.value))

// Sheet number: B-<position in the published set>.
const sheetNo = computed(() => `B-${pad2(listIndex.value < 0 ? 1 : listIndex.value + 1)}`)

const next = computed(() => {
  const list = allProjects.value ?? []
  const idx = listIndex.value
  if (idx < 0 || list.length < 2) return null
  const pos = (idx + 1) % list.length
  return { project: list[pos]!, position: pos + 1, total: list.length }
})

const title = computed(() => tt(project.value?.title))

const coverMeta = computed(() => {
  const p = project.value
  if (!p) return []
  return [
    sheetNo.value,
    p.category ? tt(p.category.name) : '',
    tt(p.location),
    p.year ? String(p.year) : '',
  ].filter(Boolean)
})

const model = computed(() => project.value ? buildDossier(project.value) : null)
const chapters = computed(() => model.value?.chapters ?? [])
const railChapters = computed(() => chapters.value.filter(c => c.key !== 'built'))
const built = computed(() => chapters.value.find(c => c.key === 'built') ?? null)
const navChapters = computed(() => chapters.value.map(c => ({ key: c.key, no: c.no })))
const services = computed(() => ttList(project.value?.services_performed))

// ---- SEO / JSON-LD -------------------------------------------------------

useSiteSeo({
  title: () => `${tt(project.value?.title)} — AA2U`,
  description: () => tt(project.value?.description),
  image: () => project.value?.cover_image,
  type: 'article',
})

const config = useRuntimeConfig()
const siteUrl = (config.public as any).siteUrl as string

const projectJsonLd = computed(() => {
  const p = project.value
  if (!p) return ''
  const base = siteUrl.replace(/\/$/, '')
  const pageUrl = `${base}${route.path}`
  const workUrl = `${base}${localePath('/work')}`
  const hasGeo = typeof p.lat === 'number' && typeof p.lng === 'number'
  const locationName = tt(p.location)
  const place = (locationName || hasGeo)
    ? {
        '@type': 'Place',
        name: locationName || undefined,
        // Only the public, already rounded values; omitted when hidden.
        geo: hasGeo ? { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } : undefined,
      }
    : undefined
  return jsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: tt(p.title),
      description: tt(p.description),
      url: pageUrl,
      image: p.cover_image,
      dateCreated: p.year ? String(p.year) : undefined,
      genre: p.category ? tt(p.category.name) : undefined,
      locationCreated: place,
      contributor: p.partners?.length ? p.partners : undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('nav.work'), item: workUrl },
        { '@type': 'ListItem', position: 2, name: tt(p.title), item: pageUrl },
      ],
    },
  ])
})

useHead({
  script: [
    { type: 'application/ld+json', innerHTML: () => projectJsonLd.value },
  ],
})

// ---- Shared-element FLIP from the work card -----------------------------

const coverRef = ref<HTMLElement | null>(null)
const coverFlipId = computed(() => `project-cover-${slug.value}`)
const coverFailed = ref(false)

async function playCoverFlip() {
  const { consume } = useSharedFlip()
  const payload = consume()
  if (!payload || payload.flipId !== coverFlipId.value) return
  if (prefersReducedMotion()) return

  await nextTick()
  const target = coverRef.value
  if (!target) return

  const { $gsap } = useNuxtApp() as any
  if (!$gsap) return

  const r = target.getBoundingClientRect()
  $gsap.from(target, {
    x: payload.rect.x - r.x,
    y: payload.rect.y - r.y,
    scaleX: payload.rect.width / r.width,
    scaleY: payload.rect.height / r.height,
    transformOrigin: '0 0',
    duration: 1,
    ease: 'power3.inOut',
    clearProps: 'transform',
  })
}

// ---- Header offset, chapter tracking, anchor scrolling -------------------

const root = ref<HTMLElement | null>(null)
const headerH = ref(0)
const current = ref<Chapter | null>(null)
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null

function measureHeader() {
  const h = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0
  headerH.value = h
  root.value?.style.setProperty('--hdr', `${h}px`)
  // Viewport width without the scrollbar, for full-bleed / wide figures
  // (100vw would overshoot by the scrollbar width with classic scrollbars).
  root.value?.style.setProperty('--vw', `${document.documentElement.clientWidth}px`)
}

function isDesktop() {
  return window.matchMedia('(min-width: 1024px)').matches
}

/** Header + (mobile) chapter bar + breathing room. */
function scrollOffset() {
  return headerH.value + (isDesktop() ? 24 : 44 + 16)
}

function observeChapters() {
  io?.disconnect()
  current.value = chapters.value[0]?.key ?? null
  if (!root.value || !('IntersectionObserver' in window)) return
  const visible = new Set<string>()
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const key = (e.target as HTMLElement).dataset.chapter!
      if (e.isIntersecting) visible.add(key)
      else visible.delete(key)
    }
    // Reading band: from under the header/bar down to 30% of the viewport.
    // The last chapter (document order) whose top has entered it wins.
    const last = [...chapters.value].reverse().find(c => visible.has(c.key))
    if (last) current.value = last.key
  }, { rootMargin: `-${scrollOffset() + 8}px 0px -70% 0px` })
  root.value.querySelectorAll<HTMLElement>('[data-chapter]').forEach(el => io!.observe(el))
}

async function navigate(key: Chapter, e: MouseEvent) {
  const el = document.getElementById(`ch-${key}`)
  if (!el) return
  // Handle it here (offset for the fixed header) instead of the global
  // Lenis anchor handler, which scrolls with offset 0.
  e.preventDefault()
  e.stopPropagation()
  await nextTick() // let the mobile chapter list close first
  const lenis = (useNuxtApp() as any).$lenis
  const top = el.getBoundingClientRect().top + window.scrollY - scrollOffset()
  if (lenis && !prefersReducedMotion()) lenis.scrollTo(top)
  else window.scrollTo({ top, behavior: 'auto' })
  history.replaceState(history.state, '', `#ch-${key}`)
  el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  current.value = key
}

// ---- Lightbox -----------------------------------------------------------

const lightbox = ref<InstanceType<typeof DossierLightbox> | null>(null)
function openLightbox(i: number, trigger: HTMLElement) {
  lightbox.value?.open(i, trigger)
}

onMounted(() => {
  playCoverFlip()
  measureHeader()
  const header = document.querySelector('.site-header')
  if (header && 'ResizeObserver' in window) {
    ro = new ResizeObserver(() => { measureHeader(); observeChapters() })
    ro.observe(header)
  }
  observeChapters()
})

watch(() => chapters.value.map(c => c.key).join(), () => nextTick(observeChapters))

onBeforeUnmount(() => {
  io?.disconnect()
  ro?.disconnect()
})
</script>

<template>
  <!-- Loading: hatch (poché) placeholders, no shimmer. -->
  <div v-if="showSkeleton" class="pb-24" aria-busy="true">
    <span class="sr-only" role="status">{{ t('dossier.loading') }}</span>
    <div class="dossier-cover hatch" aria-hidden="true" />
    <div class="sheet-wrap pt-14" aria-hidden="true">
      <div class="h-px bg-line mb-10" />
      <div class="sheet-cols gap-y-10">
        <div class="col-span-full lg:col-span-3 space-y-3">
          <div v-for="i in 6" :key="i" class="h-5 hatch" :style="{ width: `${90 - i * 7}%` }" />
        </div>
        <div class="col-span-full lg:col-start-4 lg:col-span-9 space-y-5">
          <div class="h-8 w-1/3 hatch" />
          <div class="h-4 w-3/4 hatch" />
          <div class="h-4 w-2/3 hatch" />
          <div class="aspect-[16/10] hatch" />
        </div>
      </div>
    </div>
  </div>

  <article
    v-else-if="project"
    ref="root"
    class="dossier"
    :aria-labelledby="'dossier-title'"
  >
    <!-- Cover -->
    <header class="dossier-cover">
      <div
        ref="coverRef"
        :data-flip-id="coverFlipId"
        class="absolute inset-0 hatch will-change-transform"
      >
        <NuxtImg
          v-if="project.cover_image && !coverFailed"
          :src="project.cover_image"
          :alt="title"
          sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"
          format="webp"
          loading="eager"
          fetchpriority="high"
          class="w-full h-full object-cover"
          @error="coverFailed = true"
        />
      </div>
      <div class="absolute inset-0 scrim" aria-hidden="true" />
      <div class="dossier-cover__text sheet-wrap">
        <p class="mono-s mb-4">
          <template v-for="(m, i) in coverMeta" :key="i">
            <span v-if="i > 0" class="text-fg-2" aria-hidden="true"> · </span>{{ m }}
          </template>
        </p>
        <h1 id="dossier-title" class="font-display display-xl">{{ title }}</h1>
      </div>
    </header>

    <div class="sheet-wrap pt-14">
      <SheetRuler :sheet="sheetNo" :label="title" dim="├── 3 ──┤ ├──────── 9 ────────┤" />
    </div>

    <!-- Tablet / mobile facts -->
    <div class="sheet-wrap lg:hidden mb-8">
      <DossierFactSheet :project="project" variant="compact" />
    </div>

    <div class="dossier-body">
      <DossierChapterNav
        v-if="navChapters.length > 1"
        class="dossier-bar lg:hidden"
        variant="bar"
        :chapters="navChapters"
        :current="current"
        @navigate="navigate"
      />

      <div class="sheet-wrap sheet-cols">
        <aside class="dossier-rail" :aria-label="t('dossier.aside')">
          <div class="dossier-rail__in">
            <DossierFactSheet :project="project" variant="rail" />
            <DossierChapterNav
              v-if="navChapters.length > 1"
              class="mt-8"
              variant="rail"
              :chapters="navChapters"
              :current="current"
              @navigate="navigate"
            />
          </div>
        </aside>

        <div class="dossier-content">
          <p v-if="model?.lead" v-reveal class="dossier-lead">{{ tt(model.lead) }}</p>

          <section
            v-for="ch in railChapters"
            :id="`ch-${ch.key}`"
            :key="ch.key"
            :data-chapter="ch.key"
            class="chapter"
            :aria-labelledby="`ch-${ch.key}-h`"
          >
            <header class="chapter__head">
              <span class="mono-s text-muted" aria-hidden="true">{{ pad2(ch.no) }}</span>
              <h2 :id="`ch-${ch.key}-h`" tabindex="-1" class="font-display display-m">
                {{ t(`dossier.chapter.${ch.key}`) }}
              </h2>
            </header>
            <p v-if="ch.text" v-reveal class="chapter__text">{{ tt(ch.text) }}</p>
            <div class="chapter__figs">
              <DossierDrawingFigure
                v-for="d in ch.drawings"
                :key="`d${d.fig}`"
                :item="d"
                :title="title"
                @open="openLightbox"
              />
              <DossierImageBlock
                v-for="(b, bi) in ch.blocks"
                :key="`b${bi}`"
                :block="b"
                :title="title"
                @open="openLightbox"
              />
              <DossierMaterials v-if="ch.materials.length" :materials="ch.materials" />
            </div>
          </section>
        </div>
      </div>

      <!-- Built: the rail ends here so full-bleed figures can span the viewport. -->
      <div v-if="built" class="sheet-wrap sheet-cols">
        <div class="dossier-content">
          <section
            :id="`ch-${built.key}`"
            :data-chapter="built.key"
            class="chapter"
            :aria-labelledby="`ch-${built.key}-h`"
          >
            <header class="chapter__head">
              <span class="mono-s text-muted" aria-hidden="true">{{ pad2(built.no) }}</span>
              <h2 :id="`ch-${built.key}-h`" tabindex="-1" class="font-display display-m">
                {{ t('dossier.chapter.built') }}
              </h2>
            </header>
            <p v-if="built.text" v-reveal class="chapter__text">{{ tt(built.text) }}</p>
            <div class="chapter__figs">
              <DossierDrawingFigure
                v-for="d in built.drawings"
                :key="`d${d.fig}`"
                :item="d"
                :title="title"
                @open="openLightbox"
              />
              <DossierImageBlock
                v-for="(b, bi) in built.blocks"
                :key="`b${bi}`"
                :block="b"
                :title="title"
                @open="openLightbox"
              />
            </div>
          </section>
        </div>
      </div>
    </div>

    <!-- Services performed -->
    <section
      v-if="services.length"
      class="sheet-wrap sheet-cols pt-12 pb-24"
      aria-labelledby="dossier-services"
    >
      <div class="dossier-services">
        <h2 id="dossier-services" v-reveal class="mono-s text-muted pt-3 border-t border-line-strong mb-6">
          {{ t('project.what_we_did') }}
        </h2>
        <ol v-reveal-stagger class="space-y-3 text-lg md:text-xl">
          <li v-for="(svc, i) in services" :key="i" class="flex items-baseline gap-4">
            <span class="mono-s text-muted" aria-hidden="true">{{ pad2(i + 1) }}</span>
            {{ svc }}
          </li>
        </ol>
      </div>
    </section>

    <DossierNextBand
      v-if="next"
      :project="next.project"
      :position="next.position"
      :total="next.total"
    />

    <DossierLightbox
      v-if="model?.lightbox.length"
      ref="lightbox"
      :items="model.lightbox"
      :title="title"
    />
  </article>
</template>

<style scoped>
.dossier { --hdr: 56px; }
@media (min-width: 768px) { .dossier { --hdr: 84px; } }

.dossier-cover {
  position: relative;
  height: 85svh;
  min-height: 480px;
  overflow: hidden;
}
.dossier-cover__text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2.5rem;
}
.dossier-cover__text h1 { overflow-wrap: anywhere; }
@media (max-width: 639px) {
  .dossier-cover { height: 70svh; min-height: 420px; }
  .dossier-cover__text { bottom: 1.5rem; }
}

.dossier-body { position: relative; }
.dossier-bar {
  position: sticky;
  top: var(--hdr);
  z-index: 20;
  margin-bottom: 2rem;
}

/* Grid: rail 1–3, content 4–12 on desktop; one column below. */
.dossier-rail { display: none; }
.dossier-content,
.dossier-services { grid-column: 1 / -1; min-width: 0; }
@media (min-width: 1024px) {
  .dossier-rail { display: block; grid-column: 1 / span 3; }
  .dossier-rail__in {
    position: sticky;
    top: calc(var(--hdr) + 24px);
    padding-bottom: 3rem;
  }
  .dossier-content,
  .dossier-services { grid-column: 4 / -1; }

  /* Distances from the content column to the viewport edges, for wide
     (bleeds right) and full (bleeds both ways) figures. */
  .dossier-content {
    --side: calc((var(--vw, 100vw) - min(var(--vw, 100vw), var(--sheet-max))) / 2 + var(--sheet-margin));
    --bleed-right: var(--side);
    --bleed-left: calc(var(--side) + (min(var(--vw, 100vw), var(--sheet-max)) - 2 * var(--sheet-margin) + var(--sheet-gutter)) / 4);
  }
}

.dossier-lead {
  font-size: clamp(1.25rem, 1.8vw, 1.5rem);
  line-height: 1.5;
  max-width: 40ch;
  margin-bottom: 4rem;
}

.chapter {
  padding-bottom: 6rem;
  scroll-margin-top: calc(var(--hdr) + 24px);
}
@media (max-width: 1023px) {
  .chapter { scroll-margin-top: calc(var(--hdr) + 60px); padding-bottom: 4rem; }
}
.chapter__head {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  border-top: 1px solid var(--color-line-strong);
  padding-top: .75rem;
  margin-bottom: 1.5rem;
}
.chapter__head h2:focus { outline: none; }
.chapter__text {
  font-size: 1.125rem;
  line-height: 1.6;
  max-width: 64ch;
  color: var(--color-fg);
  margin-bottom: 2.5rem;
}
.chapter__figs { display: grid; gap: 3rem; }
.chapter__figs:empty { display: none; }
</style>
