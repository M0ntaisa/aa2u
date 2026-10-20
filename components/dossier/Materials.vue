<script setup lang="ts">
/**
 * Material swatch strip (identity-dossier §3.7, chapter 05): square macro
 * tiles with the name in mono and an optional note. The image is
 * decorative (the name is the visible text), so alt="".
 */
import type { ProjectMaterial } from '~/types/content'

defineProps<{ materials: ProjectMaterial[] }>()

const tt = useT()
const failed = reactive<Record<number, boolean>>({})
</script>

<template>
  <ul v-reveal-stagger class="swatches">
    <li v-for="(m, i) in materials" :key="i" class="swatch">
      <div class="swatch__tile hatch">
        <NuxtImg
          v-if="m.image && !failed[i]"
          :src="m.image"
          alt=""
          width="400"
          height="400"
          sizes="sm:50vw md:33vw lg:20vw xl:20vw 2xl:20vw"
          format="webp"
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover"
          @error="failed[i] = true"
        />
      </div>
      <p class="mono-s mt-2 text-fg">{{ tt(m.name) }}</p>
      <p v-if="tt(m.note)" class="mt-1 text-sm leading-normal text-fg-2">{{ tt(m.note) }}</p>
    </li>
  </ul>
</template>

<style scoped>
.swatches {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem var(--sheet-gutter);
}
@media (min-width: 640px) { .swatches { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (min-width: 1280px) { .swatches { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.swatch__tile { aspect-ratio: 1; overflow: hidden; }
</style>
