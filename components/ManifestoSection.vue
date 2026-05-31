<script setup lang="ts">
/**
 * Pinned scroll section that reveals a manifesto word-by-word as the user
 * scrolls. Key conceptual terms get an accent color when reaching full
 * opacity. Uses sticky positioning (not ScrollTrigger.pin) to coexist
 * cleanly with Lenis — same pattern as ProjectShowcase.
 */
const props = defineProps<{
  text: string
  eyebrow?: string
  signature?: string
}>()

const { locale } = useI18n()

const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)

const accentWordsById: Record<string, string[]> = {
  id: ['presisi', 'garis', 'ruang', 'bim', 'berpikir', 'keindahan', 'arsitektur'],
  en: ['precision', 'line', 'lines', 'space', 'spaces', 'bim', 'thinking', 'think', 'beauty', 'architecture'],
}

const words = computed(() => {
  const raw = (props.text || '').trim()
  if (!raw) return []
  const list = accentWordsById[locale.value] ?? []
  const accentSet = new Set(list.map((w) => w.toLowerCase()))
  return raw.split(/\s+/).map((w) => {
    const normalized = w.toLowerCase().replace(/[^a-zà-ÿ]/gi, '')
    return { text: w, accent: accentSet.has(normalized) }
  })
})

onMounted(() => {
  const { $gsap, $ScrollTrigger } = useNuxtApp() as any
  if (!$gsap || !$ScrollTrigger || !root.value || !content.value) return
  if (prefersReducedMotion()) return

  let tween: any = null

  const setup = () => {
    const wordEls = content.value!.querySelectorAll<HTMLElement>('.m-word')
    if (!wordEls.length) return

    $gsap.set(wordEls, { opacity: 0.12 })
    $gsap.set(content.value!.querySelectorAll('.m-word.is-accent'), {
      color: 'rgba(255,255,255,0.12)',
    })

    tween = $gsap.to(wordEls, {
      opacity: 1,
      color: (_i: number, el: HTMLElement) =>
        el.classList.contains('is-accent') ? 'var(--color-accent, #c0caf5)' : '#ffffff',
      stagger: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: root.value,
        start: 'top top+=10%',
        end: 'bottom bottom',
        scrub: 0.4,
      },
    })

    $ScrollTrigger.refresh()
  }

  requestAnimationFrame(() => requestAnimationFrame(setup))

  onBeforeUnmount(() => {
    if (tween) {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  })
})
</script>

<template>
  <section
    ref="root"
    class="manifesto-section relative"
  >
    <div class="sticky top-0 h-screen flex items-center px-6 md:px-10">
      <div class="w-full max-w-6xl mx-auto">
        <div
          v-if="eyebrow"
          class="flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-white/45 mb-10 md:mb-14"
        >
          <span class="font-mono">01</span>
          <span class="w-8 h-px bg-current opacity-60" />
          <span>{{ eyebrow }}</span>
        </div>

        <p
          ref="content"
          class="manifesto-text font-display tracking-tight leading-[1.15] text-[clamp(1.5rem,4.5vw,4.5rem)]"
        >
          <span
            v-for="(w, i) in words"
            :key="i"
            class="m-word"
            :class="{ 'is-accent': w.accent }"
          >{{ w.text }}<template v-if="i < words.length - 1">&nbsp;</template></span>
        </p>

        <div
          v-if="signature"
          class="mt-12 md:mt-16 flex items-center gap-4 text-[10px] uppercase tracking-[0.32em] text-white/55"
        >
          <span class="w-8 h-px bg-current opacity-60" />
          <span class="font-display">{{ signature }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.manifesto-section {
  /* 200vh of scroll distance for the pin */
  min-height: 200vh;
}

.m-word {
  display: inline-block;
  will-change: opacity, color;
}

/* Initial paint state — JS overrides via gsap.set after mount, but this
   prevents a flash before hydration if JS is slow. */
.m-word { opacity: 0.18; }
.m-word.is-accent { color: rgba(255, 255, 255, 0.6); }

@media (prefers-reduced-motion: reduce) {
  .m-word { opacity: 1; }
  .m-word.is-accent { color: var(--color-accent, #c0caf5); }
  .manifesto-section { min-height: auto; }
}
</style>
