<script setup lang="ts">
/**
 * /work view = Map (identity-dossier §3.6).
 *
 * - Full map: fixed bounds 94.5–141.5°E, 6.5°N–11.5°S.
 * - Java–Bali inset (105–116°E): shown on desktop when ≥60% of the mapped
 *   results fall inside; on mobile it is the default, with a toggle to the
 *   full map. Activating a cluster zooms the inset to it.
 * - Linked list beside (desktop) / below (mobile) the map: hovering or
 *   focusing a list item lights its marker and vice versa. Projects with no
 *   public lat/lng (hidden or unknown location) go under "Not mapped (n)".
 *   Coordinates come only from the contract's lat/lng — never derived.
 */
import {
  MAP_FULL, MAP_INSET, MAP_REGION_ORDER, hasCoords, inBounds, regionOf,
  type MapRegion, type MappedProject, type WorkItem,
} from '~/utils/work-views'

const props = defineProps<{ items: WorkItem[] }>()

const { t } = useI18n()
const tt = useT()
const localePath = useLocalePath()

const mapped = computed<MappedProject[]>(() =>
  props.items.flatMap(i => (hasCoords(i.project)
    ? [{ project: i.project, no: i.no, lat: i.project.lat, lng: i.project.lng }]
    : [])),
)
const unmapped = computed(() => props.items.filter(i => !hasCoords(i.project)))

const groups = computed(() => {
  const by = new Map<MapRegion, MappedProject[]>()
  for (const m of mapped.value) {
    const r = regionOf(m.lat, m.lng)
    const list = by.get(r)
    if (list) list.push(m)
    else by.set(r, [m])
  }
  return MAP_REGION_ORDER.filter(r => by.has(r)).map(r => ({ region: r, items: by.get(r)! }))
})

// ---- hover / focus sync -------------------------------------------------
const hot = ref<string[]>([])
const setHot = (slugs: string[]) => { hot.value = slugs }
const isHot = (slug: string) => hot.value.includes(slug)

// ---- inset --------------------------------------------------------------
const INSET_CENTER = { lat: (MAP_INSET.n + MAP_INSET.s) / 2, lng: (MAP_INSET.w + MAP_INSET.e) / 2 }
const INSET_SPAN = MAP_INSET.e - MAP_INSET.w
const insetCenter = ref({ ...INSET_CENTER })
const insetSpan = ref(INSET_SPAN)
const zoomed = computed(() => insetSpan.value !== INSET_SPAN
  || insetCenter.value.lat !== INSET_CENTER.lat || insetCenter.value.lng !== INSET_CENTER.lng)

const autoInset = computed(() => {
  const n = mapped.value.length
  if (!n) return false
  const inside = mapped.value.filter(m => inBounds(MAP_INSET, m.lat, m.lng)).length
  return inside / n >= 0.6
})
const insetForced = ref(false)
/** Mobile only: the inset is the default; this swaps to the full map. */
const showFull = ref(false)

const insetHeading = ref<HTMLElement | null>(null)

const fmtLon = (v: number) => `${(Math.round(v * 100) / 100).toString()}°E`
const insetLabel = computed(() => {
  if (!zoomed.value) return t('work.map.inset_default')
  const w = insetCenter.value.lng - insetSpan.value / 2
  const e = insetCenter.value.lng + insetSpan.value / 2
  return t('work.map.inset_zoomed', { range: `${fmtLon(w)}–${fmtLon(e)}` })
})

function zoomTo(items: MappedProject[]) {
  const lats = items.map(i => i.lat)
  const lngs = items.map(i => i.lng)
  const dLng = Math.max(...lngs) - Math.min(...lngs)
  const dLat = Math.max(...lats) - Math.min(...lats)
  if (dLng < 1e-6 && dLat < 1e-6) {
    // Same rounded point: zooming can't separate them. Hand over to the
    // list, which is the primary accessible path anyway.
    setHot(items.map(i => i.project.slug))
    nextTick(() => {
      document.querySelector<HTMLElement>(`[data-map-list-slug="${items[0]!.project.slug}"]`)?.focus()
    })
    return
  }
  insetCenter.value = {
    lat: (Math.max(...lats) + Math.min(...lats)) / 2,
    lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
  }
  insetSpan.value = Math.min(INSET_SPAN, Math.max(0.25, dLng * 5, dLat * 5 * 2.9))
  insetForced.value = true
  showFull.value = false
  nextTick(() => insetHeading.value?.focus())
}

function resetInset() {
  insetCenter.value = { ...INSET_CENTER }
  insetSpan.value = INSET_SPAN
  insetForced.value = false
}

// Filters change the set: drop stale highlights.
watch(() => props.items, () => { hot.value = [] })
</script>

