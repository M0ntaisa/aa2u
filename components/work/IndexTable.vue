<script setup lang="ts">
/**
 * /work view = Index (identity-dossier §3.4). A real <table>; each project
 * name is a stretched link so the whole row is clickable. On hover the
 * other rows dim and the No column turns into a signal arrow.
 *
 * Preview (desktop, fine pointer, ≥768px only; aria-hidden): a 320×220
 * true-colour image that follows the pointer with a 0.18 lerp and swaps with
 * a section cut. On keyboard focus it anchors to the right end of the row.
 * Under reduced motion it never follows the pointer or animates: it is shown
 * anchored to the row, static. Esc dismisses it.
 *
 * Mobile (<768px): rows become two-line items with a 72×54 thumbnail. The
 * table keeps explicit ARIA roles because display:grid on <tr> drops table
 * semantics in Safari.
 */
import type { Project } from '~/types/content'
import { formatArea, type WorkItem as IndexItem } from '~/utils/work-views'

const props = defineProps<{ items: IndexItem[] }>()

const { t, locale } = useI18n()
const tt = useT()
const localePath = useLocalePath()
const { capture } = useSharedFlip()

const PW = 320
const PH = 220
const OFFSET = 24
const EDGE = 16

const canPreview = ref(false)
const reduced = useReducedMotion()
const active = ref<IndexItem | null>(null)
const mode = ref<'pointer' | 'anchor'>('pointer')
const previewEl = ref<HTMLElement | null>(null)
const tbodyEl = ref<HTMLElement | null>(null)
const theadEl = ref<HTMLElement | null>(null)
/** Keyboard anchor found no spot that clears the row and the controls. */
const anchorBlocked = ref(false)

let tx = 0, ty = 0, cx = 0, cy = 0
let raf = 0
let anchorRow: HTMLElement | null = null
let mq: MediaQueryList | null = null
const onMq = () => { canPreview.value = !!mq?.matches; if (!canPreview.value) hide() }

onMounted(() => {
  mq = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)')
  onMq()
  mq.addEventListener('change', onMq)
})
onBeforeUnmount(() => {
  mq?.removeEventListener('change', onMq)
  stopLoop()
  window.removeEventListener('scroll', onScroll)
})

const statusLabel = (p: Project) => (p.build_status ? t(`work.status.${p.build_status}`) : null)
const area = (p: Project) => formatArea(p.area_built_m2, locale.value)
const typeLabel = (p: Project) => (p.category ? tt(p.category.name) : null)
const locLabel = (p: Project) => (p.location ? tt(p.location) : null)

