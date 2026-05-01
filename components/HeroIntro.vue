<script setup lang="ts">
const props = defineProps<{
  studioName: string
  intro: string
  scrollHint?: string
}>()

const headingRef   = ref<HTMLElement | null>(null)
const introRef     = ref<HTMLElement | null>(null)
const scrollHintRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const { $gsap, $SplitText } = useNuxtApp() as any
  if (!$gsap) return

  // Pre-hide everything immediately so SSR text never paints unsplit.
  if (headingRef.value)   $gsap.set(headingRef.value,    { autoAlpha: 0 })
  if (introRef.value)     $gsap.set(introRef.value,      { autoAlpha: 0, y: 24 })
  if (scrollHintRef.value) $gsap.set(scrollHintRef.value, { autoAlpha: 0 })

  const ctx = $gsap.context(() => {
    const tl = $gsap.timeline({ defaults: { ease: 'power3.out' } })

    if (headingRef.value && $SplitText) {
      const split = new $SplitText(headingRef.value, {
        type: 'lines,words',
        linesClass: 'overflow-hidden inline-block',
      })
      // Setup words BEFORE revealing heading — prevents flash of unsplit text
      $gsap.set(split.words, { yPercent: 110, opacity: 0 })
      tl.set(headingRef.value, { autoAlpha: 1 })
        .to(split.words, {
          yPercent: 0,
          opacity: 1,
          stagger: 0.04,
          duration: 1.2,
        })
    } else if (headingRef.value) {
      // Fallback if SplitText is unavailable
      tl.to(headingRef.value, { autoAlpha: 1, duration: 0.8 })
    }

    if (introRef.value) {
      tl.to(introRef.value, { autoAlpha: 1, y: 0, duration: 1 }, '-=0.7')
    }
    if (scrollHintRef.value) {
      tl.to(scrollHintRef.value, { autoAlpha: 1, duration: 0.6 }, '-=0.4')
    }
  })

  onBeforeUnmount(() => ctx.revert())
})
</script>

<template>
  <section class="relative min-h-screen flex flex-col justify-end px-6 pb-24 pt-32">
    <h1
      ref="headingRef"
      style="visibility: hidden;"
      class="font-display uppercase tracking-tight leading-[0.85] text-[clamp(3rem,12vw,12rem)]"
    >
      {{ props.studioName }}
    </h1>
    <p
      ref="introRef"
      style="visibility: hidden;"
      class="mt-10 max-w-2xl text-lg md:text-xl text-[var(--color-muted)] leading-relaxed"
    >
      {{ props.intro }}
    </p>
    <div
      v-if="props.scrollHint"
      ref="scrollHintRef"
      style="visibility: hidden;"
      class="mt-16 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]"
    >
      <span class="inline-block w-8 h-px bg-current" />
      {{ props.scrollHint }}
    </div>
  </section>
</template>
