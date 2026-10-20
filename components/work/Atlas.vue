<script setup lang="ts">
/**
 * /work view = Atlas (identity-dossier §3.5): the image grid on a repeating
 * 7|5 · 5|7 · 4|4|4 rhythm (12 columns ≥1024px; 2 columns on tablet; 1 on
 * mobile). True colour, hatch placeholder, section-cut sweep on hover and
 * the shared-element flip into the dossier (inside ProjectCard).
 */
import type { WorkItem } from '~/utils/work-views'

defineProps<{ items: WorkItem[] }>()

// Literal class names so Tailwind's scanner sees them.
const RHYTHM = [
  'lg:col-span-7', 'lg:col-span-5',
  'lg:col-span-5', 'lg:col-span-7',
  'lg:col-span-4', 'lg:col-span-4', 'lg:col-span-4',
]

// TransitionGroup leave: lock the card's current box (relative to the grid)
// before `.card-leave-active` takes it out of flow, so a leaving card fades
// at its own width instead of stretching.
function freezeLeavingCard(el: Element) {
  const node = el as HTMLElement
  node.style.width = `${node.offsetWidth}px`
  node.style.height = `${node.offsetHeight}px`
  node.style.left = `${node.offsetLeft}px`
  node.style.top = `${node.offsetTop}px`
}
</script>

<template>
  <TransitionGroup
    tag="div"
    name="card"
    class="atlas relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-5 lg:gap-x-6 gap-y-12 md:gap-y-16 items-start"
    @before-leave="freezeLeavingCard"
  >
    <div
      v-for="(item, i) in items"
      :key="item.project.slug"
      :class="[RHYTHM[i % RHYTHM.length], { 'is-pair-5': RHYTHM[i % RHYTHM.length] === 'lg:col-span-5' }]"
    >
      <ProjectCard :project="item.project" :no="item.no" variant="atlas" />
    </div>
  </TransitionGroup>
</template>

<style scoped>
/* 7|5 and 5|7 rows: the 7-column card keeps 4:3; the 5-column card's image
   takes the same height so both images line up (≥1024px only; 4|4|4 rows
   and smaller screens stay 4:3). Height of a 7-col 4:3 image, from the
   container width (100cqw) and the 1.5rem column gap (lg:gap-x-6):
     w7 = 7 × (100cqw − 11 × gap) / 12 + 6 × gap,  h = 0.75 × w7 */
.atlas { container-type: inline-size; }
@media (min-width: 1024px) {
  .is-pair-5 :deep(.card-media) {
    aspect-ratio: auto;
    height: calc(0.75 * (7 * (100cqw - 11 * 1.5rem) / 12 + 6 * 1.5rem));
  }
}

.card-move,
.card-enter-active,
.card-leave-active {
  transition: opacity var(--d-3) var(--ease-draft), transform var(--d-3) var(--ease-draft);
}
.card-enter-from { opacity: 0; transform: translateY(20px); }
.card-leave-to { opacity: 0; transform: translateY(-12px); }
/* Pulled out of flow so siblings can FLIP into place; freezeLeavingCard
   pins the box to its measured size/position first so it doesn't jump. */
.card-leave-active { position: absolute; }

@media (prefers-reduced-motion: reduce) {
  .card-move,
  .card-enter-active,
  .card-leave-active { transition: none !important; }
}
</style>
