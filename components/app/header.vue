<script setup lang="ts">
const { data: weekly } = await useApi<Competition>('/weekly/on-going')
const { data: daily } = await useApi<Competition>('/daily/on-going')
const navs = computed(() => [
  {
    title: 'if.title',
    path: '/if',
  },
  {
    title: 'sf.title',
    path: '/sf',
  },
  {
    title: 'weekly.title',
    path: weekly.value ? competitionPath(weekly.value) : '/weekly',
  },
  {
    title: 'daily.title',
    path: daily.value ? competitionPath(daily.value) : '/daily',
  },
  {
    title: 'endless.title',
    path: '/endless',
  },
  {
    title: 'practice.title',
    path: '/practice',
  },
  {
    title: 'league.title',
    path: '/league',
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

const langButton = ref()
const { setLocale, setLocaleCookie, finalizePendingLocaleChange } = useI18n()
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
      <div class="md:hidden ml-auto">
        <button @click="showMenu = !showMenu">
          <Icon name="mdi:menu" size="24" />
        </button>
      </div>
      <div
        class="fixed inset-0 bg-indigo-500 md:static transition-all duration-300 z-10 flex flex-col md:flex-row md:gap-x-2 md:items-center md:w-full"
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
        <NuxtLink v-for="{ title, path } in navs" :key="path" :to="path" class="nav">
          {{ $t(title) }}
        </NuxtLink>
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

<style lang="less">
.nav {
  @apply text-gray-300 hover:text-white whitespace-nowrap block px-4 py-2 md:p-0;

  &.router-link-active {
    @apply text-white;
  }
}
</style>