<template>
  <div class="wm relative grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-10">
    <!-- Land outline symbols, once for both canvases. -->
    <WorkIndonesiaLand />
    <div class="lg:col-span-9 min-w-0">
      <figure class="wm-fig">
        <figcaption class="wm-cap mono-s">
          <span class="text-fg">{{ t('work.map.fig') }}</span>
          <span class="text-muted">{{ t('work.map.caption', { n: mapped.length }, mapped.length) }}</span>
        </figcaption>

        <!-- Full Indonesia -->
        <div
          id="wm-full"
          class="wm-full"
          :class="{ 'is-mobile-hidden': !showFull }"
        >
          <WorkMapCanvas
            :points="mapped"
            :hot="hot"
            :bounds="MAP_FULL"
            :aspect="940 / 360"
            @hot="setHot"
            @cluster="zoomTo"
          />
        </div>

        <!-- Java–Bali inset -->
        <div
          class="wm-inset-wrap"
          :class="{
            'is-mobile-hidden': showFull,
            'is-desktop-hidden': !(autoInset || insetForced || zoomed),
          }"
        >
          <div class="wm-inset-head">
            <p ref="insetHeading" tabindex="-1" class="mono-s text-fg-2">{{ insetLabel }}</p>
            <button
              v-if="zoomed"
              type="button"
              class="wm-btn mono-s"
              @click="resetInset"
            >{{ t('work.map.reset') }}</button>
          </div>
          <div class="wm-inset">
            <WorkMapCanvas
              :points="mapped"
              :hot="hot"
              :center="insetCenter"
              :lon-span="insetSpan"
              :aspect="940 / 325"
              @hot="setHot"
              @cluster="zoomTo"
            />
          </div>
        </div>

        <button
          type="button"
          class="wm-btn wm-toggle mono-s"
          aria-controls="wm-full"
          :aria-expanded="showFull"
          @click="showFull = !showFull"
        >{{ showFull ? t('work.map.show_inset') : t('work.map.show_full') }}</button>
      </figure>
    </div>

    <nav class="wm-list lg:col-span-3" :aria-label="t('work.map.list_label')">
      <section v-for="g in groups" :key="g.region" class="wm-group">
        <h2 class="wm-group__h mono-s">
          {{ t(`work.map.regions.${g.region}`) }} ({{ g.items.length }})
        </h2>
        <ul>
          <li v-for="m in g.items" :key="m.project.slug">
            <NuxtLink
              :to="localePath(`/work/${m.project.slug}`)"
              class="wm-item"
              :class="{ 'is-hot': isHot(m.project.slug) }"
              :data-map-list-slug="m.project.slug"
              @mouseenter="setHot([m.project.slug])"
              @mouseleave="setHot([])"
              @focus="setHot([m.project.slug])"
              @blur="setHot([])"
            >
              <span class="wm-item__t">
                <span class="mono-s text-muted mr-2">{{ m.no }}</span>{{ tt(m.project.title) }}
              </span>
              <span class="wm-item__sq" aria-hidden="true" />
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="wm-group">
        <h2 class="wm-group__h mono-s">{{ t('work.map.not_mapped') }} ({{ unmapped.length }})</h2>
        <ul v-if="unmapped.length">
          <li v-for="i in unmapped" :key="i.project.slug">
            <NuxtLink
              :to="localePath(`/work/${i.project.slug}`)"
              class="wm-item"
              :data-map-list-slug="i.project.slug"
            >
              <span class="wm-item__t">
                <span class="mono-s text-muted mr-2">{{ i.no }}</span>{{ tt(i.project.title) }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </nav>
  </div>
</template>

<style scoped>
.wm-fig { margin: 0; }
.wm-cap {
  display: flex;
  flex-wrap: wrap;
  gap: .25rem 1rem;
  margin-bottom: .75rem;
}
.wm-full { aspect-ratio: 940 / 360; }
.wm-inset { aspect-ratio: 940 / 325; }
.wm-inset-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0 .5rem;
  min-height: 2.25rem;
}
.wm-inset-head p:focus-visible { outline-offset: 4px; }

.wm-btn {
  min-height: 36px;
  padding: 0 .75rem;
  border: 1px solid var(--color-line-strong);
  color: var(--color-fg-2);
  transition: color var(--d-1) var(--ease-draft), border-color var(--d-1) var(--ease-draft);
}
.wm-btn:hover { color: var(--color-fg); border-color: var(--color-fg); }
.wm-toggle { display: none; }

@media (max-width: 639px) {
  .is-mobile-hidden { display: none; }
  .wm-inset { aspect-ratio: auto; height: 220px; }
  .wm-inset-head { margin-top: 0; }
  .wm-toggle { display: inline-flex; align-items: center; min-height: 44px; margin-top: .75rem; }
  .wm-btn { min-height: 44px; }
}
@media (min-width: 640px) {
  .is-desktop-hidden { display: none; }
}

.wm-group + .wm-group { margin-top: 1.75rem; }
.wm-group__h {
  color: var(--color-muted);
  font-weight: 400;
  margin-bottom: .5rem;
}
.wm-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .75rem;
  min-height: 44px;
  padding: .5rem 0;
  border-bottom: 1px solid var(--color-line);
  color: var(--color-fg-2);
  font-size: .9375rem;
  transition: color var(--d-1) var(--ease-draft);
}
.wm-item:hover,
.wm-item:focus-visible,
.wm-item.is-hot { color: var(--color-fg); }
.wm-item__sq {
  flex: none;
  width: 8px;
  height: 8px;
  background: var(--color-fg);
}
.wm-item:hover .wm-item__sq,
.wm-item:focus-visible .wm-item__sq,
.wm-item.is-hot .wm-item__sq { background: var(--color-signal); }
</style>
