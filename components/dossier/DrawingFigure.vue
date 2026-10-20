<script setup lang="ts">
/**
 * Drawing figure (identity-dossier §2.5).
 *
 * Uploaded drawings are ALWAYS rendered through <img> (never inlined), so
 * script embedded in an SVG cannot run. `invert` is for black-on-white CAD
 * exports: invert + hue-rotate with mix-blend-mode screen drops the paper
 * and turns the lines white on --bg. The drawing itself uses the section-cut
 * reveal; only our own decorative north arrow / scale bar (plans and site
 * plans) draws in. Clicking opens the lightbox.
 */
import type { DrawingFig } from '~/utils/dossier'

const props = defineProps<{
  item: DrawingFig
  title: string
}>()

const emit = defineEmits<{ open: [lb: number, trigger: HTMLElement] }>()

const { t } = useI18n()
const tt = useT()
const failed = ref(false)

const d = computed(() => props.item.drawing)
/** SVGs go out as-is (via <img>); raster exports (up to 10 MB) are resized. */
const isSvg = computed(() => isSvgUrl(d.value.url))
const showOrnament = computed(() => d.value.kind === 'plan' || d.value.kind === 'site_plan')

/** "FIG. 03 · PLAN · LEVEL 1 · 1:200" */
const meta = computed(() =>
  [
    t('dossier.fig', { n: pad2(props.item.fig) }),
    t(`dossier.kind.${d.value.kind}`),
    d.value.level,
    d.value.scale,
  ].filter(Boolean).join(' · '),
)

const alt = computed(() =>
  tt(d.value.alt) || tt(d.value.caption)
  || `${t(`dossier.kind.${d.value.kind}`)}: ${t('dossier.fig_alt', { title: props.title, n: pad2(props.item.fig) })}`,
)

function open(e: MouseEvent) {
  emit('open', props.item.lb, e.currentTarget as HTMLElement)
}
</script>

<template>
  <figure class="dfig">
    <div v-cut class="dfig__frame" :class="{ hatch: failed }">
      <img
        v-if="!failed && isSvg"
        :src="d.url"
        :alt="alt"
        loading="lazy"
        decoding="async"
        class="dfig__img"
        :class="{ 'is-inverted': d.invert }"
        @error="failed = true"
      >
      <NuxtImg
        v-else-if="!failed"
        :src="d.url"
        :alt="alt"
        sizes="sm:100vw md:100vw lg:75vw xl:75vw 2xl:75vw"
        format="webp"
        loading="lazy"
        decoding="async"
        class="dfig__img"
        :class="{ 'is-inverted': d.invert }"
        @error="failed = true"
      />
      <svg
        v-if="showOrnament"
        v-draw
        class="dfig__ornament"
        viewBox="0 0 132 40"
        fill="none"
        aria-hidden="true"
      >
        <!-- scale bar (ornament only; the real scale is in the caption) -->
        <path d="M2 32 H90 M2 27 V37 M24 29 V35 M46 27 V37 M90 27 V37" />
        <path d="M2 32 H46" stroke-width="3" />
        <!-- north arrow -->
        <path d="M118 36 L118 6 M111 18 L118 4 L125 18" />
        <path d="M113 30 V22 L123 30 V22" stroke-width="1" />
      </svg>
      <button
        type="button"
        class="dfig__open"
        :aria-label="t('dossier.enlarge', { n: pad2(item.fig) })"
        :data-cursor-label="t('dossier.enlarge_cursor')"
        @click="open"
      />
    </div>
    <figcaption class="dfig__cap">
      <span class="mono-s text-muted">{{ meta }}</span>
      <span v-if="tt(d.caption)">{{ tt(d.caption) }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.dfig { margin: 0; }
.dfig__frame {
  position: relative;
  border: 1px solid var(--color-line);
  padding: clamp(.75rem, 2vw, 1.5rem);
  background: var(--color-bg);
  min-height: 8rem;
  isolation: isolate;
}
.dfig__img {
  display: block;
  width: 100%;
  height: auto;
  color: transparent;
}
/* Black-on-white CAD export → white lines on --bg. */
.dfig__img.is-inverted {
  filter: invert(1) hue-rotate(180deg);
  mix-blend-mode: screen;
}
.dfig__ornament {
  position: absolute;
  right: clamp(.75rem, 2vw, 1.5rem);
  bottom: clamp(.5rem, 1.5vw, 1rem);
  width: 6.5rem;
  height: auto;
  stroke: var(--color-fg-2);
  stroke-width: 1;
  pointer-events: none;
}
.dfig__open {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  cursor: zoom-in;
}
.dfig__open:focus-visible { outline-offset: -4px; }
.dfig__cap {
  display: flex;
  flex-wrap: wrap;
  gap: .25rem .75rem;
  margin-top: .625rem;
  font-size: .875rem;
  line-height: 1.5;
  color: var(--color-fg-2);
}
.dfig__cap .mono-s { flex: none; padding-top: .125rem; }
@media (max-width: 639px) {
  .dfig__ornament { width: 4.5rem; }
}
</style>
