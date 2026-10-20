<script setup lang="ts">
import type { Project } from '~/types/content'
import { DEFAULT_WORK_VIEW, parseWorkView, type WorkItem, type WorkView } from '~/utils/work-views'

const { t } = useI18n()
const tt = useT()
const route = useRoute()
const router = useRouter()

const { data: projects, pending, error, refresh } = await useProjects()

useSiteSeo({
  title: () => `${t('nav.work')} — AA2U`,
  description: () => t('work.description'),
  image: () => projects.value?.[0]?.cover_image,
})

// ---- View + filter state (synced with the URL query so it is shareable) ----
// view=index is the default and is omitted from the URL.
const searchQuery      = ref(String(route.query.q    ?? ''))
const selectedCategory = ref(String(route.query.cat  ?? ''))
const selectedYear     = ref(String(route.query.year ?? ''))
const view             = ref<WorkView>(parseWorkView(route.query.view))

const MANAGED = ['q', 'cat', 'year', 'view']

watch([searchQuery, selectedCategory, selectedYear, view], () => {
  const q: Record<string, any> = {}
  for (const [k, v] of Object.entries(route.query)) if (!MANAGED.includes(k)) q[k] = v
  if (searchQuery.value)      q.q = searchQuery.value
  if (selectedCategory.value) q.cat = selectedCategory.value
  if (selectedYear.value)     q.year = selectedYear.value
  if (view.value !== DEFAULT_WORK_VIEW) q.view = view.value
  router.replace({ query: q })
})

// Same page, new query (e.g. a link to /work?view=map): follow it.
watch(() => route.query, (rq) => {
  const nq = String(rq.q ?? ''), nc = String(rq.cat ?? ''), ny = String(rq.year ?? '')
  const nv = parseWorkView(rq.view)
  if (searchQuery.value !== nq) searchQuery.value = nq
  if (selectedCategory.value !== nc) selectedCategory.value = nc
  if (selectedYear.value !== ny) selectedYear.value = ny
  if (view.value !== nv) view.value = nv
})

// ---- Filtering (one list feeds all three views) ----
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

// Stable numbering: position in the full list, so filtering never renumbers.
const numberOf = computed(() => {
  const m = new Map<string, string>()
  ;(projects.value ?? []).forEach((p, i) => m.set(p.slug, String(i + 1).padStart(2, '0')))
  return m
})

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

const items = computed<WorkItem[]>(() =>
  filteredProjects.value.map(p => ({ project: p, no: numberOf.value.get(p.slug) ?? '' })),
)

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

/** "Residential · 2019 · villa" for the empty state (the message quotes it). */
const filterSummary = computed(() => {
  const parts: string[] = []
  if (selectedCategory.value) {
    const cat = (projects.value ?? []).find(p => p.category?.slug === selectedCategory.value)?.category
    parts.push(cat ? tt(cat.name) : selectedCategory.value)
  }
  if (selectedYear.value) parts.push(selectedYear.value)
  if (searchQuery.value) parts.push(searchQuery.value)
  return parts.join(' · ')
})

