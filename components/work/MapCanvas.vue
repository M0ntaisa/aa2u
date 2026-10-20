<script setup lang="ts">
/**
 * One map panel for /work?view=map (identity-dossier §3.6).
 *
 * Land is drawn from the page-level <symbol>s in <WorkIndonesiaLand>
 * (rendered once by WorkMap) through same-document <use>; no requests of
 * any kind. The viewBox selects the visible bounds, so the full map and the
 * zoomable inset share the one outline. Markers are HTML
 * links over the SVG so they keep a fixed screen size and get real focus
 * rings; they are clustered greedily in screen pixels (14px).
 *
 * `bounds` fixes the box (full map). Otherwise `center` + `lonSpan` define
 * it and the latitude span follows the measured box aspect (inset; taller
 * on mobile).
 */
import {
  MAP_FULL, MAP_UNITS_PER_DEG, boundsViewBox, clusterPoints,
  type MapBounds, type MapCluster, type MappedProject,
} from '~/utils/work-views'

const props = defineProps<{
  points: MappedProject[]
  hot: string[]
  bounds?: MapBounds
  center?: { lat: number; lng: number }
  lonSpan?: number
  /** Box aspect used before the first measurement (SSR). */
  aspect: number
}>()

const emit = defineEmits<{
  hot: [slugs: string[]]
  cluster: [items: MappedProject[]]
}>()

const { t } = useI18n()
const tt = useT()
const localePath = useLocalePath()

const box = ref<HTMLElement | null>(null)
const size = ref({ w: 900, h: 900 / props.aspect })
let ro: ResizeObserver | null = null

onMounted(() => {
  if (!box.value) return
  const measure = () => {
    const r = box.value!.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) size.value = { w: r.width, h: r.height }
  }
  measure()
  ro = new ResizeObserver(measure)
  ro.observe(box.value)
})
onBeforeUnmount(() => ro?.disconnect())

const b = computed<MapBounds>(() => {
  if (props.bounds) return props.bounds
  const c = props.center ?? { lat: -7.4, lng: 110.5 }
  const lon = props.lonSpan ?? 11
  const lat = lon * size.value.h / size.value.w
  return { w: c.lng - lon / 2, e: c.lng + lon / 2, n: c.lat + lat / 2, s: c.lat - lat / 2 }
})

const viewBox = computed(() => boundsViewBox(b.value))

// Graticule step: the smallest "round" step that keeps labelled lines at
// least ~64px apart at the measured width (5° on the full desktop map).
const STEPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]
const step = computed(() => {
  const pxPerDeg = size.value.w / (b.value.e - b.value.w)
  return STEPS.find(s => s * pxPerDeg >= 64) ?? 10
})

const deg = (v: number, pos: string, neg: string) => {
  const dp = step.value >= 1 ? 0 : step.value >= 0.5 ? 1 : 2
  const s = Math.abs(v).toFixed(dp).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return `${s}°${v < 0 ? neg : v > 0 ? pos : ''}`
}

const graticule = computed(() => {
  const k = MAP_UNITS_PER_DEG
  const { w, e, n, s } = b.value
  const st = step.value
  const lons: { v: number; x: number; pct: number; label: string }[] = []
  const lats: { v: number; y: number; pct: number; label: string }[] = []
  for (let lo = Math.ceil(w / st) * st; lo <= e + 1e-9; lo += st) {
    const v = Math.round(lo * 100) / 100
    lons.push({ v, x: (v - MAP_FULL.w) * k, pct: (v - w) / (e - w) * 100, label: deg(v, 'E', 'W') })
  }
  for (let la = Math.ceil(s / st) * st; la <= n + 1e-9; la += st) {
    const v = Math.round(la * 100) / 100
    lats.push({ v, y: (MAP_FULL.n - v) * k, pct: (n - v) / (n - s) * 100, label: deg(v, 'N', 'S') })
  }
  return { lons, lats }
})

