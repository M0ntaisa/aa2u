<script setup lang="ts">
const { locale, t } = useI18n()
const i18nHead = useLocaleHead({ seo: true, dir: false })
const config = useRuntimeConfig()
const siteUrl = (config.public as any).siteUrl as string

// The admin panel opts out of the site's showpiece behaviours: the crosshair
// overlay is noise in a data-entry UI and the long page transition makes
// navigation feel sluggish when you're just editing rows.
const route = useRoute()
const isAdmin = computed(() => isAdminPath(route.path))

const websiteJsonLd = computed(() => jsonLd({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: t('home.studio_name'),
  url: siteUrl,
  inLanguage: locale.value === 'id' ? 'id-ID' : 'en-US',
  description: t('home.seo_description'),
}))

// Inline script that runs BEFORE first paint so no-intro is set early for
// returning users / reduced-motion and the IntroCurtain (SSR-rendered
// visible by default) is hidden without a flash. The native cursor is never
// hidden any more, so there is no cursor bootstrap.
const earlyBootstrap = `
(function(){
  try {
    var doc = document.documentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var played = false;
    try { played = !!sessionStorage.getItem('aa2u:intro-played'); } catch (e) {}
    if (played || reduce) doc.classList.add('no-intro');
  } catch (e) {}
})();
`

useHead({
  htmlAttrs: {
    lang: () => i18nHead.value.htmlAttrs?.lang ?? locale.value,
    class: () => (isAdmin.value ? 'admin-area' : ''),
  },
  link: () => i18nHead.value.link ?? [],
  meta: () => i18nHead.value.meta ?? [],
  // Without JS the curtain would never lift; hide it outright.
  noscript: [
    { innerHTML: '<style>.intro-curtain{display:none!important}</style>', tagPosition: 'head' },
  ],
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
    <CrosshairCursor v-if="!isAdmin" />
  </ClientOnly>
</template>
