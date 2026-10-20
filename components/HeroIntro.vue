<script setup lang="ts">
import type { Project } from '~/types/content'

/**
 * Home hero (§3.2): one full-bleed, true-colour featured cover at a time
 * (max 4), rotating every 7s with a section-cut transition. The h1 is the
 * studio positioning line (`home.intro`); the mono caption carries the
 * project's rounded coordinates (when public), location, studio time/light,
 * title and year.
 *
 * WCAG 2.2.2: visible Pause/Play, rotation also halts on hover, on focus
 * within the hero and while the tab is hidden; no autoplay under reduced
 * motion (Prev/Next still work). Only manual changes are announced.
 *
 * States: 0 projects → h1 on --bg with the ruler, no image; 1 project → no
 * controls/rotation; image loading or failed → hatch + caption remains.
 */
const props = defineProps<{
  intro: string
  projects?: Project[]
}>()

const tt = useT()
const { t } = useI18n()
const localePath = useLocalePath()

const DURATION = 7000

const slides = computed(() => (props.projects ?? []).slice(0, 4))
const count = computed(() => slides.value.length)
const rotates = computed(() => count.value > 1)
const cur = ref(0)
const current = computed<Project | null>(() => slides.value[cur.value] ?? null)

// ---- Caption ----
// Coordinates arrive pre-rounded (~1 km) from the mapper and are absent
// when the project hides its location — then the caption just omits them.
const coords = computed(() => formatDms(current.value?.lat, current.value?.lng))
const now = ref<Date | null>(null) // client-only, so SSR and hydration agree
const timeLabel = computed(() => (now.value ? `${studioTime(now.value)} WIB` : ''))
const lightLabel = computed(() => (now.value ? t(`home.hero.light.${studioLight(now.value)}`) : ''))
const indexLabel = computed(() => `${pad2(cur.value + 1)}/${pad2(Math.max(count.value, 1))}`)

// ---- Rotation ----
const paused = ref(false)       // user's Pause/Play choice
const changed = ref(false)      // a transition has happened (enables the cut edge)
const prevIdx = ref<number | null>(null)
const announcement = ref('')
const failed = reactive(new Set<string>())

const heroRef = ref<HTMLElement | null>(null)
const barRef = ref<HTMLElement | null>(null)
const headingRef = ref<HTMLElement | null>(null)

let hovering = false
let focused = false
let progress = 0
let raf = 0
let last = 0
let clock: ReturnType<typeof setInterval> | null = null

function setProgress(p: number) {
  progress = p
  barRef.value?.style.setProperty('--p', String(p))
}

function go(n: number, manual: boolean) {
  if (!count.value) return
  prevIdx.value = cur.value
  cur.value = (n + count.value) % count.value
  changed.value = true
  setProgress(0)
  if (manual && current.value) {
    announcement.value = t('home.hero.announce', {
      n: cur.value + 1,
      total: count.value,
      title: tt(current.value.title),
    })
  }
}

function prev() { go(cur.value - 1, true) }
function next() { go(cur.value + 1, true) }
function togglePause() {
  paused.value = !paused.value
  // Reduced motion parks the bar full; start the opted-in run from zero.
  if (!paused.value && progress >= 1) setProgress(0)
  sync()
}

const halted = () => !rotates.value || paused.value || hovering || focused || document.hidden

// The rAF loop only runs while rotation is live; every halt reason calls
// sync() when it changes, so a paused hero costs nothing per frame.
function loop(ts: number) {
  const dt = last ? Math.min(ts - last, 100) : 0
  last = ts
  const p = progress + dt / DURATION
  if (p >= 1) go(cur.value + 1, false)
  else setProgress(p)
  raf = requestAnimationFrame(loop)
}

function sync() {
  if (!import.meta.client) return
  if (halted()) {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  } else if (!raf) {
    last = 0
    raf = requestAnimationFrame(loop)
  }
}

// Hover-pause is for a real mouse only: on touch, the emulated enter on tap
// would halt rotation until the user tapped somewhere else.
function onPointerEnter(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  hovering = true
  sync()
}
function onPointerLeave(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  hovering = false
  sync()
}
// Only keyboard focus pauses: a mouse click on Next/Play also focuses the
// button, and that must not keep rotation halted after the pointer leaves.
function onFocusIn(e: FocusEvent) {
  const el = e.target as Element | null
  if (!el?.matches?.(':focus-visible')) return
  focused = true
  sync()
}
function onFocusOut(e: FocusEvent) {
  if (!heroRef.value?.contains(e.relatedTarget as Node | null)) {
    focused = false
    sync()
  }
}

