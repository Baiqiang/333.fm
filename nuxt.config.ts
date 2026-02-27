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
      wca: {
        apiBaseURL: 'https://www.worldcubeassociation.org/api/v0',
      },
    },
  },

  modules: [
    // '@nuxtjs/eslint-module',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/google-fonts',
    '@nuxtjs/mdc',
    '@nuxtjs/apollo',
    'nuxt-icon',
    'nuxt-gtag',
    'nuxt-echarts',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@freeloop/nuxt-transitions',
    'dayjs-nuxt',
    process.env.NODE_ENV === 'development'
      ? ['@vite-pwa/nuxt', {
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
            enabled: false,
            suppressWarnings: true,
            navigateFallbackAllowlist: [/^\/$/],
            type: 'module',
          },
        }]
      : undefined,
  ],

  css: ['viewerjs/dist/viewer.css'],

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

  echarts: {
    charts: ['LineChart', 'BarChart', 'ScatterChart'],
    components: [
      'GridComponent',
      'TitleComponent',
      'TooltipComponent',
      'ToolboxComponent',
      'LegendComponent',
      'BrushComponent',
      'MarkLineComponent',
      'MarkPointComponent',
      'DataZoomComponent',
    ],
    features: ['UniversalTransition'],
    renderer: ['svg', 'canvas'],
  },

  apollo: {
    clients: {
      default: {
        httpEndpoint: 'https://live.worldcubeassociation.org/api',
        inMemoryCacheOptions: {
          typePolicies: {
            Country: {
              keyFields: ['iso2'],
            },
            CompetitionBrief: {
              keyFields: ['wcaId'],
            },
            Competition: {
              fields: {
                access: {
                  merge: (existing, incoming) => {
                    return { ...existing, ...incoming }
                  },
                },
              },
            },
            Result: {
              fields: {
                attempts: {
                  merge: (existing, incoming) => {
                    return incoming
                  },
                },
              },
            },
          },
        },
      },
    },
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

  compatibilityDate: '2024-10-26',
})
