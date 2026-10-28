<script setup lang="ts">
const { data: daily } = await useApi<Competition>('/daily/on-going')
const { data: weekly } = await useApi<Competition>('/weekly/on-going')
const { data: league } = await useApi<Competition>('/league/on-going')
const { setLocale, setLocaleCookie, finalizePendingLocaleChange, t } = useI18n()
const router = useRouter()
const user = useUser()

async function fetchOnGoing(url: string) {
  try {
    return await useClientApi<Competition | null>(url)
  }
  catch {
    return null
  }
}

function onGoingNav(title: string, base: string, onGoing: Ref<Competition | null | undefined>) {
  return {
    title,
    path: onGoing.value ? competitionPath(onGoing.value) : base,
    activePrefix: base,
    async onClick() {
      const competition = await fetchOnGoing(`${base}/on-going`)
      onGoing.value = competition
      router.push(competition ? competitionPath(competition) : base)
    },
  }
}

const primaryNavs = computed(() => [
  onGoingNav(t('weekly.shortTitle'), '/weekly', weekly),
  onGoingNav(t('daily.shortTitle'), '/daily', daily),
  onGoingNav(t('league.title'), '/league', league),
  {
    title: t('practice.shortTitle'),
    path: '/practice',
  },
  // ...(user.isFunChallengeAdmin
  //   ? [{
  //       title: t('funChallenge.admin.shortTitle'),
  //       path: '/fun-challenges/admin',
  //     }]
  //   : []),
])
const menuNavs = computed(() => [
  {
    title: t('header.training'),
    children: [
      {
        title: t('endless.shortTitle'),
        path: '/endless',
      },
      {
        title: t('drTrigger.shortTitle'),
        path: '/dr-trigger',
      },
      {
        title: t('tools.frTrainer.title'),
        path: '/tools/fr-trainer',
      },
      {
        title: t('tools.pensukeTrainer.title'),
        path: '/tools/pensuke-trainer',
      },
      {
        title: t('quiz.shortTitle'),
        path: '/quiz',
      },
      // {
      //   title: t('chain.title'),
      //   path: '/chain',
      // },
    ],
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
        title: t('tools.htrSubsetStats.title'),
        path: '/tools/htr-subset-stats',
      },
    ],
  },
  {
    title: t('header.resources'),
    children: [
      {
        title: t('tutorial.title'),
        path: '/tutorial',
      },
      {
        title: t('wca.recon.title'),
        path: '/wca/reconstruction',
      },
      {
        title: t('wca.competitions'),
        path: '/wca/competitions',
      },
      {
        title: t('stats.title'),
        path: '/stats',
      },
      // {
      //   title: t('point.title'),
      //   path: '/point',
      // },
    ],
  },
])
const showMenu = ref(false)
router.afterEach(() => {
  showMenu.value = false
})

const langButton = ref()
const colorModeButton = ref()
const colorMode = useColorMode()
const colorModeReady = ref(false)
onMounted(() => colorModeReady.value = true)
const locales = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
] as const
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
async function changeLocale(code: typeof locales[number]['code']) {
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
        class="fixed inset-0 overflow-y-auto md:overflow-visible bg-indigo-500 dark:bg-gray-900 md:static transition-all duration-300 z-50 flex flex-col md:flex-row md:gap-x-2 md:items-center md:w-full"
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
        <Nav v-for="nav, index in primaryNavs" :key="`primary-${index}`" v-bind="nav" />
        <span class="mx-4 md:mx-1 border-t md:border-t-0 md:border-l border-white/30 md:h-4" />
        <Nav v-for="nav, index in menuNavs" :key="`menu-${index}`" v-bind="nav" />
        <div class="md:hidden px-4 mt-3 pb-4 space-y-3">
          <NuxtLink to="/search" class="flex items-center gap-2 py-1.5 text-gray-300 hover:text-white">
            <Icon name="heroicons:magnifying-glass" size="20" />
            {{ $t('search.title') }}
          </NuxtLink>
          <div>
            <div class="text-xs text-indigo-200 dark:text-gray-400 mb-1.5">
              {{ $t('header.language') }}
            </div>
            <div class="grid grid-cols-2 gap-1 p-1 bg-white/10">
              <button
                v-for="item in locales"
                :key="item.code"
                class="py-1.5 text-sm transition"
                :class="$i18n.locale === item.code ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-indigo-100 dark:text-gray-400'"
                @click="changeLocale(item.code)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
          <div>
            <div class="text-xs text-indigo-200 dark:text-gray-400 mb-1.5">
              {{ $t('header.appearance') }}
            </div>
            <div class="grid grid-cols-3 gap-1 p-1 bg-white/10">
              <button
                v-for="mode in colorModes"
                :key="mode.value"
                class="flex items-center justify-center gap-1.5 py-1.5 text-sm transition"
                :class="colorModeReady && colorMode.preference === mode.value ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-indigo-100 dark:text-gray-400'"
                @click="colorMode.preference = mode.value"
              >
                <Icon :name="mode.icon" size="16" />
                {{ $t(`colorMode.${mode.value}`) }}
              </button>
            </div>
          </div>
        </div>
        <div class="hidden md:flex md:ml-auto md:items-center md:gap-3">
          <NuxtLink to="/search">
            <Icon name="heroicons:magnifying-glass" size="20" />
          </NuxtLink>
          <div class="relative">
            <a ref="langButton" class="flex items-center cursor-pointer" @click="dropdowns.lang = !dropdowns.lang">
              <Icon name="ic:round-translate" size="20" />
            </a>

            <TransitionSlide :offset="[0, 4]">
              <div v-if="dropdowns.lang" class="flex flex-col gap-1 absolute top-10 right-0 bg-indigo-500 dark:bg-indigo-700 p-2 text-sm">
                <button v-for="item in locales" :key="item.code" class="w-24 flex items-center text-left px-2 py-1 transition hover:bg-indigo-400 dark:hover:bg-indigo-600" @click="changeLocale(item.code)">
                  <span>{{ item.label }}</span>
                </button>
              </div>
            </TransitionSlide>
          </div>

          <div class="relative">
            <a ref="colorModeButton" class="flex items-center cursor-pointer" @click="dropdowns.colorMode = !dropdowns.colorMode">
              <Icon :name="colorModeReady ? colorModeIcon : 'mdi:monitor'" size="20" />
            </a>

            <TransitionSlide :offset="[0, 4]">
              <div v-if="dropdowns.colorMode" class="flex flex-col gap-1 absolute top-10 right-0 bg-indigo-500 dark:bg-indigo-700 p-2 text-sm">
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

          <NotificationBell />
          <NuxtLink v-if="!user.signedIn" to="/sign-in" class="nav">
            {{ $t('header.signIn') }}
          </NuxtLink>
          <AppUserDropdown v-else arrow />
        </div>
      </div>
    </div>
  </header>
</template>