onMounted(() => {
  // An image that failed before hydration never reached @error.
  heroRef.value?.querySelectorAll<HTMLImageElement>('img[data-slug]').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) failed.add(img.dataset.slug!)
  })

  now.value = new Date()
  clock = setInterval(() => { now.value = new Date() }, 30_000)

  const reduced = prefersReducedMotion()
  if (rotates.value) {
    // No autoplay under reduced motion: start paused (Play is an explicit
    // opt-in). The current segment reads as "here" until then.
    if (reduced) {
      paused.value = true
      setProgress(1)
    }
    document.addEventListener('visibilitychange', sync)
    sync()
  }

  // Text line reveal for the h1 — only when nothing has painted it yet:
  // behind the intro curtain, or on a client-side navigation. On a plain
  // SSR load it is already on screen, so hiding it would flash.
  const nuxtApp = useNuxtApp() as any
  const { $gsap, $SplitText } = nuxtApp
  let curtain = false
  try {
    curtain = !document.documentElement.classList.contains('no-intro')
      && !sessionStorage.getItem('aa2u:intro-played')
  } catch {}
  if (!reduced && $gsap && $SplitText && headingRef.value && (curtain || !nuxtApp.isHydrating)) {
    const split = new $SplitText(headingRef.value, { type: 'lines', mask: 'lines' })
    const tween = $gsap.from(split.lines, {
      yPercent: 100,
      duration: MOTION.d3,
      stagger: MOTION.stagger,
      ease: MOTION.ease,
      delay: curtain ? 0.72 : 0.1,
      onComplete: () => split.revert(),
    })
    onBeforeUnmount(() => { tween.kill(); split.revert() })
  }
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  document.removeEventListener('visibilitychange', sync)
  if (clock) clearInterval(clock)
})
</script>

<template>
  <section
    ref="heroRef"
    class="hero"
    :class="{ 'hero--empty': !count }"
    :aria-roledescription="rotates ? t('home.hero.carousel') : undefined"
    :aria-label="t('home.hero.label')"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <!-- Slides: stacked, the active one is cut open left → right. -->
    <div v-if="count" class="hero__slides">
      <div
        v-for="(p, i) in slides"
        :key="p.slug"
        class="hero__slide hatch"
        :class="{ 'is-on': i === cur, 'is-was': i === prevIdx && i !== cur }"
        :aria-hidden="i === cur ? undefined : 'true'"
      >
        <NuxtImg
          v-if="p.cover_image && !failed.has(p.slug)"
          :src="p.cover_image"
          :alt="i === cur ? [tt(p.title), tt(p.location)].filter(Boolean).join(', ') : ''"
          sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"
          format="webp"
          :loading="i === cur || i === (cur + 1) % count ? 'eager' : 'lazy'"
          :preload="i === 0"
          :fetchpriority="i === 0 ? 'high' : 'auto'"
          class="hero__img"
          :data-slug="p.slug"
          @error="failed.add(p.slug)"
        />
      </div>
      <span v-if="changed" :key="cur" class="hero__edge" aria-hidden="true" />
      <div class="hero__scrim" aria-hidden="true" />
    </div>

    <!-- Caption -->
    <div class="hero__cap sheet-wrap">
      <SheetRuler sheet="A-01" :label="t('nav.home')" :on-image="!!count" class="hero__ruler" />

      <div class="sheet-cols">
        <h1 ref="headingRef" class="hero__title font-display display-m">
          {{ intro }}
        </h1>

        <template v-if="current">
          <p class="hero__meta mono-s">
            <template v-if="coords">
              <span :aria-label="coords.spoken">{{ coords.text }}</span>
              <span class="hero__sep" aria-hidden="true">·</span>
            </template>
            <template v-if="current.location">
              <span>{{ tt(current.location) }}</span>
            </template>
            <template v-if="timeLabel">
              <span class="hero__sep" aria-hidden="true">·</span>
              <span>{{ timeLabel }}</span>
              <span class="hero__sep" aria-hidden="true">·</span>
              <span>{{ lightLabel }}</span>
            </template>
          </p>

          <div class="hero__row">
            <p class="mono-s hero__project">
              <span v-if="rotates" class="text-fg-2">{{ indexLabel }}&ensp;</span>
              <span>{{ tt(current.title) }}<template v-if="current.year"> — {{ current.year }}</template></span>
            </p>
            <NuxtLink
              :to="localePath(`/work/${current.slug}`)"
              class="hero__go link-hover"
              :aria-label="t('home.hero.view_project_named', { title: tt(current.title) })"
              :data-cursor-label="t('cursor.open')"
            >
              {{ t('home.hero.view_project') }} <span aria-hidden="true">→</span>
            </NuxtLink>

            <div v-if="rotates" class="hero__ctrl">
              <button
                type="button"
                class="hero__btn mono-s"
                :aria-label="paused ? t('home.hero.play') : t('home.hero.pause')"
                @click="togglePause"
              >
                <svg v-if="paused" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1 L9 5 L2 9 Z" fill="currentColor" /></svg>
                <svg v-else viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1 H4 V9 H2 Z M6 1 H8 V9 H6 Z" fill="currentColor" /></svg>
              </button>
              <button type="button" class="hero__btn mono-s" :aria-label="t('home.hero.prev')" @click="prev">
                <span aria-hidden="true">‹</span>
              </button>
              <button type="button" class="hero__btn mono-s" :aria-label="t('home.hero.next')" @click="next">
                <span aria-hidden="true">›</span>
              </button>
              <div ref="barRef" class="hero__scalebar" aria-hidden="true">
                <i
                  v-for="(p, i) in slides"
                  :key="p.slug"
                  :class="{ 'is-past': i < cur, 'is-cur': i === cur }"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <p class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: max(100svh, 560px);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
}
.hero--empty {
  min-height: 70svh;
  padding-top: 8rem;
}

