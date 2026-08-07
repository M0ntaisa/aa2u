<script setup lang="ts">
/**
 * Augmented architectural header — two-row bar (meta + nav) with live
 * Jakarta time, active-section parens, and a page index counter.
 * Collapses to a single bar + slide-down drawer on mobile.
 */

const { locale, setLocale, t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const time = ref('')
const city = ref('')
const gmt = ref('')
let userTz = 'Asia/Jakarta'
let timer: ReturnType<typeof setInterval> | null = null

function detectLocation() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) userTz = tz
    const last = userTz.split('/').pop() ?? userTz
    city.value = last.replace(/_/g, ' ')

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    gmt.value = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    city.value = 'Jakarta'
    gmt.value = 'GMT+7'
  }
}

function updateTime() {
  time.value = new Intl.DateTimeFormat('en-GB', {
    timeZone: userTz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
}

onMounted(() => {
  detectLocation()
  updateTime()
  timer = setInterval(updateTime, 30_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
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
const projectLabel = computed(() => {
  const slug = String(route.params.slug ?? '')
  return slug.replace(/-/g, ' ')
})

const langs = ['id', 'en'] as const

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
    <div class="site-header__inner mix-blend-difference text-white">
      <!-- DESKTOP: meta row -->
      <div class="hidden md:flex items-end justify-between px-6 pt-4 pb-2 text-[10px] uppercase tracking-[0.22em] leading-none">
        <div class="font-display tracking-wider">
          AA2U <span class="opacity-40 mx-0.5">·</span>
          <span class="opacity-70">{{ t('nav.studio') }}</span>
        </div>

        <div class="flex items-center gap-2.5 text-white/75">
          <template v-if="isProjectDetail">
            <span class="opacity-50">{{ t('nav.viewing') }} /</span>
            <span class="text-white tracking-[0.18em]">{{ projectLabel }}</span>
          </template>
          <template v-else>
            <span class="opacity-70">{{ city || '—' }}</span>
            <span class="opacity-30">·</span>
            <span class="font-mono tabular-nums text-white">{{ time || '--:--' }}</span>
            <span class="opacity-50">{{ gmt }}</span>
          </template>
        </div>

        <div class="flex items-center gap-2">
          <template v-for="(l, i) in langs" :key="l">
            <span v-if="i > 0" class="opacity-30">·</span>
            <button
              class="lang-btn"
              :class="locale === l ? 'text-white' : 'text-white/40 hover:text-white/70'"
              :aria-label="`Switch to ${l === 'en' ? 'English' : 'Bahasa Indonesia'}`"
              :aria-current="locale === l ? 'true' : undefined"
              @click="setLocale(l)"
            >
              {{ l.toUpperCase() }}
            </button>
          </template>
        </div>
      </div>

      <!-- DESKTOP: divider -->
      <div class="hidden md:block h-px bg-white/15 mx-6" />

      <!-- DESKTOP: nav row -->
      <div class="hidden md:flex items-center justify-between px-6 py-3 text-[12px] uppercase tracking-[0.18em]">
        <div class="font-mono text-white/45 w-16">{{ t('nav.index') }}</div>

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

        <div class="font-mono tabular-nums text-right w-16">
          <span class="text-white">{{ activePage?.index ?? '—' }}</span>
          <span class="opacity-45"> / 0{{ total }}</span>
        </div>
      </div>

      <!-- MOBILE: single bar -->
      <div class="md:hidden flex items-center justify-between px-5 h-14 text-[11px] uppercase tracking-[0.2em]">
        <NuxtLink :to="localePath('/')" class="font-display text-sm tracking-wider">
          AA2U
        </NuxtLink>
        <span class="font-mono tabular-nums text-white/65">{{ time || '--:--' }}</span>
        <button
          class="flex items-center gap-1.5"
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

    <!-- MOBILE: drawer (outside mix-blend wrapper so bg renders normally) -->
    <Transition name="drawer">
      <div
        v-if="menuOpen"
        class="md:hidden fixed top-14 left-0 right-0 bottom-0 z-40 bg-[var(--color-bg)] text-white"
        @click.self="closeMenu"
      >
        <div class="px-5 py-10 flex flex-col gap-8">
          <NuxtLink
            v-for="(p, i) in pages.slice(1)"
            :key="p.key"
            :to="localePath(p.path)"
            class="drawer-link flex items-baseline justify-between font-display"
            :class="activePage?.key === p.key ? 'text-white' : 'text-white/55'"
            @click="closeMenu"
          >
            <span class="text-4xl">{{ t(`nav.${p.key}`) }}</span>
            <span class="text-[10px] tracking-[0.3em] text-white/45 font-mono">0{{ i + 2 }}</span>
          </NuxtLink>

          <div class="mt-4 pt-6 border-t border-white/10 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/55">
            <span>{{ city || '—' }} · <span class="font-mono tabular-nums text-white/80">{{ time }}</span></span>
            <div class="flex gap-2">
              <template v-for="(l, i) in langs" :key="l">
                <span v-if="i > 0" class="opacity-30">·</span>
                <button
                  :class="locale === l ? 'text-white' : 'text-white/45'"
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

.lang-btn {
  position: relative;
  transition: color 0.25s ease;
  letter-spacing: 0.22em;
}

.nav-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.65);
  transition: color 0.3s ease;
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
