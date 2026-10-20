<script setup lang="ts">
import type { Project } from '~/types/content'

const props = defineProps<{
  project: Project
  index?: number
  /** Stable display number ("03"); overrides index + 1. */
  no?: string
  variant?: 'showcase' | 'grid' | 'featured' | 'atlas'
}>()

const t = useT()
const { t: i18nT } = useI18n()
const localePath = useLocalePath()
const { capture } = useSharedFlip()

const imgRef = ref<HTMLElement | null>(null)
const flipId = computed(() => `project-cover-${props.project.slug}`)
const cursorLabel = computed(() => i18nT('cursor.open'))
const imgFailed = ref(false)

const numberLabel = computed(() =>
  props.no ?? (props.index !== undefined ? String(props.index + 1).padStart(2, '0') : ''),
)

const atlasLine = computed(() => {
  const parts = [
    props.project.location ? t(props.project.location) : '',
    props.project.year ? String(props.project.year) : '',
  ].filter(Boolean)
  return [numberLabel.value, parts.join(' / ')].filter(Boolean).join(' — ')
})

// Shared-element flip into the dossier cover. Plain left clicks only:
// ctrl/cmd/shift/alt-clicks open elsewhere and this page stays.
function onCardClick(e: MouseEvent) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
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
      v-cut
      :data-flip-id="flipId"
      class="card-media relative overflow-hidden hatch"
      :class="[
        variant === 'showcase'
          ? 'aspect-[4/3] md:h-[60vh] md:w-auto md:aspect-[4/3]'
          : variant === 'featured'
            ? 'aspect-[16/9] md:aspect-[21/9]'
            : 'aspect-[4/3]',
      ]"
    >
      <!-- @nuxt/image `sizes` is screen-prefixed (sm:/md:/…); native media
           strings produce a 1px srcset. -->
      <NuxtImg
        v-if="project.cover_image && !imgFailed"
        :src="project.cover_image"
        :alt="t(project.title)"
        :sizes="
          variant === 'showcase'
            ? 'sm:80vw md:60vw lg:60vw xl:60vw 2xl:60vw'
            : variant === 'featured'
              ? 'sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw'
              : variant === 'atlas'
                ? 'sm:100vw md:50vw lg:60vw xl:60vw 2xl:60vw'
                : 'sm:100vw md:50vw lg:50vw xl:50vw 2xl:50vw'
        "
        :loading="variant === 'showcase' || variant === 'featured' ? 'eager' : 'lazy'"
        format="webp"
        decoding="async"
        class="w-full h-full object-cover"
        @error="imgFailed = true"
      />
      <!-- Drawing tags: solid --bg plates, never text straight on a photo. -->
      <div
        v-if="numberLabel && variant !== 'atlas'"
        class="card-tag absolute top-0 left-0 mono-s"
      >
        {{ numberLabel }}<template v-if="project.year"><span class="text-fg-2 mx-1.5" aria-hidden="true">·</span>{{ project.year }}</template>
      </div>
      <div
        v-if="variant === 'featured' && project.category"
        class="card-tag absolute top-0 right-0 mono-s"
      >
        {{ t(project.category.name) }}
      </div>
      <span class="card-sweep" aria-hidden="true" />
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
          class="mt-3 md:mt-4 text-sm md:text-base text-fg-2 max-w-md line-clamp-2"
        >
          {{ t(project.description) }}
        </p>
      </div>
      <dl class="md:col-span-5 grid grid-cols-3 gap-4 md:gap-6 mono-s">
        <div v-if="project.location">
          <dt class="text-muted mb-2">{{ i18nT('project.location') }}</dt>
          <dd>{{ t(project.location) }}</dd>
        </div>
        <div v-if="project.year">
          <dt class="text-muted mb-2">{{ i18nT('project.year') }}</dt>
          <dd>{{ project.year }}</dd>
        </div>
        <div v-if="project.category">
          <dt class="text-muted mb-2">{{ i18nT('project.type') }}</dt>
          <dd>{{ t(project.category.name) }}</dd>
        </div>
      </dl>
    </div>

    <!-- Atlas: mono line, then the title (identity-dossier §3.5) -->
    <div v-else-if="variant === 'atlas'" class="mt-3">
      <p class="mono-s text-muted">{{ atlasLine }}</p>
      <h3 class="atlas-title mt-1">{{ t(project.title) }}</h3>
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
        <div class="mt-2 mono-s text-muted flex items-center gap-3">
          <span v-if="project.location">{{ t(project.location) }}</span>
          <span v-if="project.location && project.year" aria-hidden="true">/</span>
          <span v-if="project.year">{{ project.year }}</span>
        </div>
      </div>
      <span
        v-if="project.category"
        class="mono-s text-muted whitespace-nowrap"
      >
        {{ t(project.category.name) }}
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.atlas-title {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 500;
  font-size: 1rem;
  line-height: 1.4;
}
.card-tag {
  padding: .375rem .625rem;
  background: var(--color-bg);
  color: var(--color-fg);
}

/* Hover / focus: a section plane sweeps across the image (no zoom, no dim). */
.card-sweep {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: var(--color-fg);
  opacity: 0;
  pointer-events: none;
}
.project-card:hover .card-sweep,
.project-card:focus-visible .card-sweep {
  animation: card-sweep var(--d-3) var(--ease-draft);
}
@keyframes card-sweep {
  0% { left: 0; opacity: 1; }
  99% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .card-sweep { display: none; }
}
</style>
