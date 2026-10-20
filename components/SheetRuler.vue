<script setup lang="ts">
/**
 * Dimension ruler that opens a section (§1.4): a 1px rule with an 8px tick
 * on every column boundary and a 4px tick at each midpoint, column numbers
 * every 3 columns (04/08 on tablet, 04 on mobile), the sheet number at the
 * left end ("A-01 HOME") and an optional dimension callout on the right.
 *
 * Must sit inside a `.sheet-wrap` so the ticks land on the sheet grid.
 * Decorative: aria-hidden. Draws in once when 15% in view; under reduced
 * motion (or without JS) it simply renders drawn.
 */
const props = defineProps<{
  /** Sheet code, e.g. "A-01". */
  sheet: string
  /** Sheet title, e.g. "Home". */
  label?: string
  /** Optional dimension callout, e.g. "├── 7/12 ──┤". */
  dim?: string
  /** Use on a dark photo (e.g. hero caption) — slightly stronger lines. */
  onImage?: boolean
}>()

const root = ref<HTMLElement | null>(null)
const armed = ref(false)
const drawn = ref(false)
let io: IntersectionObserver | null = null

onMounted(() => {
  if (prefersReducedMotion() || !root.value || !('IntersectionObserver' in window)) return
  armed.value = true
  io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      // One frame in the armed (undrawn) state so the transition runs.
      requestAnimationFrame(() => { drawn.value = true })
      io?.disconnect()
      io = null
    }
  }, { threshold: 0.15 })
  io.observe(root.value)
})

onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div
    ref="root"
    class="sheet-ruler"
    :class="{ 'is-armed': armed, 'is-drawn': drawn, 'on-image': props.onImage }"
    aria-hidden="true"
  >
    <div class="sheet-ruler__head">
      <span class="sheet-ruler__no mono-s">
        {{ sheet }}<template v-if="label">&ensp;{{ label }}</template>
      </span>
      <span v-if="dim" class="sheet-ruler__dim mono-xs">{{ dim }}</span>
    </div>
    <div class="sheet-ruler__rule" />
    <div class="sheet-cols sheet-ruler__cells">
      <div v-for="n in 12" :key="n" class="sheet-ruler__cell">
        <b class="mono-xs">{{ String(n).padStart(2, '0') }}</b>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet-ruler {
  --tick: var(--color-line-strong);
  position: relative;
  margin-bottom: 2.5rem;
}
.sheet-ruler.on-image { --tick: rgba(255, 255, 255, .55); }

.sheet-ruler__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  height: 1.375rem;
}
.sheet-ruler__no { color: var(--color-fg); white-space: nowrap; }
.sheet-ruler__dim { color: var(--color-muted); white-space: nowrap; }

.sheet-ruler__rule {
  height: 1px;
  background: var(--tick);
  transform-origin: left center;
}
.sheet-ruler__cells { position: relative; height: 1.5rem; }
.sheet-ruler__cell { position: relative; }
.sheet-ruler__cells::after,
.sheet-ruler__cell::before,
.sheet-ruler__cell::after {
  content: '';
  position: absolute;
  top: 0;
  width: 1px;
  background: var(--tick);
  transform-origin: top center;
}
.sheet-ruler__cell::before { left: 0; height: 8px; }
.sheet-ruler__cell::after { left: 50%; height: 4px; }
/* Closing tick at the right end of the last visible column. */
.sheet-ruler__cells::after { right: 0; height: 8px; }
.sheet-ruler__cell b {
  display: none;
  position: absolute;
  right: 0;
  top: 12px;
  font-weight: 400;
  color: var(--color-muted);
}
.sheet-ruler__cell:nth-child(3n) b { display: block; }

@media (max-width: 1023px) {
  .sheet-ruler__cell:nth-child(n + 9) { display: none; }
  .sheet-ruler__cell b { display: none !important; }
  .sheet-ruler__cell:nth-child(4) b,
  .sheet-ruler__cell:nth-child(8) b { display: block !important; }
}
@media (max-width: 639px) {
  .sheet-ruler__cell:nth-child(n + 5) { display: none; }
  .sheet-ruler__cell:nth-child(8) b { display: none !important; }
  .sheet-ruler__dim { display: none; }
}

/* Draw-in: rule (--d-4), then ticks (--d-2), then labels. Only applied once
   JS has armed the ruler, so SSR / reduced motion render it complete. */
.sheet-ruler.is-armed .sheet-ruler__rule {
  transform: scaleX(0);
  transition: transform var(--d-4) var(--ease-draft);
}
.sheet-ruler.is-armed .sheet-ruler__cells::after,
.sheet-ruler.is-armed .sheet-ruler__cell::before,
.sheet-ruler.is-armed .sheet-ruler__cell::after {
  transform: scaleY(0);
  transition: transform var(--d-2) var(--ease-draft) var(--d-3);
}
.sheet-ruler.is-armed :is(.sheet-ruler__no, .sheet-ruler__dim, .sheet-ruler__cell b) {
  opacity: 0;
  transition: opacity var(--d-2) var(--ease-draft) var(--d-3);
}
.sheet-ruler.is-armed.is-drawn .sheet-ruler__rule { transform: scaleX(1); }
.sheet-ruler.is-armed.is-drawn .sheet-ruler__cells::after,
.sheet-ruler.is-armed.is-drawn .sheet-ruler__cell::before,
.sheet-ruler.is-armed.is-drawn .sheet-ruler__cell::after { transform: scaleY(1); }
.sheet-ruler.is-armed.is-drawn :is(.sheet-ruler__no, .sheet-ruler__dim, .sheet-ruler__cell b) { opacity: 1; }
</style>
