<script setup lang="ts">
import type { Project } from '~/types/content'

const { t, locale } = useI18n()
const tt = useT()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const { data: projects, pending } = await useProjects()

useSiteSeo({
  title: () => `${t('nav.work')} — AA2U`,
  description: () => t('work.description'),
  image: () => projects.value?.[0]?.cover_image,
})

// ---- Filter state (synced with URL query for shareable filters) ----
const searchQuery     = ref(String(route.query.q    ?? ''))
const selectedCategory = ref(String(route.query.cat  ?? ''))
const selectedYear    = ref(String(route.query.year ?? ''))

// Push state → URL (replace, no scroll jump)
watch([searchQuery, selectedCategory, selectedYear], () => {
  const q: Record<string, string> = {}
  if (searchQuery.value)     q.q = searchQuery.value
  if (selectedCategory.value) q.cat = selectedCategory.value
  if (selectedYear.value)    q.year = selectedYear.value
  router.replace({ query: q })
})

// ---- Filtering ----
function matchesSearch(p: Project, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  const hay = [
    tt(p.title),
    tt(p.location),
    p.category ? tt(p.category.name) : '',
    String(p.year ?? ''),
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

// Project list after search + year (used as base for category counts)
const baseList = computed<Project[]>(() => {
  const list = projects.value ?? []
  return list.filter((p) => {
    if (!matchesSearch(p, searchQuery.value)) return false
    if (selectedYear.value && String(p.year) !== selectedYear.value) return false
    return true
  })
})

// Final filtered list (after category)
const filteredProjects = computed<Project[]>(() => {
  if (!selectedCategory.value) return baseList.value
  return baseList.value.filter((p) => p.category?.slug === selectedCategory.value)
})

// Category chips: derived from base list (excluding category filter itself so counts update)
const categoryChips = computed(() => {
  const map = new Map<string, { slug: string; label: string; count: number }>()
  for (const p of baseList.value) {
    if (!p.category) continue
    const existing = map.get(p.category.slug)
    if (existing) existing.count++
    else
      map.set(p.category.slug, {
        slug: p.category.slug,
        label: tt(p.category.name),
        count: 1,
      })
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
})

// Year chips: all years that exist in any project
const yearChips = computed(() => {
  const set = new Set<number>()
  for (const p of projects.value ?? []) {
    if (p.year) set.add(p.year)
  }
  return Array.from(set).sort((a, b) => b - a)
})

const showYearFilter = computed(() => yearChips.value.length > 1)

const yearRange = computed(() => {
  if (yearChips.value.length === 0) return ''
  if (yearChips.value.length === 1) return String(yearChips.value[0])
  return `${yearChips.value[yearChips.value.length - 1]}–${yearChips.value[0]}`
})

const totalAll = computed(() => projects.value?.length ?? 0)
const totalFiltered = computed(() => filteredProjects.value.length)
const totalLabel = computed(() => String(totalFiltered.value).padStart(2, '0'))

const hasActiveFilter = computed(
  () =>
    !!searchQuery.value || !!selectedCategory.value || !!selectedYear.value,
)

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedYear.value = ''
}

function toggleCategory(slug: string) {
  selectedCategory.value = selectedCategory.value === slug ? '' : slug
}

function toggleYear(year: number) {
  const s = String(year)
  selectedYear.value = selectedYear.value === s ? '' : s
}

// Asymmetric layout helper — every Nth = featured (full-width)
function variantFor(i: number): 'featured' | 'grid' {
  // First card always featured; then every 5th (so featured rows break up
  // pairs of half-width cards).
  if (i === 0) return 'featured'
  return i % 5 === 0 ? 'featured' : 'grid'
}

const showSkeleton = computed(() => pending.value && !projects.value?.length)

// Refresh ScrollTrigger after filter changes (in case lengths change)
watch(filteredProjects, async () => {
  await nextTick()
  if (import.meta.client) {
    const { $ScrollTrigger } = useNuxtApp() as any
    $ScrollTrigger?.refresh()
  }
})
</script>

<template>
  <section class="work-page px-6 md:px-10 pt-32 pb-24">
    <!-- Header -->
    <header class="work-header">
      <div class="flex items-center gap-3 text-[10px] md:text-xs uppercase tracking-[0.32em] text-white/45 mb-6">
        <span class="font-mono">02</span>
        <span class="w-8 h-px bg-current opacity-60" />
        <span>{{ t('work.eyebrow') }}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
        <h1 class="lg:col-span-8 font-display tracking-tight leading-[0.92] text-5xl md:text-7xl lg:text-8xl max-w-4xl">
          {{ t('work.heading') }}
        </h1>

        <div class="lg:col-span-4 lg:text-right space-y-2 text-[11px] uppercase tracking-[0.22em] text-white/55">
          <div>
            <span class="text-white/40">{{ t('work.index_label') }}</span>
            <span class="font-mono text-white ml-2 tabular-nums">{{ totalLabel }}</span>
            <span class="font-mono opacity-50"> / {{ String(totalAll).padStart(2, '0') }}</span>
          </div>
          <div v-if="yearRange">
            <span class="text-white/40">{{ t('work.years_label') }}</span>
            <span class="font-mono text-white/85 ml-2 tabular-nums">{{ yearRange }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Filter bar -->
    <div class="work-filter mt-14 md:mt-20 border-y border-white/10 py-5 md:py-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        <!-- Search input -->
        <div class="lg:col-span-4 flex items-center gap-3 border-b border-white/15 pb-2 focus-within:border-white/55 transition-colors duration-300">
          <svg class="w-4 h-4 text-white/45 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" stroke-linecap="round" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="t('work.search_placeholder')"
            class="flex-1 bg-transparent text-sm md:text-base placeholder:text-white/35 focus:outline-none"
            :aria-label="t('work.search_placeholder')"
          />
          <button
            v-if="searchQuery"
            class="text-white/45 hover:text-white text-sm transition-colors"
            :aria-label="t('work.clear')"
            @click="searchQuery = ''"
          >×</button>
        </div>

        <!-- Category chips -->
        <div class="lg:col-span-8 flex flex-wrap items-center justify-start lg:justify-end gap-x-5 gap-y-2 text-[11px] md:text-xs uppercase tracking-[0.22em]">
          <button
            class="chip"
            :class="{ 'is-active': !selectedCategory }"
            @click="selectedCategory = ''"
          >
            <span class="paren paren-l">(</span>
            <span>{{ t('work.all') }}</span>
            <span class="paren paren-r">)</span>
          </button>
          <button
            v-for="c in categoryChips"
            :key="c.slug"
            class="chip"
            :class="{ 'is-active': selectedCategory === c.slug }"
            @click="toggleCategory(c.slug)"
          >
            <span class="paren paren-l">(</span>
            <span>{{ c.label }}</span>
            <span class="paren paren-r">)</span>
            <span class="font-mono ml-1.5 text-white/35">{{ String(c.count).padStart(2, '0') }}</span>
          </button>
        </div>
      </div>

      <!-- Year sub-row -->
      <div
        v-if="showYearFilter"
        class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] md:text-[11px] uppercase tracking-[0.22em]"
      >
        <span class="text-white/40 mr-1">{{ t('work.year') }}</span>
        <button
          class="chip chip--small"
          :class="{ 'is-active': !selectedYear }"
          @click="selectedYear = ''"
        >
          <span>{{ t('work.all') }}</span>
        </button>
        <button
          v-for="y in yearChips"
          :key="y"
          class="chip chip--small font-mono"
          :class="{ 'is-active': selectedYear === String(y) }"
          @click="toggleYear(y)"
        >{{ y }}</button>
      </div>
    </div>

    <!-- Active filter state -->
    <div
      v-if="hasActiveFilter"
      class="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-white/55"
    >
      <span>
        {{ t('work.showing') }}
        <span class="text-white font-mono">{{ totalLabel }}</span>
        {{ t('work.of') }}
        <span class="font-mono">{{ String(totalAll).padStart(2, '0') }}</span>
      </span>
      <button
        class="text-white/65 hover:text-white transition-colors underline-offset-4 hover:underline"
        @click="clearFilters"
      >{{ t('work.clear_filters') }}</button>
    </div>

    <!-- Skeleton -->
    <div v-if="showSkeleton" class="mt-14 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-16" aria-busy="true">
      <div v-for="i in 4" :key="i" :class="i === 1 ? 'md:col-span-12' : 'md:col-span-6'">
        <ProjectCardSkeleton variant="grid" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredProjects.length === 0"
      class="mt-32 text-center"
    >
      <p class="text-2xl md:text-3xl font-display text-white/70">
        {{ hasActiveFilter ? t('work.no_results') : t('work.empty') }}
      </p>
      <button
        v-if="hasActiveFilter"
        class="mt-6 text-[11px] uppercase tracking-[0.22em] text-white/55 hover:text-white underline underline-offset-4 transition-colors"
        @click="clearFilters"
      >{{ t('work.clear_filters') }}</button>
    </div>

    <!-- Asymmetric varied grid -->
    <TransitionGroup
      v-else
      tag="div"
      name="card"
      class="work-grid mt-14 md:mt-20 grid grid-cols-1 md:grid-cols-12 gap-x-8 lg:gap-x-12 gap-y-16 md:gap-y-24"
    >
      <div
        v-for="(p, i) in filteredProjects"
        :key="p.slug"
        :class="variantFor(i) === 'featured' ? 'md:col-span-12' : 'md:col-span-6'"
      >
        <ProjectCard
          :project="p"
          :index="i"
          :variant="variantFor(i)"
        />
      </div>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.work-page {
  min-height: 60vh;
}

/* Filter chips with parens hover/active style — matches navbar pattern. */
.chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.55);
  transition: color 0.3s ease;
  padding: 0.25rem 0;
}
.chip:hover { color: rgba(255, 255, 255, 0.9); }
.chip.is-active { color: #fff; }
.chip--small { padding: 0.15rem 0; }

.chip .paren {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}
.chip .paren-l { left: -0.7em; }
.chip .paren-r { right: -0.7em; }
.chip.is-active .paren { opacity: 0.85; }

/* TransitionGroup classes for filter shuffling */
.card-move,
.card-enter-active,
.card-leave-active {
  transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.card-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.card-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}
.card-leave-active {
  position: absolute;
  width: calc(100% - 1rem);
}

@media (prefers-reduced-motion: reduce) {
  .card-move,
  .card-enter-active,
  .card-leave-active {
    transition: none !important;
  }
}
</style>
