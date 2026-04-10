<script setup lang="ts">
const { data: daily } = await useApi<Competition>('/daily/on-going')
const { data: weekly } = await useApi<Competition>('/weekly/on-going')
const { setLocale, setLocaleCookie, finalizePendingLocaleChange, t } = useI18n()
let lastUpdate = useDayjs()().format('YYYY-MM-DD')
const navs = computed(() => [
  {
    title: t('weekly.shortTitle'),
    path: weekly.value ? competitionPath(weekly.value) : '/weekly',
  },
  {
    title: t('daily.shortTitle'),
    path: daily.value ? competitionPath(daily.value) : '/daily',
  },
  {
    title: t('endless.shortTitle'),
    path: '/endless',
  },
  {
    title: t('drTrigger.shortTitle'),
    path: '/dr-trigger',
  },
  {
    title: t('quiz.shortTitle'),
    path: '/quiz',
  },
  {
    title: t('practice.shortTitle'),
    path: '/practice',
  },
  {
    title: t('league.title'),
    path: '/league',
  },
  {
    title: t('wca.recon.title'),
    path: '/wca/reconstruction',
  },
  {
    title: t('tools.title'),
    children: [
      {
        title: t('if.title'),
        path: '/if',
      },
      {
        title: t('sf.title'),
        path: '/sf',
      },
      {
        title: t('tools.drCaseRecognizer.title'),
        path: '/tools/dr-case-recognizer',
      },
      {
        title: t('wca.competitions'),
        path: '/wca/competitions',
      },
      // {
      //   title: t('point.title'),
      //   path: '/point',
      // },
      {
        title: t('stats.title'),
        path: '/stats',
      },
      {
        title: t('tutorial.title'),
        path: '/tutorial',
      },
    ],
  },
  // {
  //   title: 'chain.title',
  //   path: '/chain',
  // },
])
const user = useUser()
const showMenu = ref(false)
const router = useRouter()
router.afterEach(() => {
  showMenu.value = false
})
useIntervalFn(() => {
  const now = useDayjs()().format('YYYY-MM-DD')
  if (now !== lastUpdate) {
    lastUpdate = now
    useApi<Competition>('/daily/on-going').then(({ data }) => daily.value = data.value)
    useApi<Competition>('/weekly/on-going').then(({ data }) => weekly.value = data.value)
  }
}, 5000)

const langButton = ref()
const colorModeButton = ref()
const colorMode = useColorMode()
const locales = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
]
const colorModes = [
  { value: 'system', icon: 'mdi:monitor' },
  { value: 'light', icon: 'mdi:white-balance-sunny' },
  { value: 'dark', icon: 'mdi:moon-waning-crescent' },
] as const
const colorModeIcon = computed(() => {
  if (colorMode.preference === 'dark')
    return 'mdi:moon-waning-crescent'
  if (colorMode.preference === 'light')
    return 'mdi:white-balance-sunny'
  return 'mdi:monitor'
})
const dropdowns = reactive({
  lang: false,
  colorMode: false,
})
onClickOutside(langButton, () => {
  dropdowns.lang = false
})
onClickOutside(colorModeButton, () => {
  dropdowns.colorMode = false
})
async function changeLocale(code: string) {
  setLocaleCookie(code)
  await setLocale(code)
  await finalizePendingLocaleChange()
}
</script>

