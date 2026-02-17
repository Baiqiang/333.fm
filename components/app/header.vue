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
    title: t('practice.shortTitle'),
    path: '/practice',
  },
  {
    title: t('league.title'),
    path: '/league',
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
      {
        title: t('stats.title'),
        path: '/stats',
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
const showUserMenu = ref(false)
const menuClass = 'hover:bg-gray-200 cursor-pointer px-3 py-1'
const router = useRouter()
router.afterEach(() => {
  showMenu.value = false
  showUserMenu.value = false
})
onMounted(() => {
  document.body.addEventListener('click', () => showUserMenu.value = false)
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
const locales = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
]
const dropdowns = reactive({
  lang: false,
})
onClickOutside(langButton, () => {
  dropdowns.lang = false
})
async function changeLocale(code: string) {
  setLocaleCookie(code)
  await setLocale(code)
  await finalizePendingLocaleChange()
}
</script>

<template>
  <header class="bg-indigo-500 text-white relative text-sm md:text-base">
    <div class="container flex items-center py-2 px-4 mx-auto gap-x-2">
      <h1 class="mr-2">
        <NuxtLink to="/" class="flex items-center">
          <LogoColor class="w-8" />
          <LogoText class="ml-2 w-20 text-white transition-colors duration-300 hover:text-red-500" />
        </NuxtLink>
      </h1>
      <div class="md:hidden ml-auto flex items-center gap-2">
        <NotificationBell />
        <button @click="showMenu = !showMenu">
          <Icon name="mdi:menu" size="24" />
        </button>
      </div>
      <div
        class="fixed inset-0 bg-indigo-500 md:static transition-all duration-300 z-50 flex flex-col md:flex-row md:gap-x-2 md:items-center md:w-full"
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
          <div class="relative">
            <a ref="langButton" class="nav" @click="dropdowns.lang = !dropdowns.lang">
              <Icon name="ic:round-translate" size="20" />
              <span class="md:hidden ml-2">
                {{ locales.find(l => l.code === $i18n.locale)?.label }}
              </span>
            </a>

            <TransitionSlide :offset="[0, 4]">
              <div v-if="dropdowns.lang" class="flex flex-col gap-1 md:absolute top-10 right-0 bg-indigo-500 p-2 text-sm">
                <button v-for="item in locales" :key="item.code" class="w-24 flex items-center text-left px-2 py-1 transition hover:bg-indigo-400" @click="changeLocale(item.code)">
                  <span>{{ item.label }}</span>
                </button>
              </div>
            </TransitionSlide>
          </div>

          <NotificationBell class="hidden md:block" />
          <NuxtLink v-if="!user.signedIn" to="/sign-in" class="nav">
            {{ $t('header.signIn') }}
          </NuxtLink>
          <div v-else class="relative">
            <div class="flex items-center cursor-pointer px-4 md:px-0" @click.stop="showUserMenu = !showUserMenu">
              <div class="w-8 h-8 overflow-hidden">
                <img class="w-8" :src="user.avatarThumb">
              </div>
              <Icon name="solar:alt-arrow-down-bold" size="20" />
            </div>
            <TransitionSlide>
              <div v-if="showUserMenu" class="md:absolute right-0 bg-white text-black border border-gray-200 whitespace-nowrap py-1 flex flex-col items-stretch">
                <div class="text-gray-400 px-3 py-1 text-sm">
                  {{ $i18n.locale === 'en' ? user.englishName : user.localName }}
                </div>
                <NuxtLink to="/user/if" :class="menuClass">
                  {{ $t('user.if') }}
                </NuxtLink>
                <NuxtLink :to="`/profile/${userId(user as any)}`" :class="menuClass">
                  {{ $t('user.solutions') }}
                </NuxtLink>
                <NuxtLink :to="`/practice/${userId(user as any)}`" :class="menuClass">
                  {{ $t('user.practices') }}
                </NuxtLink>
                <NuxtLink to="/user/bot-token" :class="menuClass">
                  {{ $t('user.token') }}
                </NuxtLink>
                <NuxtLink to="/user/likes" :class="menuClass">
                  {{ $t('user.likes') }}
                </NuxtLink>
                <NuxtLink to="/user/favorites" :class="menuClass">
                  {{ $t('user.favorites') }}
                </NuxtLink>
                <NuxtLink to="/user/notifications" :class="menuClass">
                  {{ $t('notification.title') }}
                </NuxtLink>
                <template v-if="user.isAdmin">
                  <hr>
                  <div class="text-gray-400 px-3 py-1 text-sm">
                    {{ $t('admin.title') }}
                  </div>
                  <NuxtLink to="/admin/if" :class="menuClass">
                    {{ $t('admin.if.title') }}
                  </NuxtLink>
                  <NuxtLink to="/admin/user" :class="menuClass">
                    {{ $t('admin.user.title') }}
                  </NuxtLink>
                </template>
                <div :class="menuClass" @click="user.signOut">
                  {{ $t('header.signOut') }}
                </div>
              </div>
            </TransitionSlide>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
