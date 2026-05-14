<script setup lang="ts">
import type { Project } from '~/types/content'

const props = defineProps<{
  project: Project
  index?: number
  variant?: 'showcase' | 'grid'
}>()

const t = useT()
const { t: i18nT } = useI18n()
const localePath = useLocalePath()
const { capture } = useSharedFlip()

const imgRef = ref<HTMLElement | null>(null)
const flipId = computed(() => `project-cover-${props.project.slug}`)
const cursorLabel = computed(() => i18nT('project.view'))

const numberLabel = computed(() =>
  props.index !== undefined ? String(props.index + 1).padStart(2, '0') : '',
)

function onCardClick() {
  if (imgRef.value) capture(imgRef.value, flipId.value)
}
</script>

<template>
  <NuxtLink
    :to="localePath(`/work/${project.slug}`)"
    :data-cursor-label="cursorLabel"
    class="project-card group block relative max-w-full"
    :class="variant === 'showcase' ? 'w-full md:w-auto md:shrink-0' : 'w-full'"
    @click="onCardClick"
  >
    <!-- Showcase: width derived from viewport HEIGHT so the whole card
         (image + title) always fits in viewport. Mobile keeps width-driven
         layout since horizontal scroll is disabled there. -->
    <div
      :class="variant === 'showcase'
        ? 'w-full md:w-auto'
        : 'w-full'"
    >
      <div
        ref="imgRef"
        :data-flip-id="flipId"
        class="relative overflow-hidden aspect-[4/3] bg-white/[0.04]"
        :class="variant === 'showcase' ? 'md:h-[60vh] md:w-auto md:aspect-[4/3]' : ''"
      >
        <NuxtImg
          :src="project.cover_image"
          :alt="t(project.title)"
          :sizes="variant === 'showcase' ? '(max-width: 768px) 80vw, 60vw' : '(max-width: 768px) 100vw, 50vw'"
          :loading="variant === 'showcase' ? 'eager' : 'lazy'"
          format="webp"
          decoding="async"
          class="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        />
        <div v-if="numberLabel" class="absolute top-4 left-4 text-xs tracking-[0.25em] text-white/80 mix-blend-difference">
          {{ numberLabel }}
        </div>
      </div>

      <div class="mt-5 flex items-baseline justify-between gap-6">
        <div>
          <h3 class="font-display text-2xl md:text-3xl tracking-tight">
            {{ t(project.title) }}
          </h3>
          <div class="mt-2 text-sm text-[var(--color-muted)] flex items-center gap-3">
            <span v-if="project.location">{{ t(project.location) }}</span>
            <span v-if="project.location && project.year" class="opacity-50">/</span>
            <span v-if="project.year">{{ project.year }}</span>
          </div>
        </div>
        <span v-if="project.category" class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] whitespace-nowrap">
          {{ t(project.category.name) }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