<template>
  <header class="bg-indigo-500 dark:bg-gray-900 text-white relative text-sm md:text-base">
    <div class="container flex items-center py-2 px-4 mx-auto gap-x-2">
      <h1 class="mr-2">
        <NuxtLink to="/" class="flex items-center">
          <LogoColor class="w-8" />
          <LogoText class="ml-2 w-20 text-white transition-colors duration-300 hover:text-red-500" />
        </NuxtLink>
      </h1>
      <div class="md:hidden ml-auto flex items-center gap-2">
        <NotificationBell />
        <AppUserDropdown v-if="user.signedIn" arrow />
        <NuxtLink v-else to="/sign-in">
          <Icon name="mdi:account" size="24" />
        </NuxtLink>
        <button @click="showMenu = !showMenu">
          <Icon name="mdi:menu" size="24" />
        </button>
      </div>
      <div
        class="fixed inset-0 bg-indigo-500 dark:bg-gray-900 md:static transition-all duration-300 z-50 flex flex-col md:flex-row md:gap-x-2 md:items-center md:w-full"
        :class="{
          'left-0': showMenu,
          'left-full': !showMenu,
        }"
      >
        <div v-if="showMenu" class="flex justify-between items-center py-2 px-4">
          <div class="mr-2 flex items-center">
            <LogoColor class="w-8" />
            <LogoText class="ml-2 w-20 text-white transition-colors duration-300 hover:text-red-500" />
          </div>

          <button @click="showMenu = false">
            <Icon name="mdi:close" size="24" />
          </button>
        </div>
        <Nav v-for="nav, index in navs" :key="index" v-bind="nav" />
        <div class="md:ml-auto flex flex-col md:flex-row md:items-center md:gap-3">
          <NuxtLink to="/search" class="px-4 py-2 md:p-0 ">
            <Icon name="heroicons:magnifying-glass" size="20" />
            <span class="md:hidden ml-2">{{ $t('search.title') }}</span>
          </NuxtLink>
          <div class="relative">
            <a ref="langButton" class="px-4 py-2 md:p-0 " @click="dropdowns.lang = !dropdowns.lang">
              <Icon name="ic:round-translate" size="20" />
              <span class="md:hidden ml-2">
                {{ locales.find(l => l.code === $i18n.locale)?.label }}
              </span>
            </a>

            <TransitionSlide :offset="[0, 4]">
              <div v-if="dropdowns.lang" class="flex flex-col gap-1 md:absolute top-10 right-0 bg-indigo-500 dark:bg-indigo-700 p-2 text-sm">
                <button v-for="item in locales" :key="item.code" class="w-24 flex items-center text-left px-2 py-1 transition hover:bg-indigo-400 dark:hover:bg-indigo-600" @click="changeLocale(item.code)">
                  <span>{{ item.label }}</span>
                </button>
              </div>
            </TransitionSlide>
          </div>

          <div class="relative">
            <a ref="colorModeButton" class="px-4 py-2 md:p-0 cursor-pointer" @click="dropdowns.colorMode = !dropdowns.colorMode">
              <Icon :name="colorModeIcon" size="20" />
              <span class="md:hidden ml-2">{{ $t(`colorMode.${colorMode.preference}`) }}</span>
            </a>

            <TransitionSlide :offset="[0, 4]">
              <div v-if="dropdowns.colorMode" class="flex flex-col gap-1 md:absolute top-10 right-0 bg-indigo-500 dark:bg-indigo-700 p-2 text-sm">
                <button
                  v-for="mode in colorModes"
                  :key="mode.value"
                  class="w-28 flex items-center text-left px-2 py-1 transition hover:bg-indigo-400 dark:hover:bg-indigo-600"
                  :class="{ 'bg-indigo-400 dark:bg-indigo-600': colorMode.preference === mode.value }"
                  @click="colorMode.preference = mode.value; dropdowns.colorMode = false"
                >
                  <Icon :name="mode.icon" size="16" class="mr-2" />
                  <span>{{ $t(`colorMode.${mode.value}`) }}</span>
                </button>
              </div>
            </TransitionSlide>
          </div>

          <NotificationBell class="hidden md:block" />
          <NuxtLink v-if="!user.signedIn" to="/sign-in" class="nav hidden md:block">
            {{ $t('header.signIn') }}
          </NuxtLink>
          <AppUserDropdown v-else class="hidden md:block" arrow />
        </div>
      </div>
    </div>
  </header>
</template>
