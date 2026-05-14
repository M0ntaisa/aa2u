import tailwindcss from '@tailwindcss/vite'

// Derive the Supabase Storage host from SUPABASE_URL so NuxtImg can
// optimize uploaded images. Falls back to empty when the placeholder
// URL is still in use.
const supabaseHost = (() => {
  try {
    const url = process.env.SUPABASE_URL
    if (!url || url.includes('placeholder')) return null
    return new URL(url).host
  } catch {
    return null
  }
})()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/supabase',
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/fonts',
  ],

  fonts: {
    families: [
      // Geometric grotesque used for headings — visually close to PP Neue Montreal
      { name: 'General Sans', provider: 'fontshare', weights: [400, 500, 600, 700] },
      // Neutral, highly legible body face
      { name: 'Inter', provider: 'google', weights: [400, 500, 600] },
    ],
    defaults: {
      preload: true,
    },
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  i18n: {
    defaultLocale: 'id',
    strategy: 'prefix_except_default',
    // Used by useLocaleHead for absolute hreflang + canonical links.
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    locales: [
      { code: 'id', name: 'Indonesia', language: 'id-ID', file: 'id.json' },
      { code: 'en', name: 'English',   language: 'en-US', file: 'en.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  supabase: {
    // Disable the module's auto-redirect — middleware/admin.ts owns auth
    // gating so we can also handle placeholder/demo mode cleanly.
    redirect: false,
  },

  image: {
    provider: 'ipx',
    domains: [
      ...(supabaseHost ? [supabaseHost] : []),
      'picsum.photos', // dummy data in /data/*
    ],
    formats: ['webp', 'avif'],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },
})
