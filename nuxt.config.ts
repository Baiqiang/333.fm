// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      titleTemplate: '%s - Fewest Moves',
    },
  },
  runtimeConfig: {
    public: {
      baseURL: 'https://api.333.fm/',
    },
  },
  modules: [
    '@nuxtjs/eslint-module',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/google-fonts',
    'nuxt-icon',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@freeloop/nuxt-transitions',
  ],
  i18n: {
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
    },
    locales: [
      {
        code: 'en',
        name: 'English',
      },
      {
        code: 'zh-CN',
        name: '简体中文',
      },
    ],
  },
  googleFonts: {
    download: true,
    families: {
      Poppins: [400, 600],
      Inter: [300, 400, 500, 600],
    },
  },
  experimental: {
    asyncContext: true,
    headNext: true,
  },
  $development: {
    vite: {
      server: {
        hmr: {
          host: 'localhost',
          protocol: 'ws',
        },
      },
    },
  },
  devtools: {
    enabled: true,
  },
  typescript: {
    shim: false,
  },
})