const clusters = computed(() => clusterPoints(props.points, b.value, size.value.w, size.value.h))

const hotSet = computed(() => new Set(props.hot))
const isHot = (c: MapCluster<MappedProject>) => c.items.some(i => hotSet.value.has(i.project.slug))

const markerName = (p: MappedProject) =>
  [tt(p.project.title), p.project.location ? tt(p.project.location) : '', p.project.year ?? '']
    .filter(Boolean).join(', ')

const clusterPlace = (c: MapCluster<MappedProject>) => {
  const loc = c.items[0]?.project.location
  return loc ? tt(loc) : ''
}

/** Flip the label/card so it stays inside the box. */
function flipFor(c: MapCluster<MappedProject>) {
  const px = c.x / 100 * size.value.w
  const py = c.y / 100 * size.value.h
  return { left: px + 16 + 200 > size.value.w, up: py + 16 + 160 > size.value.h && py > 160 }
}

const slugsOf = (c: MapCluster<MappedProject>) => c.items.map(i => i.project.slug)
</script>

<template>
  <div ref="box" class="wm-canvas">
    <svg
      class="wm-svg"
      :viewBox="viewBox"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g class="wm-grat">
        <line
          v-for="l in graticule.lons"
          :key="`x${l.v}`"
          :x1="l.x" :x2="l.x" :y1="-1e4" :y2="1e4"
          vector-effect="non-scaling-stroke"
        />
        <line
          v-for="l in graticule.lats"
          :key="`y${l.v}`"
          :y1="l.y" :y2="l.y" :x1="-1e4" :x2="1e4"
          vector-effect="non-scaling-stroke"
        />
      </g>
      <use class="wm-nbr" href="#wm-sym-nbr" />
      <use class="wm-land" href="#wm-sym-land" />
    </svg>

    <div class="wm-ticks" aria-hidden="true">
      <span
        v-for="l in graticule.lons.filter(g => g.pct < 88)"
        :key="`lx${l.v}`"
        class="mono-xs wm-tick wm-tick--x"
        :style="{ left: `${l.pct}%` }"
      >{{ l.label }}</span>
      <span
        v-for="l in graticule.lats.filter(g => g.pct > 6)"
        :key="`ly${l.v}`"
        class="mono-xs wm-tick wm-tick--y"
        :style="{ top: `${l.pct}%` }"
      >{{ l.label }}</span>
    </div>

    <div class="wm-markers">
      <div
        v-for="c in clusters"
        :key="c.key"
        class="wm-pin"
        :class="{ 'is-hot': isHot(c), 'is-left': flipFor(c).left, 'is-up': flipFor(c).up }"
        :style="{ left: `${c.x}%`, top: `${c.y}%` }"
      >
        <NuxtLink
          v-if="c.items.length === 1"
          :to="localePath(`/work/${c.items[0]!.project.slug}`)"
          class="wm-mk"
          :aria-label="markerName(c.items[0]!)"
          :data-cursor-label="t('cursor.open')"
          @mouseenter="emit('hot', slugsOf(c))"
          @mouseleave="emit('hot', [])"
          @focus="emit('hot', slugsOf(c))"
          @blur="emit('hot', [])"
        >
          <span class="wm-mk__x" aria-hidden="true" />
          <span class="wm-mk__sq" aria-hidden="true" />
        </NuxtLink>
        <button
          v-else
          type="button"
          class="wm-mk wm-mk--cl mono-s"
          :aria-label="t('work.map.cluster', { n: c.items.length, place: clusterPlace(c) })"
          @mouseenter="emit('hot', slugsOf(c))"
          @mouseleave="emit('hot', [])"
          @focus="emit('hot', slugsOf(c))"
          @blur="emit('hot', [])"
          @click="emit('cluster', c.items)"
        >
          <span aria-hidden="true">{{ c.items.length }}</span>
        </button>

        <!-- Label + preview card: visual echo of the accessible name. -->
        <div class="wm-pop" aria-hidden="true">
          <span class="wm-pop__label mono-s">
            <template v-if="c.items.length === 1">{{ c.items[0]!.no }} {{ tt(c.items[0]!.project.title) }}</template>
            <template v-else>{{ clusterPlace(c) }} ({{ c.items.length }})</template>
          </span>
          <div
            v-if="c.items.length === 1 && isHot(c)"
            class="wm-pop__card hatch"
          >
            <NuxtImg
              v-if="c.items[0]!.project.cover_image"
              :src="c.items[0]!.project.cover_image"
              alt=""
              :width="400"
              :height="280"
              fit="cover"
              format="webp"
              decoding="async"
              class="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wm-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--color-line);
}
.wm-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.wm-grat line { stroke: var(--color-line); stroke-width: 1; }
/* Inherited into the <use> shadow trees (the symbol paths are unstyled). */
.wm-land {
  fill: rgba(255, 255, 255, .025);
  stroke: var(--color-line-strong);
  stroke-width: 1;
}
.wm-nbr {
  fill: none;
  stroke: rgba(255, 255, 255, .07);
  stroke-width: 1;
}

