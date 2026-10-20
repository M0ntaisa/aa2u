<script setup lang="ts">
import type { Project } from '~/types/content'

/**
 * Augmented architectural header — two-row bar (meta + nav) with live
 * Jakarta time (signal-orange "live" dot), active-section parens, and a
 * page index counter. Metadata is set in the mono. Collapses to a single
 * bar + slide-down drawer on mobile.
 *
 * Sits over the true-colour hero on a top scrim (no blend modes, so text
 * contrast is predictable); turns solid --bg with a hairline once scrolled.
 */

const { locale, setLocale, t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

// The clock always shows studio time (Jakarta), not the visitor's own zone.
const studioCity = 'Jakarta'

const time = ref('')
const solid = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

function updateTime() {
  time.value = studioTime()
}
function onScroll() {
  solid.value = window.scrollY > 24
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 30_000)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('scroll', onScroll)
})

const pages = [
  { key: 'home', path: '/', index: '01' },
  { key: 'work', path: '/work', index: '02' },
  { key: 'about', path: '/about', index: '03' },
  { key: 'contact', path: '/contact', index: '04' },
] as const
const total = pages.length

const strippedPath = computed(() => {
  const p = route.path.replace(/^\/(id|en)(?=\/|$)/, '') || '/'
  return p === '' ? '/' : p
})

const activePage = computed(() => {
  const p = strippedPath.value
  if (p === '/') return pages[0]
  if (p.startsWith('/work')) return pages[1]
  if (p.startsWith('/about')) return pages[2]
  if (p.startsWith('/contact')) return pages[3]
  return null
})

const isProjectDetail = computed(() => /^\/work\/.+/.test(strippedPath.value))
// Read the title from the page's cached useProject payload (same key) rather
// than fetching again; fall back to the prettified slug until it's there.
// Only switch after mount so SSR and hydration render the same text.
const nuxtApp = useNuxtApp()
const tt = useT()
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const projectLabel = computed(() => {
  const slug = String(route.params.slug ?? '')
  const cached = mounted.value
    ? (nuxtApp.payload.data[`project:${slug}`] as Project | null | undefined)
    : null
  return tt(cached?.title) || slug.replace(/-/g, ' ')
})

const langs = ['id', 'en'] as const
const langNames = { id: 'Bahasa Indonesia', en: 'English' } as const

const menuOpen = ref(false)
function toggleMenu() { menuOpen.value = !menuOpen.value }
function closeMenu() { menuOpen.value = false }

watch(menuOpen, (v) => {
  if (typeof document === 'undefined') return
  document.documentElement.style.overflow = v ? 'hidden' : ''
})

watch(() => route.fullPath, () => closeMenu())
</script>