const resultAnnouncement = computed(() =>
  t('work.result_count', { n: totalFiltered.value }, totalFiltered.value),
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

const showSkeleton = computed(() => pending.value && !projects.value?.length)
const showError = computed(() => !!error.value && !projects.value?.length)

// Refresh ScrollTrigger after the list or the view changes (lengths change).
watch([filteredProjects, view], async () => {
  await nextTick()
  if (import.meta.client) {
    const { $ScrollTrigger } = useNuxtApp() as any
    $ScrollTrigger?.refresh()
  }
})
</script>

<template>
  <section class="work-page sheet-wrap pt-32 pb-24">
    <!-- Header -->
    <header class="work-header">
      <SheetRuler sheet="A-02" :label="t('work.eyebrow')" class="mb-6" />

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
        <h1 v-reveal="{ lines: true }" class="lg:col-span-8 font-display tracking-tight leading-[0.92] text-5xl md:text-7xl lg:text-8xl max-w-4xl">
          {{ t('work.heading') }}
        </h1>

        <div class="lg:col-span-4 flex flex-col gap-5 lg:items-end">
          <div class="space-y-2 mono-s text-fg-2 lg:text-right">
            <div>
              <span class="text-muted">{{ t('work.index_label') }}</span>
              <span class="text-white ml-2">{{ totalLabel }}</span>
              <span class="text-muted"> / {{ String(totalAll).padStart(2, '0') }}</span>
            </div>
            <div v-if="yearRange">
              <span class="text-muted">{{ t('work.years_label') }}</span>
              <span class="text-white ml-2">{{ yearRange }}</span>
            </div>
          </div>
          <WorkViewSwitch v-model="view" />
        </div>
      </div>
    </header>

    <!-- Filter bar -->
    <div class="work-filter mt-14 md:mt-20 border-y border-line py-5 md:py-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        <!-- Search input -->
        <div class="lg:col-span-4 flex items-center gap-3 border-b border-line-strong pb-2 focus-within:border-white transition-colors duration-[var(--d-2)]">
          <svg class="w-4 h-4 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" stroke-linecap="round" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="t('work.search_placeholder')"
            class="flex-1 min-w-0 bg-transparent text-sm md:text-base placeholder:text-muted focus:outline-none"
            :aria-label="t('work.search_placeholder')"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="text-muted hover:text-white text-sm transition-colors min-w-6 min-h-6"
            :aria-label="t('work.clear')"
            @click="searchQuery = ''"
          >×</button>
        </div>

        <!-- Category chips -->
        <div
          class="lg:col-span-8 flex flex-wrap items-center justify-start lg:justify-end gap-x-5 gap-y-1 mono-s"
          role="group"
          :aria-label="t('work.filter_category')"
        >
          <button
            type="button"
            class="chip"
            :class="{ 'is-active': !selectedCategory }"
            :aria-pressed="!selectedCategory"
            @click="selectedCategory = ''"
          >
            <span class="paren paren-l" aria-hidden="true">(</span>
            <span>{{ t('work.all') }}</span>
            <span class="paren paren-r" aria-hidden="true">)</span>
          </button>
          <button
            v-for="c in categoryChips"
            :key="c.slug"
            type="button"
            class="chip"
            :class="{ 'is-active': selectedCategory === c.slug }"
            :aria-pressed="selectedCategory === c.slug"
            @click="toggleCategory(c.slug)"
          >
            <span class="paren paren-l" aria-hidden="true">(</span>
            <span>{{ c.label }}</span>
            <span class="paren paren-r" aria-hidden="true">)</span>
            <span class="ml-1.5 text-muted">{{ String(c.count).padStart(2, '0') }}</span>
          </button>
        </div>
      </div>

      <!-- Year sub-row -->
      <div
        v-if="showYearFilter"
        class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 mono-s"
        role="group"
        :aria-label="t('work.filter_year')"
      >
        <span class="text-muted mr-1" aria-hidden="true">{{ t('work.year') }}</span>
        <button
          type="button"
          class="chip chip--small"
          :class="{ 'is-active': !selectedYear }"
          :aria-pressed="!selectedYear"
          @click="selectedYear = ''"
        >
          <span>{{ t('work.all') }}</span>
        </button>
        <button
          v-for="y in yearChips"
          :key="y"
          type="button"
          class="chip chip--small"
          :class="{ 'is-active': selectedYear === String(y) }"
          :aria-pressed="selectedYear === String(y)"
          @click="toggleYear(y)"
        >{{ y }}</button>
      </div>
    </div>

    <!-- Result count for assistive tech (polite; updates on filter change). -->
    <p class="sr-only" aria-live="polite" aria-atomic="true">
      <template v-if="!showSkeleton && !showError">{{ resultAnnouncement }}</template>
    </p>

    <!-- Active filter state -->
    <div
      v-if="hasActiveFilter"
      class="mt-4 flex items-center justify-between gap-4 mono-s text-fg-2"
    >
      <span>
        {{ t('work.showing') }}
        <span class="text-white">{{ totalLabel }}</span>
        {{ t('work.of') }}
        <span>{{ String(totalAll).padStart(2, '0') }}</span>
      </span>
      <button
        type="button"
        class="text-fg-2 hover:text-white transition-colors underline-offset-4 hover:underline min-h-11"
        @click="clearFilters"
      >{{ t('work.clear_filters') }}</button>
    </div>

    <div class="mt-12 md:mt-16">
      <!-- Loading -->
      <div v-if="showSkeleton" aria-busy="true" :aria-label="t('work.loading')">
        <div v-if="view === 'index'" class="space-y-0">
          <div v-for="i in 6" :key="i" class="h-14 border-b border-line flex items-center gap-6">
            <div class="h-3 w-8 bg-white/[0.04] skeleton-pulse" />
            <div class="h-4 w-1/3 bg-white/[0.06] skeleton-pulse" />
            <div class="h-3 w-1/6 bg-white/[0.04] skeleton-pulse hidden md:block" />
          </div>
        </div>
        <div v-else-if="view === 'map'" class="hatch aspect-[940/360] border border-line" />
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-12">
          <div v-for="i in 4" :key="i" :class="i % 2 ? 'lg:col-span-7' : 'lg:col-span-5'">
            <ProjectCardSkeleton variant="grid" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="showError" class="py-24 text-center" role="alert">
        <p class="text-2xl md:text-3xl font-display text-fg-2">{{ t('work.error') }}</p>
        <button
          type="button"
          class="mt-6 mono-s text-fg-2 hover:text-white underline underline-offset-4 transition-colors min-h-11"
          @click="refresh()"
        >{{ t('work.retry') }}</button>
      </div>

      <!-- Empty (every view) -->
      <div v-else-if="items.length === 0" class="py-24 text-center">
        <p class="text-2xl md:text-3xl font-display text-fg-2">
          {{ hasActiveFilter ? t('work.no_match', { filters: filterSummary }) : t('work.empty') }}
        </p>
        <button
          v-if="hasActiveFilter"
          type="button"
          class="mt-6 mono-s text-fg-2 hover:text-white underline underline-offset-4 transition-colors min-h-11"
          @click="clearFilters"
        >{{ t('work.clear_filters') }}</button>
      </div>

      <WorkIndexTable v-else-if="view === 'index'" :items="items" />
      <WorkAtlas v-else-if="view === 'atlas'" :items="items" />
      <!-- Lazy: the map + its ~29 kB outline only ship when the view is used. -->
      <LazyWorkMap v-else :items="items" />
    </div>
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
  min-height: 2.25rem;
  color: var(--color-fg-2);
  transition: color var(--d-1) var(--ease-draft);
  padding: 0.25rem 0;
}
.chip:hover { color: #fff; }
.chip.is-active { color: #fff; }
.chip--small { padding: 0.15rem 0; }
@media (pointer: coarse) {
  .chip { min-height: 44px; }
}

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
</style>