/* ---- Slides ---- */
.hero__slides {
  position: absolute;
  inset: 0;
  background: var(--color-bg);
}
.hero__slide {
  position: absolute;
  inset: 0;
  clip-path: inset(0 100% 0 0);
  transition: clip-path var(--d-3) var(--ease-draft);
}
.hero__slide.is-on { clip-path: inset(0 0 0 0); z-index: 1; }
/* The outgoing slide stays fully open underneath while the next cuts in. */
.hero__slide.is-was { clip-path: inset(0 0 0 0); z-index: 0; transition: none; }
.hero__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  color: transparent; /* no alt text over the hatch while loading */
}
/* 1px section plane riding the cutting edge. */
.hero__edge {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  z-index: 2;
  background: var(--color-fg);
  opacity: 0;
  animation: hero-sweep var(--d-3) var(--ease-draft);
}
@keyframes hero-sweep {
  0% { left: 0; opacity: 1; }
  99% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
/* Hero-specific scrim: reaches higher than the global --scrim because the
   caption block (ruler → h1 → meta → controls) is tall; ≥83% --bg behind
   all small text so it holds 4.5:1 even over a white sky. */
.hero__scrim {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: linear-gradient(to top,
    rgba(26, 27, 38, .92) 0%,
    rgba(26, 27, 38, .82) 30%,
    rgba(26, 27, 38, .6) 50%,
    rgba(26, 27, 38, 0) 78%);
}

/* ---- Caption ---- */
.hero__cap {
  position: relative;
  z-index: 4;
  padding-bottom: 2rem;
}
.hero__ruler { margin-bottom: 1.5rem; }
.hero__title {
  grid-column: 1 / span 6;
  max-width: 24ch;
  margin-bottom: 1.25rem;
}
.hero__meta {
  grid-column: 1 / -1;
  margin-bottom: .75rem;
  color: var(--color-fg);
}
.hero__sep { margin-inline: .5em; color: var(--color-fg-2); }
.hero__row {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem 1.25rem;
}
.hero__project { color: var(--color-fg); }
.hero__go { font-size: .9375rem; }

.hero__ctrl {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: .5rem;
}
.hero__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
  border: 1px solid var(--color-line-strong);
  font-size: 1rem;
  transition: background-color var(--d-1) var(--ease-draft), color var(--d-1) var(--ease-draft);
}
.hero__btn svg { width: 10px; height: 10px; }
.hero__btn:hover { background: var(--color-fg); color: var(--color-bg); }
@media (pointer: coarse) {
  .hero__btn { min-width: 44px; min-height: 44px; }
}

/* Scale-bar progress: one segment per project, current fills over 7s. */
.hero__scalebar {
  --p: 0;
  display: flex;
  width: 120px;
  height: 6px;
  margin-left: .5rem;
  border: 1px solid var(--color-fg);
}
.hero__scalebar i {
  position: relative;
  flex: 1;
  overflow: hidden;
  border-right: 1px solid var(--color-fg);
}
.hero__scalebar i:last-child { border-right: 0; }
.hero__scalebar i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-fg);
  transform: scaleX(0);
  transform-origin: left center;
}
.hero__scalebar i.is-past::after { transform: scaleX(1); }
.hero__scalebar i.is-cur::after { transform: scaleX(var(--p)); }

@media (max-width: 1023px) {
  .hero__title { grid-column: 1 / -1; }
}
@media (max-width: 639px) {
  .hero__ctrl { margin-left: 0; width: 100%; }
  .hero__scalebar { margin-left: auto; width: 96px; }
}
</style>