<template>
  <header class="site-header fixed top-0 left-0 right-0 z-50">
    <div class="site-header__inner text-white" :class="{ 'is-solid': solid || menuOpen }">
      <!-- DESKTOP: meta row -->
      <div class="sheet-wrap hidden md:flex items-end justify-between pt-4 pb-2 mono-s leading-none">
        <NuxtLink :to="localePath('/')" class="font-display text-base font-semibold tracking-wide normal-case">
          AA2U <span class="text-fg-2 font-normal mx-0.5" aria-hidden="true">·</span>
          <span class="mono-s font-normal text-fg-2">{{ t('nav.studio') }}</span>
        </NuxtLink>

        <div class="flex items-center gap-2.5 text-fg-2">
          <template v-if="isProjectDetail">
            <span>{{ t('nav.viewing') }} /</span>
            <span class="text-white">{{ projectLabel }}</span>
          </template>
          <template v-else>
            <span class="live-dot" aria-hidden="true" />
            <span class="sr-only">{{ t('nav.studio_time') }}, {{ studioCity }}:</span>
            <span aria-hidden="true">JKT</span>
            <span class="tabular-nums text-white">{{ time || '--:--' }}</span>
            <span>WIB</span>
          </template>
        </div>

        <div class="flex items-center gap-2">
          <template v-for="(l, i) in langs" :key="l">
            <span v-if="i > 0" class="text-fg-2" aria-hidden="true">/</span>
            <button
              class="lang-btn"
              :class="locale === l ? 'text-white' : 'text-muted hover:text-white'"
              :aria-label="t('nav.switch_to', { lang: langNames[l] })"
              :aria-current="locale === l ? 'true' : undefined"
              @click="setLocale(l)"
            >
              {{ l.toUpperCase() }}
            </button>
          </template>
        </div>
      </div>

      <!-- DESKTOP: divider -->
      <div class="sheet-wrap hidden md:block"><div class="h-px bg-line" /></div>

      <!-- DESKTOP: nav row -->
      <div class="sheet-wrap hidden md:flex items-center justify-between py-3 text-[12px] uppercase tracking-[0.18em]">
        <div class="mono-s text-muted w-16">{{ t('nav.index') }}</div>

        <nav class="flex items-center gap-10">
          <NuxtLink
            v-for="p in pages.slice(1)"
            :key="p.key"
            :to="localePath(p.path)"
            class="nav-item"
          >
            <span class="paren paren-l" aria-hidden="true">(</span>
            <span class="nav-label">{{ t(`nav.${p.key}`) }}</span>
            <span class="paren paren-r" aria-hidden="true">)</span>
          </NuxtLink>
        </nav>

        <div class="mono-s text-right w-16">
          <span class="text-white">{{ activePage?.index ?? '—' }}</span>
          <span class="text-muted"> / 0{{ total }}</span>
        </div>
      </div>

      <!-- MOBILE: single bar -->
      <div class="sheet-wrap md:hidden flex items-center justify-between h-14 mono-s">
        <NuxtLink :to="localePath('/')" class="font-display text-base font-semibold tracking-wide normal-case">
          AA2U
        </NuxtLink>
        <span class="flex items-center gap-2 tabular-nums text-fg-2">
          <span class="live-dot" aria-hidden="true" />
          <span class="sr-only">{{ t('nav.studio_time') }}, {{ studioCity }}: </span>{{ time || '--:--' }} WIB
        </span>
        <button
          class="flex items-center gap-1.5 min-h-11"
          :aria-expanded="menuOpen"
          :aria-label="menuOpen ? t('nav.close') : t('nav.menu')"
          @click="toggleMenu"
        >
          <span>{{ menuOpen ? t('nav.close') : t('nav.menu') }}</span>
          <span class="text-base leading-none w-3 inline-block text-center">
            {{ menuOpen ? '×' : '+' }}
          </span>
        </button>
      </div>
    </div>

    <!-- MOBILE: drawer (sibling of the bar so it can sit full-height below it) -->
    <Transition name="drawer">
      <div
        v-if="menuOpen"
        class="md:hidden fixed top-14 left-0 right-0 bottom-0 z-40 bg-[var(--color-bg)] text-white"
        @click.self="closeMenu"
      >
        <div class="sheet-wrap py-10 flex flex-col gap-8">
          <NuxtLink
            v-for="(p, i) in pages.slice(1)"
            :key="p.key"
            :to="localePath(p.path)"
            class="drawer-link flex items-baseline justify-between font-display"
            :class="activePage?.key === p.key ? 'text-white' : 'text-fg-2'"
            @click="closeMenu"
          >
            <span class="text-4xl">{{ t(`nav.${p.key}`) }}</span>
            <span class="mono-s text-muted">0{{ i + 2 }}</span>
          </NuxtLink>

          <div class="mt-4 pt-6 border-t border-line flex items-center justify-between mono-s text-fg-2">
            <span>{{ t('nav.studio_time') }} · {{ studioCity }} · <span class="tabular-nums text-white">{{ time }}</span></span>
            <div class="flex gap-1">
              <template v-for="(l, i) in langs" :key="l">
                <span v-if="i > 0" class="text-fg-2 self-center" aria-hidden="true">/</span>
                <button
                  class="min-h-11 min-w-11"
                  :class="locale === l ? 'text-white' : 'text-muted'"
                  :aria-label="t('nav.switch_to', { lang: langNames[l] })"
                  :aria-current="locale === l ? 'true' : undefined"
                  @click="setLocale(l)"
                >
                  {{ l.toUpperCase() }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.site-header { pointer-events: none; }
.site-header > * { pointer-events: auto; }

/* Over a photo the bar sits on a near-opaque scrim (≥92% --bg under the
   text, so even --muted keeps 4.5:1 on a white sky), feathering out 32px
   below. Solid --bg with a hairline once the page scrolls. */
.site-header__inner {
  position: relative;
  background: rgba(26, 27, 38, .92);
  transition: background-color var(--d-2) var(--ease-draft), box-shadow var(--d-2) var(--ease-draft);
}
.site-header__inner::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 32px;
  background: linear-gradient(rgba(26, 27, 38, .92), rgba(26, 27, 38, 0));
  pointer-events: none;
  transition: opacity var(--d-2) var(--ease-draft);
}
.site-header__inner.is-solid {
  background: var(--color-bg);
  box-shadow: 0 1px 0 var(--color-line);
}
.site-header__inner.is-solid::after { opacity: 0; }

/* Live studio-clock dot — one of the four signal-orange uses (§1.1.1). */
.live-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--color-signal);
}

.lang-btn {
  position: relative;
  transition: color 0.25s ease;
  letter-spacing: 0.22em;
}

.nav-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--color-fg-2);
  transition: color var(--d-1) var(--ease-draft);
}
.nav-item:hover {
  color: #fff;
}
.nav-item::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right center;
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.nav-item:hover::after,
.nav-item.router-link-active::after {
  transform: scaleX(1);
  transform-origin: left center;
}
.nav-item.router-link-active {
  color: #fff;
}

.paren {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  font-weight: 400;
}
.paren-l { left: -0.85em; }
.paren-r { right: -0.85em; }
.nav-item.router-link-active .paren {
  opacity: 0.85;
}

.nav-label {
  position: relative;
  z-index: 1;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.32s ease, transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
.drawer-link {
  transition: color 0.25s ease, opacity 0.25s ease;
}
.drawer-link:hover { color: #fff; }
</style>