.wm-ticks { position: absolute; inset: 0; pointer-events: none; }
.wm-tick { position: absolute; color: var(--color-muted); white-space: nowrap; }
.wm-tick--x { bottom: 4px; transform: translateX(3px); }
.wm-tick--y { left: 4px; transform: translateY(calc(-100% - 3px)); }

.wm-markers { position: absolute; inset: 0; }
.wm-pin {
  position: absolute;
  width: 0;
  height: 0;
  z-index: 1;
}
.wm-pin.is-hot,
.wm-pin:hover,
.wm-pin:focus-within { z-index: 3; }

.wm-mk {
  position: absolute;
  left: -12px;
  top: -12px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
}
.wm-mk__x,
.wm-mk__sq { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
.wm-mk__x { width: 18px; height: 18px; }
.wm-mk__x::before,
.wm-mk__x::after { content: ''; position: absolute; background: var(--color-fg); }
.wm-mk__x::before { left: 0; right: 0; top: 50%; height: 1px; transform: translateY(-.5px); }
.wm-mk__x::after { top: 0; bottom: 0; left: 50%; width: 1px; transform: translateX(-.5px); }
.wm-mk__sq { width: 8px; height: 8px; background: var(--color-fg); }

.wm-mk--cl {
  left: -11px;
  top: -11px;
  width: 22px;
  height: 22px;
  background: var(--color-bg);
  border: 1px solid var(--color-fg);
  color: var(--color-fg);
  font-size: .6875rem;
  line-height: 1;
  letter-spacing: 0;
}
.wm-pin.is-hot .wm-mk__sq,
.wm-pin:hover .wm-mk__sq,
.wm-pin:focus-within .wm-mk__sq { background: var(--color-signal); }
.wm-pin.is-hot .wm-mk--cl,
.wm-pin:hover .wm-mk--cl,
.wm-pin:focus-within .wm-mk--cl { border-color: var(--color-signal); color: var(--color-fg); }
.wm-mk:focus-visible { outline-offset: 2px; }

.wm-pop {
  position: absolute;
  left: 16px;
  top: -10px;
  width: 200px;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--d-1) var(--ease-draft);
}
.wm-pin.is-left .wm-pop { left: auto; right: 16px; text-align: right; }
.wm-pin.is-up .wm-pop { top: auto; bottom: -10px; display: flex; flex-direction: column-reverse; }
.wm-pin.is-hot .wm-pop,
.wm-pin:hover .wm-pop,
.wm-pin:focus-within .wm-pop { opacity: 1; }
.wm-pop__label {
  display: inline-block;
  max-width: 200px;
  padding: .2rem .4rem;
  background: var(--color-bg);
  color: var(--color-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wm-pop__card {
  width: 200px;
  height: 140px;
  margin: 4px 0;
  overflow: hidden;
}
</style>
