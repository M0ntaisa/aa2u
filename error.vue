<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ htmlAttrs: { lang: locale } })

const is404 = computed(() => props.error?.statusCode === 404)
const codeLabel = computed(() => String(props.error?.statusCode ?? '500'))

const headingKey = computed(() => is404.value ? 'error.404_heading' : 'error.500_heading')
const bodyKey = computed(() => is404.value ? 'error.404_body' : 'error.500_body')

function handleRetry() {
  clearError({ redirect: localePath('/') })
}

const numberRef = ref<HTMLElement | null>(null)

onMounted(async () => {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const { $gsap } = useNuxtApp() as any
  if (!$gsap || !numberRef.value) return
  $gsap.from(numberRef.value, {
    yPercent: 100,
    opacity: 0,
    duration: 1.1,
    ease: 'power3.out',
  })
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
    <header class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 mix-blend-difference">
      <NuxtLink :to="localePath('/')" class="text-sm font-display tracking-wide">
        AA2U
      </NuxtLink>
      <nav class="text-sm">
        <NuxtLink :to="localePath('/work')" class="link-hover">{{ t('nav.work') }}</NuxtLink>
      </nav>
    </header>

    <main class="flex-1 flex items-center px-6">
      <div class="grid md:grid-cols-12 gap-6 w-full max-w-7xl mx-auto">
        <div class="md:col-span-12 overflow-hidden">
          <div ref="numberRef" class="font-display text-[28vw] md:text-[20vw] leading-[0.85] tracking-tighter">
            {{ codeLabel }}
          </div>
        </div>

        <div class="md:col-span-3 mt-6 text-xs uppercase tracking-[0.25em] text-[var(--color-muted)]">
          {{ t('error.code') }} {{ codeLabel }}
        </div>

        <div class="md:col-span-9 mt-6 max-w-2xl">
          <h1 class="font-display text-3xl md:text-5xl tracking-tight">
            {{ t(headingKey) }}
          </h1>
          <p class="mt-6 text-base md:text-lg text-[var(--color-muted)] leading-relaxed">
            {{ t(bodyKey) }}
          </p>

          <div class="mt-10 flex flex-wrap gap-3">
            <NuxtLink
              :to="localePath('/')"
              class="text-xs uppercase tracking-[0.25em] border border-white/40 hover:border-white px-5 py-3 transition-colors"
              @click="clearError"
            >
              {{ t('error.back_home') }}
            </NuxtLink>
            <NuxtLink
              :to="localePath('/work')"
              class="text-xs uppercase tracking-[0.25em] border border-white/20 hover:border-white/60 px-5 py-3 transition-colors"
              @click="clearError"
            >
              {{ t('error.see_work') }}
            </NuxtLink>
            <button
              v-if="!is404"
              type="button"
              class="text-xs uppercase tracking-[0.25em] border border-white/20 hover:border-white/60 px-5 py-3 transition-colors"
              @click="handleRetry"
            >
              {{ t('error.retry') }}
            </button>
          </div>
        </div>
      </div>
    </main>

    <footer class="px-6 py-8 border-t border-white/10 text-xs text-[var(--color-muted)]">
      <div class="flex justify-between">
        <span>&copy; {{ new Date().getFullYear() }} AA2U</span>
        <span>{{ t('footer.tagline') }}</span>
      </div>
    </footer>
  </div>
</template>
