<script setup lang="ts">
import type { Project } from '~/types/content'

const props = defineProps<{
  studioName: string
  intro?: string
  scrollHint?: string
  projects?: Project[]
}>()

const t = useT()

const headingRef    = ref<HTMLElement | null>(null)
const introRef      = ref<HTMLElement | null>(null)
const scrollHintRef = ref<HTMLElement | null>(null)
const metaRef       = ref<HTMLElement | null>(null)

const currentIdx = ref(0)
const hasProjects = computed(() => (props.projects?.length ?? 0) > 0)
const currentProject = computed(() =>
  hasProjects.value ? props.projects![currentIdx.value] : null,
)
const projectsCount = computed(() => props.projects?.length ?? 0)
const projectIndex = computed(() =>
  String(currentIdx.value + 1).padStart(2, '0'),
)
const totalLabel = computed(() =>
  String(Math.max(projectsCount.value, 1)).padStart(2, '0'),
)

let rotationTimer: ReturnType<typeof setInterval> | null = null

function selectProject(i: number) {
  currentIdx.value = i
  // Reset rotation timer when user manually selects
  if (rotationTimer) {
    clearInterval(rotationTimer)
    startRotation()
  }
}

function startRotation() {
  if (!hasProjects.value || projectsCount.value < 2) return
  if (prefersReducedMotion()) return
  rotationTimer = setInterval(() => {
    currentIdx.value = (currentIdx.value + 1) % projectsCount.value
  }, 6500)
}

onMounted(() => {
  const { $gsap, $SplitText } = useNuxtApp() as any
  if (!$gsap) return

  if (prefersReducedMotion()) {
    if (headingRef.value)    $gsap.set(headingRef.value,    { autoAlpha: 1 })
    if (introRef.value)      $gsap.set(introRef.value,      { autoAlpha: 1, y: 0 })
    if (scrollHintRef.value) $gsap.set(scrollHintRef.value, { autoAlpha: 1 })
    if (metaRef.value)       $gsap.set(metaRef.value,       { autoAlpha: 1 })
    return
  }

  if (headingRef.value)    $gsap.set(headingRef.value,    { autoAlpha: 0 })
  if (introRef.value)      $gsap.set(introRef.value,      { autoAlpha: 0, y: 24 })
  if (scrollHintRef.value) $gsap.set(scrollHintRef.value, { autoAlpha: 0 })
  if (metaRef.value)       $gsap.set(metaRef.value,       { autoAlpha: 0, y: 16 })

  const ctx = $gsap.context(() => {
    const tl = $gsap.timeline({ defaults: { ease: 'power3.out' } })

    if (headingRef.value && $SplitText) {
      const split = new $SplitText(headingRef.value, {
        type: 'lines,words',
        linesClass: 'overflow-hidden inline-block',
      })
      $gsap.set(split.words, { yPercent: 110, opacity: 0 })
      tl.set(headingRef.value, { autoAlpha: 1 })
        .to(split.words, {
          yPercent: 0,
          opacity: 1,
          stagger: 0.04,
          duration: 1.2,
        })
    } else if (headingRef.value) {
      tl.to(headingRef.value, { autoAlpha: 1, duration: 0.8 })
    }

    if (introRef.value) {
      tl.to(introRef.value, { autoAlpha: 1, y: 0, duration: 1 }, '-=0.7')
    }
    if (metaRef.value) {
      tl.to(metaRef.value, { autoAlpha: 1, y: 0, duration: 0.9 }, '-=0.8')
    }
    if (scrollHintRef.value) {
      tl.to(scrollHintRef.value, { autoAlpha: 1, duration: 0.6 }, '-=0.4')
    }
  })

  startRotation()

  onBeforeUnmount(() => {
    ctx.revert()
    if (rotationTimer) clearInterval(rotationTimer)
  })
})
</script>

