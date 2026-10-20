<script setup lang="ts">
/**
 * Lightbox (identity-dossier §2.6) on a native <dialog> opened with
 * showModal(): the browser provides the focus trap, inert background and
 * Esc. Focus returns to the trigger on close.
 *
 * Keys: ←/→ previous/next, Home/End first/last. Touch: horizontal swipe
 * ≥ 50px moves, swipe down > 80px closes. Neighbours are preloaded. Scroll
 * is locked through Lenis. Drawings are shown via <img> only.
 */
import type { LightboxEntry } from '~/utils/dossier'

const props = defineProps<{
  items: LightboxEntry[]
  title: string
}>()

const { t } = useI18n()
const tt = useT()
const img = useImage()
const reduced = useReducedMotion()

const dialog = ref<HTMLDialogElement | null>(null)
const index = ref(0)
const isOpen = ref(false)
let opener: HTMLElement | null = null

const count = computed(() => props.items.length)
const current = computed(() => props.items[index.value])

function srcOf(e: LightboxEntry | undefined) {
  if (!e) return ''
  const url = e.type === 'drawing' ? e.drawing.url : e.img.url
  if (e.type === 'drawing' && isSvgUrl(url)) return url
  return img(url, { width: 2000, format: 'webp' })
}

const view = computed(() => {
  const e = current.value
  if (!e) return null
  if (e.type === 'drawing') {
    const d = e.drawing
    return {
      src: srcOf(e),
      alt: tt(d.alt) || tt(d.caption) || t('dossier.fig_alt', { title: props.title, n: pad2(e.fig) }),
      meta: [t('dossier.fig', { n: pad2(e.fig) }), t(`dossier.kind.${d.kind}`), d.level, d.scale].filter(Boolean).join(' · '),
      caption: tt(d.caption),
      drawing: true,
      invert: !!d.invert,
    }
  }
  return {
    src: srcOf(e),
    alt: tt(e.img.alt) || t('dossier.fig_alt', { title: props.title, n: pad2(e.fig) }),
    meta: t('dossier.fig', { n: pad2(e.fig) }),
    caption: tt(e.img.caption),
    drawing: false,
    invert: false,
  }
})

function preload() {
  if (!import.meta.client || count.value < 2) return
  for (const off of [-1, 1]) {
    const e = props.items[(index.value + off + count.value) % count.value]
    const src = srcOf(e)
    if (src) { const im = new Image(); im.src = src }
  }
}

const loaded = ref(false)

function go(i: number) {
  if (!count.value) return
  const nextIndex = (i + count.value) % count.value
  if (nextIndex !== index.value) loaded.value = false
  index.value = nextIndex
  preload()
}

function lenis() {
  return (useNuxtApp() as any).$lenis as { stop(): void, start(): void } | undefined
}

function open(i: number, trigger?: HTMLElement | null) {
  const el = dialog.value
  if (!el || !count.value) return
  opener = trigger ?? (document.activeElement as HTMLElement | null)
  const nextIndex = Math.max(0, Math.min(i, count.value - 1))
  if (nextIndex !== index.value || !isOpen.value) loaded.value = false
  index.value = nextIndex
  preload()
  if (!el.open) el.showModal()
  isOpen.value = true
  lenis()?.stop()
}

function close() {
  dialog.value?.close()
}

let unmounting = false

function onClose() {
  if (unmounting) return
  isOpen.value = false
  lenis()?.start()
  const target = opener
  opener = null
  if (target && document.contains(target)) target.focus({ preventScroll: true })
}

function onKeydown(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  switch (e.key) {
    case 'ArrowLeft': go(index.value - 1); break
    case 'ArrowRight': go(index.value + 1); break
    case 'Home': go(0); break
    case 'End': go(count.value - 1); break
    default: return
  }
  e.preventDefault()
}

let touch: { x: number, y: number } | null = null
function onTouchStart(e: TouchEvent) {
  const p = e.changedTouches[0]
  touch = p ? { x: p.clientX, y: p.clientY } : null
}
function onTouchEnd(e: TouchEvent) {
  const p = e.changedTouches[0]
  if (!touch || !p) return
  const dx = p.clientX - touch.x
  const dy = p.clientY - touch.y
  touch = null
  if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) go(index.value + (dx < 0 ? 1 : -1))
  else if (dy > 80 && dy > Math.abs(dx)) close()
}

