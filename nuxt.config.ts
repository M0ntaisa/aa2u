import tailwindcss from '@tailwindcss/vite'

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
    locales: [
      { code: 'id', name: 'Indonesia', file: 'id.json' },
      { code: 'en', name: 'English',   file: 'en.json' },
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
    domains: [],
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
