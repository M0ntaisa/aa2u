<script setup lang="ts">
const { locale, setLocale, t } = useI18n()
const localePath = useLocalePath()
const otherLocale = computed(() => (locale.value === 'id' ? 'en' : 'id'))
</script>

<template>
  <div class="min-h-screen">
    <header class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 mix-blend-difference">
      <NuxtLink :to="localePath('/')" class="text-sm font-display tracking-wide">
        AA2U
      </NuxtLink>
      <nav class="flex items-center gap-6 text-sm">
        <NuxtLink :to="localePath('/work')" class="link-hover">{{ t('nav.work') }}</NuxtLink>
        <NuxtLink :to="localePath('/about')" class="link-hover">{{ t('nav.about') }}</NuxtLink>
        <NuxtLink :to="localePath('/contact')" class="link-hover">{{ t('nav.contact') }}</NuxtLink>
        <button
          class="link-hover ml-4 text-xs uppercase tracking-wider"
          :data-cursor-label="otherLocale.toUpperCase()"
          @click="setLocale(otherLocale)"
        >
          {{ otherLocale.toUpperCase() }}
        </button>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer class="px-6 py-12 border-t border-white/10 mt-32 text-sm text-[var(--color-muted)]">
      <div class="flex justify-between">
        <span>&copy; {{ new Date().getFullYear() }} AA2U</span>
        <span>{{ t('footer.tagline') }}</span>
      </div>
    </footer>
  </div>
</template>