/** Click on the dimmed area around the stage closes, like a backdrop. */
function onDialogClick(e: MouseEvent) {
  if (e.target === dialog.value) close()
}

onBeforeUnmount(() => {
  // The dialog's close event fires async (after unmount), so restore the
  // page synchronously here instead of relying on onClose.
  unmounting = true
  if (isOpen.value) {
    isOpen.value = false
    lenis()?.start()
  }
  if (dialog.value?.open) dialog.value.close()
})

defineExpose({ open, close })
</script>

<template>
  <dialog
    ref="dialog"
    class="lb"
    :aria-label="t('dossier.lightbox.label')"
    data-cursor="hide"
    @close="onClose"
    @keydown="onKeydown"
    @click="onDialogClick"
  >
    <div v-if="isOpen && view" class="lb__in">
      <div class="lb__top">
        <p class="mono-s" aria-hidden="true">
          {{ pad2(index + 1) }} / {{ pad2(count) }}
        </p>
        <button type="button" class="lb__btn mono-s" @click="close">
          {{ t('dossier.lightbox.close') }}&ensp;<span aria-hidden="true">✕</span>
        </button>
      </div>

      <div
        class="lb__stage"
        :class="{ 'is-loading': !loaded }"
        @touchstart.passive="onTouchStart"
        @touchend="onTouchEnd"
      >
        <Transition :name="reduced ? '' : 'lb-fade'" mode="out-in">
          <img
            :key="index"
            :src="view.src"
            :alt="view.alt"
            class="lb__img"
            :class="{ 'is-drawing': view.drawing, 'is-inverted': view.invert }"
            @load="loaded = true"
            @error="loaded = true"
          >
        </Transition>
      </div>

      <div class="lb__bot">
        <button
          type="button"
          class="lb__btn lb__arrow"
          :aria-label="t('dossier.lightbox.prev')"
          :disabled="count < 2"
          @click="go(index - 1)"
        >
          <span aria-hidden="true">←</span>
        </button>
        <div class="lb__cap" aria-live="polite">
          <span class="sr-only">{{ t('dossier.lightbox.counter', { i: index + 1, n: count }) }}. </span>
          <span class="mono-s text-muted">{{ view.meta }}</span>
          <span v-if="view.caption" class="text-fg-2">{{ view.caption }}</span>
        </div>
        <button
          type="button"
          class="lb__btn lb__arrow"
          :aria-label="t('dossier.lightbox.next')"
          :disabled="count < 2"
          @click="go(index + 1)"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.lb {
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  overflow: hidden;
}
.lb::backdrop { background: rgba(0, 0, 0, .5); }
.lb__in {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  padding: .75rem var(--sheet-margin) 1rem;
  pointer-events: none;
}
.lb__in > * { pointer-events: auto; }
.lb__top,
.lb__bot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.lb__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: .75rem 0;
  touch-action: pan-y;
}
.lb__stage.is-loading {
  background-image: repeating-linear-gradient(45deg, var(--color-line) 0 1px, transparent 1px 6px);
  background-clip: content-box;
}
.lb__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
.lb__img.is-drawing { width: min(100%, 1200px); height: auto; }
.lb__img.is-inverted { filter: invert(1) hue-rotate(180deg); mix-blend-mode: screen; }
.lb__btn {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 .75rem;
  border: 1px solid var(--color-line-strong);
  color: var(--color-fg);
  transition: border-color var(--d-1) var(--ease-draft);
}
.lb__btn:hover { border-color: var(--color-fg); }
.lb__btn:disabled { opacity: .4; }
.lb__arrow { font-size: 1.125rem; }
.lb__cap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: .25rem .75rem;
  text-align: center;
  font-size: .875rem;
  line-height: 1.5;
}
.lb-fade-enter-active,
.lb-fade-leave-active { transition: opacity var(--d-2) var(--ease-draft); }
.lb-fade-enter-from,
.lb-fade-leave-to { opacity: 0; }
</style>
