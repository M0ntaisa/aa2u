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

  // Scrub only on md+ with motion allowed. On mobile and under reduced
  // motion the text stays fully lit (the SSR default) and nothing pins.
  // gsap.matchMedia reverts the tween automatically when the query flips.
  const mm = $gsap.matchMedia()

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    const wordEls = content.value!.querySelectorAll<HTMLElement>('.m-word')
    if (!wordEls.length) return

    $gsap.set(wordEls, { opacity: 0.12 })
    $gsap.set(content.value!.querySelectorAll('.m-word.is-accent'), {
      color: 'rgba(255,255,255,0.12)',
    })

    $gsap.to(wordEls, {
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

    requestAnimationFrame(() => $ScrollTrigger.refresh())
  })

  onBeforeUnmount(() => mm.revert())
})
</script>

<template>
  <section
    ref="root"
    class="manifesto-section relative"
  >
    <div class="md:sticky md:top-0 md:h-screen flex items-center py-24 md:py-0">
      <div class="sheet-wrap">
        <SheetRuler sheet="A-01.1" :label="eyebrow" class="mb-10 md:mb-14" />
        <h2 v-if="eyebrow" class="sr-only">{{ eyebrow }}</h2>

        <p
          ref="content"
          class="manifesto-text font-display tracking-tight leading-[1.15] text-[clamp(1.5rem,4.5vw,4.5rem)] max-w-6xl"
        >
          <span
            v-for="(w, i) in words"
            :key="i"
            class="m-word"
            :class="{ 'is-accent': w.accent }"
          >{{ w.text }}<template v-if="i < words.length - 1">&nbsp;</template></span>
        </p>

        <p
          v-if="signature"
          class="mt-12 md:mt-16 flex items-center gap-4 mono-s text-muted"
        >
          <span class="w-8 h-px bg-current" aria-hidden="true" />
          <span>{{ signature }}</span>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Mobile: plain, fully readable block. md+: 200vh of scroll distance for
   the sticky pin (dropped again under reduced motion). */
@media (min-width: 768px) {
  .manifesto-section { min-height: 200vh; }
}

.m-word {
  display: inline-block;
  will-change: opacity, color;
}

/* SSR / no-JS default is the final, fully lit state. Words are only dimmed
   once the scroll animation sets up (gsap.set inline styles). */
.m-word.is-accent { color: var(--color-accent, #c0caf5); }

@media (prefers-reduced-motion: reduce) {
  .manifesto-section { min-height: auto; }
}
</style>
