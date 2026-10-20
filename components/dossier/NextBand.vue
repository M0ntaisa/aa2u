<script setup lang="ts">
/**
 * Next-project band (identity-dossier §2.7): full width, 60svh (40svh on
 * mobile), the next cover in true colour under the scrim, "NEXT — 04 / 08"
 * and the title bottom-left, an arrow bottom-right. One link; a section-cut
 * line sweeps across on hover/focus.
 */
import type { Project } from '~/types/content'

const props = defineProps<{
  project: Project
  position: number
  total: number
}>()

const { t } = useI18n()
const tt = useT()
const localePath = useLocalePath()
const failed = ref(false)
const title = computed(() => tt(props.project.title))
const counter = computed(() => `${pad2(props.position)} / ${pad2(props.total)}`)
</script>

<template>
  <NuxtLink
    :to="localePath(`/work/${project.slug}`)"
    class="next-band group"
    :aria-label="t('dossier.next_aria', { title })"
    :data-cursor-label="t('dossier.next_cursor')"
  >
    <div class="next-band__media hatch">
      <NuxtImg
        v-if="project.cover_image && !failed"
        :src="project.cover_image"
        alt=""
        sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"
        format="webp"
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover"
        @error="failed = true"
      />
    </div>
    <div class="absolute inset-0 scrim" aria-hidden="true" />
    <span class="next-band__sweep" aria-hidden="true" />
    <div class="next-band__text sheet-wrap" aria-hidden="true">
      <div class="min-w-0">
        <p class="mono-s mb-2">
          {{ t('dossier.next') }} — {{ counter }}
        </p>
        <p class="font-display display-l">{{ title }}</p>
      </div>
      <span class="font-display display-l next-band__arrow">→</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.next-band {
  position: relative;
  display: block;
  height: 60svh;
  min-height: 320px;
  overflow: hidden;
  color: var(--color-fg);
}
.next-band:focus-visible { outline-offset: -4px; }
.next-band__media { position: absolute; inset: 0; }
.next-band__text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2.5rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
}
.next-band__arrow { transition: transform var(--d-3) var(--ease-draft); }
.next-band:hover .next-band__arrow,
.next-band:focus-visible .next-band__arrow { transform: translateX(.5rem); }
.next-band__sweep {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: var(--color-fg);
  opacity: 0;
  pointer-events: none;
}
.next-band:hover .next-band__sweep,
.next-band:focus-visible .next-band__sweep {
  animation: next-sweep var(--d-4) var(--ease-draft) forwards;
}
@keyframes next-sweep {
  0% { left: 0; opacity: 1; }
  90% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
@media (max-width: 639px) {
  .next-band { height: 40svh; min-height: 260px; }
  .next-band__text { bottom: 1.5rem; }
}
@media (prefers-reduced-motion: reduce) {
  .next-band__sweep { display: none; }
}
</style>
