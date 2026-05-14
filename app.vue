<script setup lang="ts">
const { locale, t } = useI18n()
const i18nHead = useLocaleHead({ seo: true, dir: false })
const config = useRuntimeConfig()
const siteUrl = (config.public as any).siteUrl as string

const websiteJsonLd = computed(() => JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: t('home.studio_name'),
  url: siteUrl,
  inLanguage: locale.value === 'id' ? 'id-ID' : 'en-US',
  description: t('home.seo_description'),
}))

// Inline script that runs BEFORE first paint so:
//   - cursor-hidden is set early to prevent native-cursor flash
//   - no-intro is set early for returning users / reduced-motion so the
//     IntroCurtain (SSR-rendered visible by default) is hidden without flash
const earlyBootstrap = `
(function(){
  try {
    var doc = document.documentElement;
    var hover = window.matchMedia('(hover: hover)').matches;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (hover && !reduce) doc.classList.add('cursor-hidden');
    var played = false;
    try { played = !!sessionStorage.getItem('aa2u:intro-played'); } catch (e) {}
    if (played || reduce) doc.classList.add('no-intro');
  } catch (e) {}
})();
`

useHead({
  htmlAttrs: {
    lang: () => i18nHead.value.htmlAttrs?.lang ?? locale.value,
  },
  link: () => i18nHead.value.link ?? [],
  meta: () => i18nHead.value.meta ?? [],
  script: [
    { innerHTML: earlyBootstrap, tagPosition: 'head' },
    {
      type: 'application/ld+json',
      innerHTML: () => websiteJsonLd.value,
    },
  ],
})

const { onLeave, onEnter } = usePageTransition()
</script>

<template>
  <NuxtLoadingIndicator color="#ffffff" :height="2" />

  <NuxtLayout>
    <NuxtPage
      :transition="{
        mode: 'out-in',
        css: false,
        onLeave,
        onEnter,
      }"
    />
  </NuxtLayout>

  <ClientOnly>
    <CustomCursor />
  </ClientOnly>
</template>
