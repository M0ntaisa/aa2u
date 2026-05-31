<script setup lang="ts">
import type { Project } from '~/types/content'

const props = defineProps<{
  project: Project
  index?: number
  variant?: 'showcase' | 'grid' | 'featured'
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
    :class="[
      variant === 'showcase' ? 'w-full md:w-auto md:shrink-0' : 'w-full',
      variant === 'featured' ? 'project-card--featured' : '',
    ]"
    @click="onCardClick"
  >
    <div
      ref="imgRef"
      :data-flip-id="flipId"
      class="relative overflow-hidden bg-white/[0.04]"
      :class="[
        variant === 'showcase'
          ? 'aspect-[4/3] md:h-[60vh] md:w-auto md:aspect-[4/3]'
          : variant === 'featured'
            ? 'aspect-[16/9] md:aspect-[21/9]'
            : 'aspect-[4/3]',
      ]"
    >
      <NuxtImg
        :src="project.cover_image"
        :alt="t(project.title)"
        :sizes="
          variant === 'showcase'
            ? '(max-width: 768px) 80vw, 60vw'
            : variant === 'featured'
              ? '100vw'
              : '(max-width: 768px) 100vw, 50vw'
        "
        :loading="variant === 'showcase' || variant === 'featured' ? 'eager' : 'lazy'"
        format="webp"
        decoding="async"
        class="w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
      />
      <div
        v-if="numberLabel"
        class="absolute top-4 left-4 md:top-6 md:left-6 text-[10px] md:text-xs tracking-[0.28em] text-white/85 mix-blend-difference font-mono"
      >
        {{ numberLabel }} <span class="opacity-50">·</span> {{ project.year }}
      </div>
      <div
        v-if="variant === 'featured' && project.category"
        class="absolute top-4 right-4 md:top-6 md:right-6 text-[10px] md:text-xs uppercase tracking-[0.28em] text-white/85 mix-blend-difference"
      >
        {{ t(project.category.name) }}
      </div>
    </div>

    <!-- Featured: full metadata strip -->
    <div
      v-if="variant === 'featured'"
      class="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end"
    >
      <div class="md:col-span-7">
        <h3 class="font-display tracking-tight leading-[0.95] text-3xl md:text-5xl lg:text-6xl">
          {{ t(project.title) }}
        </h3>
        <p
          v-if="project.description"
          class="mt-3 md:mt-4 text-sm md:text-base text-[var(--color-muted)] max-w-md line-clamp-2"
        >
          {{ t(project.description) }}
        </p>
      </div>
      <dl class="md:col-span-5 grid grid-cols-3 gap-4 md:gap-6 text-[11px] md:text-xs uppercase tracking-[0.22em]">
        <div v-if="project.location">
          <dt class="text-white/40 mb-2">{{ i18nT('project.location') }}</dt>
          <dd class="text-white/85">{{ t(project.location) }}</dd>
        </div>
        <div v-if="project.year">
          <dt class="text-white/40 mb-2">{{ i18nT('project.year') }}</dt>
          <dd class="text-white/85 font-mono">{{ project.year }}</dd>
        </div>
        <div v-if="project.category">
          <dt class="text-white/40 mb-2">{{ i18nT('project.type') }}</dt>
          <dd class="text-white/85">{{ t(project.category.name) }}</dd>
        </div>
      </dl>
    </div>

    <!-- Showcase / Grid: compact metadata -->
    <div
      v-else
      class="mt-5 flex items-baseline justify-between gap-6"
    >
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
      <span
        v-if="project.category"
        class="text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] whitespace-nowrap"
      >
        {{ t(project.category.name) }}
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.project-card--featured {
  /* Slight inset so featured cards feel distinct from regular grid items */
}
</style>