<template>
  <section class="hero relative min-h-screen overflow-hidden">
    <!-- Backdrop: rotating featured project images -->
    <div v-if="hasProjects" class="hero-backdrop absolute inset-0">
      <div
        v-for="(p, i) in projects"
        :key="p.slug"
        class="hero-img-wrap absolute inset-0"
        :class="{ 'is-active': i === currentIdx }"
        aria-hidden="true"
      >
        <NuxtImg
          :src="p.cover_image"
          :alt="t(p.title)"
          sizes="100vw"
          format="webp"
          :loading="i === 0 ? 'eager' : 'lazy'"
          :preload="i === 0"
          class="hero-img w-full h-full object-cover"
        />
      </div>
      <div class="hero-vignette absolute inset-0 pointer-events-none" />
      <div class="hero-fade absolute inset-0 pointer-events-none" />
    </div>

    <!-- Content (no z-index so mix-blend-difference on title can reach backdrop) -->
    <div class="relative flex flex-col min-h-screen px-6 pt-32 pb-16 md:pb-20">
      <div class="flex-1" />

      <h1
        ref="headingRef"
        style="visibility: hidden;"
        class="hero-title font-display uppercase tracking-tight leading-[0.82] text-[clamp(3.5rem,14vw,15rem)]"
      >
        {{ studioName }}
      </h1>

      <div class="mt-10 md:mt-14 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-end">
        <p
          v-if="intro"
          ref="introRef"
          style="visibility: hidden;"
          class="md:col-span-6 max-w-xl text-base md:text-lg text-white/75 leading-relaxed"
        >
          {{ intro }}
        </p>
        <div v-else class="md:col-span-6" />

        <div
          v-if="hasProjects"
          ref="metaRef"
          style="visibility: hidden;"
          class="md:col-span-6 md:col-start-9 md:text-right"
        >
          <div class="text-[10px] uppercase tracking-[0.3em] text-white/55 mb-3">
            Now featuring
          </div>

          <Transition name="meta" mode="out-in">
            <div
              :key="currentProject!.slug"
              class="flex flex-col md:items-end"
            >
              <span class="font-display text-xl md:text-2xl tracking-tight">
                {{ t(currentProject!.title) }}
              </span>
              <span class="text-[11px] uppercase tracking-[0.22em] text-white/65 mt-1.5">
                <template v-if="currentProject!.location">
                  {{ t(currentProject!.location) }}
                  <span class="opacity-40 mx-1.5">·</span>
                </template>
                <template v-if="currentProject!.year">
                  {{ currentProject!.year }}
                </template>
                <template v-if="currentProject!.category">
                  <span class="opacity-40 mx-1.5">·</span>
                  {{ t(currentProject!.category.name) }}
                </template>
              </span>
            </div>
          </Transition>

          <div class="mt-5 flex md:justify-end items-center gap-3">
            <div class="flex items-center gap-2">
              <button
                v-for="(p, i) in projects"
                :key="p.slug"
                class="dot-btn"
                :class="{ 'is-active': i === currentIdx }"
                :aria-label="`Show project ${i + 1}`"
                :aria-current="i === currentIdx ? 'true' : undefined"
                @click="selectProject(i)"
              />
            </div>
            <span class="font-mono text-[10px] text-white/45 tabular-nums ml-2">
              <span class="text-white">{{ projectIndex }}</span>
              <span class="opacity-50"> / {{ totalLabel }}</span>
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="scrollHint"
        ref="scrollHintRef"
        style="visibility: hidden;"
        class="mt-12 md:mt-16 flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-white/55"
      >
        <span class="inline-block w-8 h-px bg-current" />
        {{ scrollHint }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-title {
  mix-blend-mode: difference;
  color: #fff;
}

.hero-backdrop {
  background: #0e0f17;
}

.hero-img-wrap {
  opacity: 0;
  transition: opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.hero-img-wrap.is-active {
  opacity: 1;
}

.hero-img {
  filter: grayscale(0.7) contrast(1.05) brightness(0.58);
  transform: scale(1.04);
  transition: transform 8s ease-out;
}
.hero-img-wrap.is-active .hero-img {
  transform: scale(1);
}

.hero-vignette {
  background: radial-gradient(
    ellipse at center,
    transparent 30%,
    rgba(26, 27, 38, 0.35) 70%,
    rgba(26, 27, 38, 0.85) 100%
  );
}

.hero-fade {
  background: linear-gradient(
    to bottom,
    rgba(26, 27, 38, 0.55) 0%,
    rgba(26, 27, 38, 0.1) 28%,
    rgba(26, 27, 38, 0.35) 65%,
    rgba(26, 27, 38, 0.95) 100%
  );
}

.dot-btn {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.25);
  transition:
    background-color 0.3s ease,
    width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.dot-btn:hover {
  background: rgba(255, 255, 255, 0.6);
}
.dot-btn.is-active {
  background: var(--color-accent, #c0caf5);
  width: 22px;
}

.meta-enter-active,
.meta-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.meta-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.meta-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (prefers-reduced-motion: reduce) {
  .hero-img-wrap,
  .hero-img,
  .meta-enter-active,
  .meta-leave-active {
    transition: none !important;
  }
  .hero-img {
    transform: none !important;
  }
}
</style>
