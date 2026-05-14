<script setup lang="ts">
/**
 * Page-load intro: dark overlay with an "AA2U" hole cut into it. The text
 * scales up via SVG font-size animation; as the cutout grows it eventually
 * exceeds the viewport and the page underneath is fully revealed.
 *
 * Behavior:
 *   - SSR renders the curtain visible by default.
 *   - An inline bootstrap script in app.vue sets `html.no-intro` before
 *     paint when sessionStorage has the played-flag or the user prefers
 *     reduced motion. CSS hides the curtain in that case — no flash.
 *   - On mount, this component plays the GSAP animation, sets the flag,
 *     and removes itself.
 *   - Clicking anywhere on the curtain skips to the end.
 */

const textRef  = ref<SVGTextElement | null>(null)
const finished = ref(false)
// SSR-default true so first-visit users see the curtain immediately. The
// inline bootstrap on <html> hides it via CSS for returning users before
// Vue ever hydrates.
const mounted  = ref(true)

const SESSION_KEY = 'aa2u:intro-played'

const initialFontSize = 16   // % of viewBox height (mid-size logo)
const finalFontSize   = 480  // way past 100 so the cutout dominates everything

let tween: any = null

function complete() {
  if (finished.value) return
  finished.value = true
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
  document.documentElement.classList.remove('intro-active')
  // Remove from DOM after fade transition resolves.
  setTimeout(() => { mounted.value = false }, 450)
}

function skip() {
  if (finished.value) return
  if (tween) tween.progress(1)
  else complete()
}

onMounted(() => {
  // Returning users already have html.no-intro; just bail without rendering.
  if (document.documentElement.classList.contains('no-intro')) {
    mounted.value = false
    return
  }

  // Reduced motion users: respect the preference, set the flag, exit.
  if (prefersReducedMotion()) {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
    mounted.value = false
    return
  }

  mounted.value = true
  document.documentElement.classList.add('intro-active')

  // Lock scroll while curtain is active (Lenis-aware fallback handled by CSS).
  const { $lenis } = useNuxtApp() as any
  if ($lenis?.stop) $lenis.stop()

  const { $gsap } = useNuxtApp() as any
  if (!$gsap || !textRef.value) {
    complete()
    if ($lenis?.start) $lenis.start()
    return
  }

  tween = $gsap.fromTo(
    textRef.value,
    { attr: { 'font-size': initialFontSize } },
    {
      attr: { 'font-size': finalFontSize },
      duration: 1.8,
      ease: 'power3.in',
      onComplete: () => {
        if ($lenis?.start) $lenis.start()
        complete()
      },
    },
  )
})

onBeforeUnmount(() => {
  if (tween) tween.kill()
  document.documentElement.classList.remove('intro-active')
})
</script>

<template>
  <div
    v-show="mounted"
    aria-hidden="true"
    class="intro-curtain fixed inset-0 z-[300] cursor-pointer select-none"
    :class="finished ? 'is-finished' : ''"
    @click="skip"
  >
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 100 100"
      class="block w-full h-full"
    >
      <defs>
        <mask id="aa2u-intro-mask">
          <rect width="100" height="100" fill="white" />
          <text
            ref="textRef"
            x="50"
            y="50"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="16"
            font-family="General Sans, Inter, system-ui, sans-serif"
            font-weight="700"
            letter-spacing="-0.04em"
            fill="black"
          >AA2U</text>
        </mask>
      </defs>
      <rect width="100" height="100" fill="#f5f5f0" mask="url(#aa2u-intro-mask)" />
    </svg>
  </div>
</template>

<style scoped>
.intro-curtain {
  transition: opacity 0.4s ease;
}
.intro-curtain.is-finished {
  opacity: 0;
  pointer-events: none;
}
</style>
