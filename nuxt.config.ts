// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      titleTemplate: '%s - Fewest Moves',
    },
  },
  runtimeConfig: {
    public: {
      mode: 'production',
      baseURL: 'https://api.333.fm/',
    },
  },
  modules: [
    // '@nuxtjs/eslint-module',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/google-fonts',
    'nuxt-icon',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@freeloop/nuxt-transitions',
    'dayjs-nuxt',
    'nuxt-gtag',
    '@vite-pwa/nuxt',
  ],
  css: ['viewerjs/dist/viewer.css'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '333.fm',
      short_name: '333.fm',
      theme_color: '#6366f1',
      display: 'standalone',
      icons: [
        {
          src: 'logo.svg',
          sizes: '72x72 96x96 128x128 144x144 152x152 192x192 384x384 512x512',
          type: 'image/svg+xml',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module',
    },
  },
  dayjs: {
    locales: ['en', 'zh-cn'],
    defaultLocale: 'en',
    plugins: ['relativeTime', 'utc', 'timezone', 'advancedFormat', 'weekOfYear', 'localizedFormat'],
  },
  i18n: {
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
    },
    skipSettingLocaleOnNavigate: true,
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
  gtag: {
    id: 'G-4DDRHC6TDB',
  },
  experimental: {
    asyncContext: true,
    headNext: true,
    // disable this to run in QQ browser for iOS
    appManifest: false,
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