function place() {
  const el = previewEl.value
  if (!el) return
  el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`
}

function loop() {
  cx += (tx - cx) * 0.18
  cy += (ty - cy) * 0.18
  place()
  if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) raf = requestAnimationFrame(loop)
  else { cx = tx; cy = ty; place(); raf = 0 }
}
function kick() { if (!raf) raf = requestAnimationFrame(loop) }
function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0 }

function pointerTarget(x: number, y: number) {
  let nx = x + OFFSET
  let ny = y + OFFSET
  if (nx + PW > window.innerWidth - EDGE) nx = x - OFFSET - PW
  if (ny + PH > window.innerHeight - EDGE) ny = y - OFFSET - PH
  return [Math.max(EDGE, nx), Math.max(EDGE, ny)] as const
}

/** Lowest y the anchored preview may reach: below the fixed site header
 *  and the table head, so it never covers the filter controls. */
function topLimit() {
  const header = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0
  const thead = theadEl.value?.getBoundingClientRect().bottom ?? 0
  return Math.max(header, thead, 0) + 8
}

/**
 * Keyboard anchor: right-aligned to the row, just below it (or just above
 * it when there is no room below), never over the row itself, the table
 * head or anything above it. With no room either way it stays hidden.
 */
function anchorTo(row: HTMLElement) {
  const r = row.getBoundingClientRect()
  const x = Math.max(EDGE, r.right - PW)
  const below = r.bottom + 8
  const above = r.top - 8 - PH
  let y: number | null = null
  if (below + PH <= window.innerHeight - EDGE && below >= topLimit()) y = below
  else if (above >= topLimit()) y = above
  anchorBlocked.value = y === null
  if (y === null) return
  tx = cx = x
  ty = cy = y
  nextTick(place)
}

/** Scroll a keyboard-focused row into view, leaving room for the preview
 *  below it (routed through Lenis when it is driving the scroll). */
function revealRow(row: HTMLElement) {
  const r = row.getBoundingClientRect()
  const top = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0) + 16
  const room = canPreview.value ? 8 + PH + EDGE : EDGE
  let delta = 0
  if (r.top < top) delta = r.top - top
  else if (r.bottom + room > window.innerHeight) delta = Math.min(r.bottom + room - window.innerHeight, r.top - top)
  if (Math.abs(delta) < 1) return
  const lenis = (useNuxtApp() as any).$lenis
  if (lenis?.scrollTo) lenis.scrollTo(window.scrollY + delta, { immediate: true, force: true })
  else window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' as ScrollBehavior })
}

function show(item: IndexItem, how: 'pointer' | 'anchor', row: HTMLElement, e?: MouseEvent) {
  if (!canPreview.value) return
  const first = !active.value
  active.value = item
  // Reduced motion: never chase the pointer; sit at the row, static.
  const m = reduced.value ? 'anchor' : how
  mode.value = m
  if (m === 'anchor') {
    stopLoop()
    anchorRow = row
    anchorTo(row)
    window.addEventListener('scroll', onScroll, { passive: true })
    return
  }
  anchorRow = null
  anchorBlocked.value = false
  window.removeEventListener('scroll', onScroll)
  if (e) {
    const [x, y] = pointerTarget(e.clientX, e.clientY)
    tx = x; ty = y
    if (first) { cx = x; cy = y; nextTick(place) }
    else kick()
  }
}

function hide() {
  active.value = null
  anchorBlocked.value = false
  anchorRow = null
  stopLoop()
  window.removeEventListener('scroll', onScroll)
}

function onScroll() { if (anchorRow) anchorTo(anchorRow) }

function onRowEnter(item: IndexItem, e: MouseEvent) {
  show(item, 'pointer', e.currentTarget as HTMLElement, e)
}
function onMove(e: MouseEvent) {
  if (!active.value || mode.value !== 'pointer') return
  const [x, y] = pointerTarget(e.clientX, e.clientY)
  tx = x; ty = y
  kick()
}
function onLeave() {
  // Keep a keyboard-anchored preview when the pointer merely passes by.
  const focused = tbodyEl.value?.querySelector('a:focus-visible')
  if (focused) {
    const row = focused.closest('tr') as HTMLElement
    const item = props.items.find(i => i.project.slug === row?.dataset.slug)
    if (item && row) return show(item, 'anchor', row)
  }
  hide()
}

function onFocusIn(item: IndexItem, e: FocusEvent) {
  const link = e.target as HTMLElement
  if (!link.matches(':focus-visible')) return
  const row = link.closest('tr') as HTMLElement
  // After the browser's own focus scroll has settled.
  requestAnimationFrame(() => {
    if (document.activeElement !== link) return
    revealRow(row)
    show(item, 'anchor', row)
  })
}
function onFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null
  if (next && tbodyEl.value?.contains(next)) return
  hide()
}

function onLinkClick(item: IndexItem, e: MouseEvent) {
  // Shared-element flip from the preview into the dossier cover: plain
  // left clicks only (modifier clicks open a new tab and stay here).
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const img = previewEl.value?.querySelector<HTMLElement>('.wi-preview__media')
  if (img && active.value?.project.slug === item.project.slug) {
    capture(img, `project-cover-${item.project.slug}`)
  }
}

watch(() => props.items, (list) => {
  if (active.value && !list.some(i => i.project.slug === active.value!.project.slug)) hide()
})
</script>

<template>
  <div class="wi">
    <table class="wi-table" role="table" @keydown.esc="hide">
      <caption class="sr-only">{{ t('work.index.caption', { n: items.length }, items.length) }}</caption>
      <thead ref="theadEl" class="wi-head mono-s" role="rowgroup">
        <tr role="row">
          <th role="columnheader" scope="col" class="wi-no">{{ t('work.index.no') }}</th>
          <th role="columnheader" scope="col">{{ t('work.index.project') }}</th>
          <th role="columnheader" scope="col">{{ t('project.location') }}</th>
          <th role="columnheader" scope="col">{{ t('project.year') }}</th>
          <th role="columnheader" scope="col">{{ t('project.type') }}</th>
          <th role="columnheader" scope="col">{{ t('work.index.status') }}</th>
          <th role="columnheader" scope="col" class="wi-num">m²</th>
        </tr>
      </thead>
      <tbody
        ref="tbodyEl"
        role="rowgroup"
        @mousemove="onMove"
        @mouseleave="onLeave"
        @focusout="onFocusOut"
      >
        <tr
          v-for="item in items"
          :key="item.project.slug"
          role="row"
          class="wi-row"
          :class="{ 'is-active': active?.project.slug === item.project.slug }"
          :data-slug="item.project.slug"
          @mouseenter="onRowEnter(item, $event)"
        >
          <td role="cell" class="wi-no mono-s">
            <span class="wi-no__n">{{ item.no }}</span>
            <span class="wi-no__a" aria-hidden="true">→</span>
          </td>
          <td role="cell" class="wi-name">
            <NuxtLink
              :to="localePath(`/work/${item.project.slug}`)"
              class="wi-link"
              :data-cursor-label="t('cursor.open')"
              @focusin="onFocusIn(item, $event)"
              @click="onLinkClick(item, $event)"
            >{{ tt(item.project.title) }}</NuxtLink>
            <!-- Mobile two-line meta (the separate cells are hidden there). -->
            <span class="wi-meta mono-s">
              <span>{{ [locLabel(item.project), item.project.year, typeLabel(item.project)].filter(Boolean).join(' · ') }}</span>
              <span v-if="area(item.project) || statusLabel(item.project)" class="block">
                {{ [area(item.project) ? `${area(item.project)} m²` : null, statusLabel(item.project)].filter(Boolean).join(' · ') }}
              </span>
            </span>
          </td>
          <td role="cell" class="wi-cell">
            <template v-if="locLabel(item.project)">{{ locLabel(item.project) }}</template>
            <template v-else><span aria-hidden="true">—</span><span class="sr-only">{{ t('work.index.na') }}</span></template>
          </td>
          <td role="cell" class="wi-cell mono-s">
            <template v-if="item.project.year">{{ item.project.year }}</template>
            <template v-else><span aria-hidden="true">—</span><span class="sr-only">{{ t('work.index.na') }}</span></template>
          </td>
          <td role="cell" class="wi-cell">
            <template v-if="typeLabel(item.project)">{{ typeLabel(item.project) }}</template>
            <template v-else><span aria-hidden="true">—</span><span class="sr-only">{{ t('work.index.na') }}</span></template>
          </td>
          <td role="cell" class="wi-cell mono-s">
            <template v-if="statusLabel(item.project)">{{ statusLabel(item.project) }}</template>
            <template v-else><span aria-hidden="true">—</span><span class="sr-only">{{ t('work.index.na') }}</span></template>
          </td>
          <td role="cell" class="wi-cell wi-num mono-s">
            <template v-if="area(item.project)">{{ area(item.project) }}</template>
            <template v-else><span aria-hidden="true">—</span><span class="sr-only">{{ t('work.index.na') }}</span></template>
          </td>
          <td class="wi-thumb" aria-hidden="true">
            <div class="wi-thumb__box hatch">
              <NuxtImg
                v-if="item.project.cover_image"
                :src="item.project.cover_image"
                alt=""
                :width="144"
                :height="108"
                fit="cover"
                format="webp"
                loading="lazy"
                decoding="async"
                class="w-full h-full object-cover"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <ClientOnly>
      <Teleport to="body">
        <div
          v-show="canPreview && active && !anchorBlocked"
          ref="previewEl"
          class="wi-preview"
          :class="{ 'is-static': reduced }"
          aria-hidden="true"
        >
          <div
            v-if="active"
            :key="active.project.slug"
            class="wi-preview__media hatch"
          >
            <NuxtImg
              v-if="active.project.cover_image"
              :src="active.project.cover_image"
              alt=""
              :width="640"
              :height="440"
              fit="cover"
              format="webp"
              decoding="async"
              class="w-full h-full object-cover"
            />
          </div>
          <span v-if="active" class="wi-preview__tag mono-s">
            {{ active.no }}<template v-if="active.project.year"> · {{ active.project.year }}</template>
          </span>
        </div>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<style scoped>
.wi-table {
  width: 100%;
  border-collapse: collapse;
}
.wi-head th {
  text-align: left;
  font-weight: 400;
  color: var(--color-muted);
  padding: 0 .75rem .75rem 0;
  border-bottom: 1px solid var(--color-line-strong);
  white-space: nowrap;
}
.wi-no { width: 3.5rem; }
.wi-num { text-align: right !important; padding-right: 0 !important; }

.wi-row { position: relative; }
.wi-row td {
  height: 56px;
  padding: 0 .75rem 0 0;
  border-bottom: 1px solid var(--color-line);
  color: var(--color-fg-2);
  vertical-align: middle;
  transition: color var(--d-1) var(--ease-draft);
}
.wi-cell { font-size: .9375rem; }
.wi-row td.mono-s { font-size: .75rem; }
.wi-link {
  color: var(--color-fg);
  font-weight: 500;
  transition: color var(--d-1) var(--ease-draft);
}
/* Stretched link: the whole row is the hit area. */
.wi-link::after {
  content: '';
  position: absolute;
  inset: 0;
}
.wi-link:focus-visible { outline: none; }
.wi-link:focus-visible::after { outline: 2px solid var(--color-fg); outline-offset: -2px; }

.wi-no__a { display: none; color: var(--color-fg); }
.wi-row:hover .wi-no__n,
.wi-row:focus-within .wi-no__n { display: none; }
.wi-row:hover .wi-no__a,
.wi-row:focus-within .wi-no__a { display: inline; }

/* Dim the others (text only; --muted still ≥4.5:1). */
@media (hover: hover) {
  tbody:hover .wi-row td,
  tbody:hover .wi-row .wi-link { color: var(--color-muted); }
  tbody:hover .wi-row:hover td,
  tbody:hover .wi-row:hover .wi-link { color: var(--color-fg); }
}
tbody:focus-within .wi-row td,
tbody:focus-within .wi-row .wi-link { color: var(--color-muted); }
tbody:focus-within .wi-row:focus-within td,
tbody:focus-within .wi-row:focus-within .wi-link { color: var(--color-fg); }

.wi-meta,
.wi-thumb { display: none; }

@media (max-width: 767px) {
  .wi-head { display: none; }
  .wi-table, .wi-table tbody { display: block; }
  .wi-row {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr) 72px;
    column-gap: .75rem;
    align-items: start;
    padding: .875rem 0;
    border-bottom: 1px solid var(--color-line);
  }
  .wi-row td { height: auto; padding: 0; border: 0; }
  .wi-row td.wi-no { padding-top: .2rem; width: auto; }
  .wi-cell { display: none; }
  .wi-meta { display: block; margin-top: .375rem; color: var(--color-muted); }
  .wi-thumb { display: block; }
  .wi-thumb__box { width: 72px; height: 54px; overflow: hidden; }
}

/* Preview: fixed, transform-only. */
.wi-preview {
  position: fixed;
  left: 0;
  top: 0;
  width: 320px;
  height: 220px;
  z-index: 40;
  pointer-events: none;
  will-change: transform;
}
.wi-preview__media {
  width: 100%;
  height: 100%;
  overflow: hidden;
  animation: wi-cut var(--d-2) var(--ease-draft) both;
}
.wi-preview.is-static .wi-preview__media { animation: none; }
.wi-preview__tag {
  position: absolute;
  left: 0;
  top: 0;
  padding: .25rem .5rem;
  background: var(--color-bg);
  color: var(--color-fg);
}
@keyframes wi-cut {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}
@media (prefers-reduced-motion: reduce) {
  .wi-preview__media { animation: none; }
}
</style>
