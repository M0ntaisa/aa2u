<script setup lang="ts">
import type { Project } from '~/types/content'

const props = defineProps<{
  projects: Project[]
  heading?: string
  eyebrow?: string
}>()

const root  = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)

/**
 * Layout strategy: instead of ScrollTrigger.pin (which fights with Lenis
 * and can leave the section invisible mid-scroll), we use:
 *
 *   <section> with explicit tall height (provides vertical scroll distance)
 *     <div sticky top-0 h-screen> (visually stays in viewport)
 *       header + track-of-cards
 *
 * ScrollTrigger then only animates track.x as a function of section's
 * scroll progress — no pin spacer, no "fixed" magic, no Lenis conflicts.
 * The outer height is computed at runtime so it equals the horizontal
 * scroll distance plus one viewport height.
 */
onMounted(() => {
  const { $gsap, $ScrollTrigger } = useNuxtApp() as any
  if (!$gsap || !$ScrollTrigger || !root.value || !track.value) return

  // Mobile: keep native vertical layout, no horizontal scroll trick.
  if (!window.matchMedia('(min-width: 768px)').matches) return

  let tween: any = null

  const updateOuterHeight = () => {
    if (!root.value || !track.value) return
    const distance = Math.max(0, track.value.scrollWidth - window.innerWidth + 48)
    root.value.style.height = `${distance + window.innerHeight}px`
  }

  const setup = () => {
    if (!root.value || !track.value) return

    $gsap.set(track.value, { x: 0, clearProps: 'transform' })
    updateOuterHeight()

    const distance = () =>
      Math.max(0, track.value!.scrollWidth - window.innerWidth + 48)

    tween = $gsap.to(track.value, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: root.value,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    })

    $ScrollTrigger.refresh()
  }

  // Two rAFs: let curtain transition + Lenis scroll-reset finish before
  // we measure scrollWidth (depends on image dimensions being applied).
  requestAnimationFrame(() => {
    requestAnimationFrame(setup)
  })

  const onResize = () => {
    updateOuterHeight()
    $ScrollTrigger.refresh()
  }
  window.addEventListener('resize', onResize)

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    if (tween) {
      tween.scrollTrigger?.kill()
      tween.kill()
      tween = null
    }
    if (root.value) root.value.style.height = ''
  })
})
</script>

<template>
  <section ref="root" class="relative">
    <div
      ref="inner"
      class="sticky top-0 h-screen overflow-hidden flex flex-col"
    >
      <div class="px-6 pt-16 md:pt-20 mb-8 md:mb-10 flex flex-col gap-2 max-w-2xl">
        <span v-if="eyebrow" class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
          {{ eyebrow }}
        </span>
        <h2 v-if="heading" class="font-display text-2xl md:text-4xl tracking-tight leading-[1.1]">
          {{ heading }}
        </h2>
      </div>

      <div
        ref="track"
        class="flex flex-col gap-10 px-6 md:flex-row md:gap-10 md:pl-6 md:pr-[10vw] md:items-start will-change-transform flex-1 md:flex-initial"
      >
        <ProjectCard
          v-for="(p, i) in projects"
          :key="p.slug"
          :project="p"
          :index="i"
          variant="showcase"
        />
      </div>
    </div>
  </section>
</template>
