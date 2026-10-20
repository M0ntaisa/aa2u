<script setup lang="ts">
/**
 * One image block in a dossier chapter (identity-dossier §3.7):
 *   full  — viewport width (Built only; the parent guarantees that)
 *   wide  — content columns 4–12, bleeding to the right viewport edge
 *   inset — columns 6–12 (7/12)
 *   pair  — two images, columns 4–8 and 9–12
 *   tall  — portrait, columns 6–9 at 3:4
 * Below 1024px every layout is full content width; pairs stack.
 *
 * Every figure opens the lightbox; the caption is a <figcaption> with a
 * mono "FIG. 07" and the caption text, alt stays separate.
 */
import type { ImageBlock, ImageFig } from '~/utils/dossier'

const props = defineProps<{
  block: ImageBlock
  /** Project title, for the alt fallback "<title>, figure 7". */
  title: string
}>()

const emit = defineEmits<{ open: [lb: number, trigger: HTMLElement] }>()

const { t } = useI18n()
const tt = useT()

const failed = reactive<Record<number, boolean>>({})

const sizes = computed(() => ({
  full: 'sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw',
  wide: 'sm:100vw md:100vw lg:80vw xl:80vw 2xl:80vw',
  inset: 'sm:100vw md:100vw lg:55vw xl:55vw 2xl:55vw',
  pair: 'sm:100vw md:100vw lg:40vw xl:40vw 2xl:40vw',
  tall: 'sm:100vw md:100vw lg:35vw xl:35vw 2xl:35vw',
}[props.block.layout]))

function alt(f: ImageFig) {
  return tt(f.img.alt) || t('dossier.fig_alt', { title: props.title, n: pad2(f.fig) })
}

function ratio(f: ImageFig) {
  if (props.block.layout === 'tall') return '3 / 4'
  const { width: w, height: h } = f.img
  return w && h ? `${w} / ${h}` : '16 / 10'
}

function position(f: ImageFig) {
  const x = f.img.focal_x ?? 0.5
  const y = f.img.focal_y ?? 0.5
  return `${Math.round(x * 100)}% ${Math.round(y * 100)}%`
}

function open(f: ImageFig, e: MouseEvent) {
  emit('open', f.lb, e.currentTarget as HTMLElement)
}
</script>

<template>
  <div class="iblock" :class="`iblock--${block.layout}`">
    <figure v-for="f in block.items" :key="f.fig" class="ifig">
      <div
        v-cut="block.layout === 'tall' ? { dir: 'up' } : undefined"
        class="ifig__frame hatch"
        :style="{ aspectRatio: ratio(f) }"
      >
        <NuxtImg
          v-if="!failed[f.fig]"
          :src="f.img.url"
          :alt="alt(f)"
          :width="f.img.width"
          :height="f.img.height"
          :sizes="sizes"
          format="webp"
          loading="lazy"
          decoding="async"
          class="ifig__img"
          :style="{ objectPosition: position(f) }"
          @error="failed[f.fig] = true"
        />
        <button
          type="button"
          class="ifig__open"
          :aria-label="t('dossier.enlarge', { n: pad2(f.fig) })"
          :data-cursor-label="t('dossier.enlarge_cursor')"
          @click="open(f, $event)"
        />
      </div>
      <figcaption class="ifig__cap">
        <span class="mono-s text-muted">{{ t('dossier.fig', { n: pad2(f.fig) }) }}</span>
        <span v-if="f.img.caption && tt(f.img.caption)">{{ tt(f.img.caption) }}</span>
      </figcaption>
    </figure>
  </div>
</template>

<style scoped>
.iblock { --g: var(--sheet-gutter); }
.ifig { margin: 0; min-width: 0; }
.ifig__frame { position: relative; overflow: hidden; width: 100%; }
.ifig__img { display: block; width: 100%; height: 100%; object-fit: cover; }
.ifig__open {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  cursor: zoom-in;
}
.ifig__open:focus-visible { outline-offset: -4px; }
.ifig__cap {
  display: flex;
  gap: .75rem;
  margin-top: .625rem;
  font-size: .875rem;
  line-height: 1.5;
  color: var(--color-fg-2);
}
.ifig__cap .mono-s { flex: none; padding-top: .125rem; }

.iblock--pair { display: grid; gap: 2rem var(--g); }
.iblock--full .ifig__frame { max-height: 92svh; }

@media (min-width: 1024px) {
  /* Content column = 9 sheet columns. */
  .iblock--wide { margin-right: calc(-1 * var(--bleed-right, 0px)); }
  .iblock--wide .ifig__cap { padding-right: var(--bleed-right, 0px); }
  .iblock--inset { margin-left: calc((100% + var(--g)) * 2 / 9); }
  .iblock--tall {
    width: calc((100% + var(--g)) * 4 / 9 - var(--g));
    margin-left: calc((100% + var(--g)) * 2 / 9);
  }
  .iblock--pair { grid-template-columns: 5fr 4fr; align-items: start; }
  /* Full bleed: from the content column out to both viewport edges. */
  .iblock--full {
    width: var(--vw, 100vw);
    margin-left: calc(-1 * var(--bleed-left, 0px));
  }
  .iblock--full .ifig__cap { padding-inline: var(--bleed-left, 0px) var(--sheet-margin); }
}
@media (max-width: 1023px) {
  .iblock--full { margin-inline: calc(-1 * var(--sheet-margin)); }
  .iblock--full .ifig__cap { padding-inline: var(--sheet-margin); }
}
</style>
