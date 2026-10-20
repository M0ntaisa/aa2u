<script setup lang="ts">
/**
 * Page-load intro (§3.1), ≤ 1.2s: a horizontal section line draws across the
 * viewport at mid-height with level marks, a small plan outline (walls + a
 * door swing) draws at the centre, then the sheet splits along the section
 * line — top half up, bottom half down — revealing the hero. No wordmark.
 *
 *   0.00–0.48s  section line draws
 *   0.24–0.72s  plan outline draws
 *   0.72–1.20s  curtain splits
 *
 * Behavior:
 *   - SSR renders the curtain visible by default.
 *   - An inline bootstrap script in app.vue sets `html.no-intro` before
 *     paint when sessionStorage has the played-flag or the user prefers
 *     reduced motion. CSS hides the curtain in that case — no flash.
 *   - Any key, click, wheel or touch skips straight to the end.
 */

const SESSION_KEY = 'aa2u:intro-played'

const root = ref<HTMLElement | null>(null)
// SSR-default true so first-visit users see the curtain immediately. The
// inline bootstrap on <html> hides it via CSS for returning users before
// Vue ever hydrates.
const mounted = ref(true)

let tl: any = null
let finished = false
const skipEvents = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const

function skip() {
  if (tl) tl.progress(1)
}

function complete() {
  if (finished) return
  finished = true
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
  document.documentElement.classList.remove('intro-active')
  const { $lenis } = useNuxtApp() as any
  $lenis?.start?.()
  skipEvents.forEach(ev => window.removeEventListener(ev, skip))
  mounted.value = false
}

onMounted(() => {
  // Returning users already have html.no-intro; just bail without rendering.
  if (document.documentElement.classList.contains('no-intro')) {
    mounted.value = false
    return
  }

  // Reduced motion users: never shown. Set the flag and exit.
  if (prefersReducedMotion()) {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
    mounted.value = false
    return
  }

  const { $gsap, $lenis } = useNuxtApp() as any
  const el = root.value
  if (!$gsap || !el) {
    complete()
    return
  }

  document.documentElement.classList.add('intro-active')
  $lenis?.stop?.()

  const { d2, d3, ease } = MOTION
  const q = (s: string) => el.querySelectorAll(s)

  tl = $gsap.timeline({ onComplete: complete })
  tl.to(q('.ic-line'), { strokeDashoffset: 0, duration: d3, ease }, 0)
    .to(q('.ic-level'), { opacity: 1, duration: d2, ease }, 0.12)
    .to(q('.ic-plan'), { strokeDashoffset: 0, duration: d3, ease, stagger: 0.06 }, 0.24)
    .to(q('.ic-top'), { yPercent: -100, duration: d3, ease: 'power3.inOut' }, 0.72)
    .to(q('.ic-bot'), { yPercent: 100, duration: d3, ease: 'power3.inOut' }, 0.72)
    .to(q('.ic-drawing'), { opacity: 0, duration: d2, ease }, 0.72)

  skipEvents.forEach(ev => window.addEventListener(ev, skip, { passive: true }))
})

onBeforeUnmount(() => {
  // Unmounted mid-play (e.g. an early route change): still finish cleanly
  // so Lenis restarts, scroll unlocks and the session flag is set.
  tl?.kill()
  if (tl && !finished) complete()
  skipEvents.forEach(ev => window.removeEventListener(ev, skip))
  document.documentElement.classList.remove('intro-active')
})
</script>

<template>
  <div
    v-if="mounted"
    ref="root"
    aria-hidden="true"
    class="intro-curtain fixed inset-0 z-[300] select-none overflow-hidden"
  >
    <div class="ic-half ic-top" />
    <div class="ic-half ic-bot" />

    <div class="ic-drawing">
      <!-- Section line across the viewport at ±0.00 -->
      <svg class="ic-section" viewBox="0 0 1000 2" preserveAspectRatio="none">
        <path class="ic-line" pathLength="1" d="M0 1 H1000" />
      </svg>

      <!-- Plan outline: four walls with a door gap + door swing, 120px wide -->
      <svg class="ic-planbox" viewBox="-60 -40 120 80">
        <path class="ic-plan" pathLength="1" d="M-50 -30 H50 V30 H-10 M-30 30 H-50 V-30" />
        <path class="ic-plan" pathLength="1" d="M-30 30 L-30 10 M-30 10 A20 20 0 0 1 -10 30" />
      </svg>

      <span class="ic-level mono-xs" style="top: calc(50% - 1.5rem)">+3.20</span>
      <span class="ic-level mono-xs" style="top: calc(50% + .625rem)">±0.00</span>
    </div>
  </div>
</template>

<style scoped>
.ic-half {
  position: absolute;
  left: 0;
  right: 0;
  height: 50.5%;
  background: var(--color-bg);
}
.ic-top { top: 0; }
.ic-bot { bottom: 0; }

.ic-drawing {
  position: absolute;
  inset: 0;
}
.ic-section {
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 2px;
  transform: translateY(-1px);
  overflow: visible;
}
.ic-planbox {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 80px;
  transform: translate(-50%, -50%);
  overflow: visible;
}
.ic-line,
.ic-plan {
  fill: none;
  stroke: var(--color-fg);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}
.ic-level {
  position: absolute;
  left: var(--sheet-margin);
  color: var(--color-muted);
  opacity: 0;
}
</style>
