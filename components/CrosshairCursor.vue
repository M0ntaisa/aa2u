<script setup lang="ts">
/**
 * Drafting crosshair (§2.1): two full-viewport hairlines crossing at the
 * pointer, a small centre square in the signal colour and a mono readout of
 * the pointer position in sheet coordinates —
 *   X = grid column (index + fraction), Y = metres from the page top at a
 *   nominal 1:100 (1px = 1cm).
 * Over an element with `data-cursor-label` the readout adds that label.
 *
 * Purely decorative overlay: the native cursor is never hidden (body gets
 * `cursor: crosshair` in main.css; links keep the pointer, fields the caret).
 * Mounted only for a fine, hovering pointer without reduced motion. Hidden
 * over `[data-cursor="hide"]`. Tracks 1:1 (no lerp), transform-only, rAF.
 */

const enabled = ref(false)
const visible = ref(false)
const coords = ref('')
const label = ref('')

const hRef = ref<HTMLElement | null>(null)
const vRef = ref<HTMLElement | null>(null)
const cRef = ref<HTMLElement | null>(null)
const rRef = ref<HTMLElement | null>(null)

let mx = 0
let my = 0
let raf = 0
let hide = false
let seen = false
let cleanup: (() => void) | null = null

// Sheet grid geometry, measured once and again only on resize — never per
// frame. The grid is position:fixed, so scrolling doesn't move it.
interface GridMetrics { left: number; colW: number; gap: number; n: number }
let metrics: GridMetrics | null = null
let observed: HTMLElement | null = null
let ro: ResizeObserver | null = null

function measureGrid() {
  const grid = document.querySelector<HTMLElement>('[data-sheet-grid]')
  if (!grid) { metrics = null; return }
  // Watch the grid itself: catches scrollbar appearance and layout swaps
  // (admin → public mounts the grid after this component), not just resize.
  if (grid !== observed && 'ResizeObserver' in window) {
    ro ??= new ResizeObserver(() => { metrics = null; schedule() })
    if (observed) ro.unobserve(observed)
    ro.observe(grid)
    observed = grid
  }
  const cs = getComputedStyle(grid)
  const r = grid.getBoundingClientRect()
  const padL = parseFloat(cs.paddingLeft) || 0
  const padR = parseFloat(cs.paddingRight) || 0
  const gap = parseFloat(cs.columnGap) || 0
  const n = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 12
  const colW = (r.width - padL - padR - (n - 1) * gap) / n
  metrics = colW > 0 ? { left: r.left + padL, colW, gap, n } : null
}

/** Pointer X → sheet column (1-based, with fraction), clamped to the grid. */
function columnAt(x: number): number {
  // Measured lazily: the grid may not exist yet when the cursor mounts, and
  // the observer invalidates the cache whenever the grid changes size.
  if (!metrics || !observed?.isConnected) measureGrid()
  if (!metrics) return 0
  const { left, colW, gap, n } = metrics
  const col = (x - left) / (colW + gap) + 1
  return Math.max(0, Math.min(n + 0.99, col))
}

function labelFor(target: Element | null): string {
  const el = target?.closest<HTMLElement>('[data-cursor-label]')
  if (!el) return ''
  const wanted = el.dataset.cursorLabel ?? ''
  // A label that repeats the element's own text just prints the word a
  // second time beside the link. Only show labels that add something.
  const own = (el.textContent ?? '').replace(/[()\s→]+/g, '').toUpperCase()
  return own && own === wanted.replace(/\s+/g, '').toUpperCase() ? '' : wanted
}

function draw() {
  raf = 0
  if (!hRef.value || !vRef.value || !cRef.value || !rRef.value) return
  hRef.value.style.transform = `translate3d(0, ${my}px, 0)`
  vRef.value.style.transform = `translate3d(${mx}px, 0, 0)`
  cRef.value.style.transform = `translate3d(${mx - 2}px, ${my - 2}px, 0)`

  const x = columnAt(mx).toFixed(1).padStart(4, '0')
  const y = ((window.scrollY + my) / 100).toFixed(1).padStart(4, '0')
  coords.value = `X ${x} · Y ${y} M`

  // Readout sits +14/+14 from the pointer and flips at viewport edges.
  const r = rRef.value
  const rw = r.offsetWidth
  const rh = r.offsetHeight
  const rx = mx + 14 + rw > window.innerWidth ? mx - 14 - rw : mx + 14
  const ry = my + 14 + rh > window.innerHeight ? my - 14 - rh : my + 14
  r.style.transform = `translate3d(${rx}px, ${ry}px, 0)`

  visible.value = seen && !hide && !document.documentElement.classList.contains('intro-active')
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(draw)
}

onMounted(() => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  if (prefersReducedMotion()) return
  enabled.value = true

  const onMove = (e: PointerEvent) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    mx = e.clientX
    my = e.clientY
    seen = true
    const t = e.target instanceof Element ? e.target : null
    hide = !!t?.closest('[data-cursor="hide"]')
    label.value = labelFor(t)
    schedule()
  }
  const onLeave = () => {
    seen = false
    visible.value = false
  }

  const onResize = () => {
    metrics = null
    schedule()
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)

  cleanup = () => {
    if (raf) cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', onResize)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    ro?.disconnect()
    ro = null
    observed = null
    metrics = null
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div
    v-if="enabled"
    class="crosshair"
    :class="{ 'is-visible': visible }"
    aria-hidden="true"
  >
    <div ref="hRef" class="crosshair__h" />
    <div ref="vRef" class="crosshair__v" />
    <div ref="cRef" class="crosshair__c" />
    <div ref="rRef" class="crosshair__r mono-xs">
      <span>{{ coords }}</span>
      <span v-if="label" class="crosshair__label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Under the header (z-50), above content. */
.crosshair {
  position: fixed;
  inset: 0;
  z-index: 45;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--d-1) var(--ease-draft);
}
.crosshair.is-visible { opacity: 1; }

.crosshair__h,
.crosshair__v,
.crosshair__c,
.crosshair__r {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}
.crosshair__h { right: 0; height: 1px; background: rgba(255, 255, 255, .18); }
.crosshair__v { bottom: 0; width: 1px; background: rgba(255, 255, 255, .18); }
.crosshair__c { width: 5px; height: 5px; background: var(--color-signal); }
.crosshair__r {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 6px;
  white-space: nowrap;
  color: var(--color-fg-2);
  background: var(--color-bg);
  border: 1px solid var(--color-line);
}
.crosshair__label { color: var(--color-fg); }
</style>
