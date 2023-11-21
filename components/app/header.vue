<script setup lang="ts">
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
    path: '/weekly',
  },
])
const user = useUser()
const showUserMenu = ref(false)
const menuClass = 'hover:bg-gray-200 cursor-pointer px-3 py-1'
onMounted(() => {
  document.body.addEventListener('click', () => showUserMenu.value = false)
})

const langButton = ref()
const { setLocale } = useI18n()
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
</script>

<template>
  <header class="bg-indigo-500 text-white relative text-sm md:text-base">
    <div class="container flex items-center py-2 px-4 mx-auto gap-x-2">
      <h1 class="mr-2">
        <NuxtLink to="/" class="flex items-center">
          <LogoColor class="w-8" />
          <LogoText class="hidden md:block ml-2 w-20 text-white transition-colors duration-300 hover:text-red-500" />
        </NuxtLink>
      </h1>
      <NuxtLink v-for="{ title, path } in navs" :key="path" :to="path" class="nav">
        <span class="hidden md:inline">{{ $t(title) }}</span>
        <span class="md:hidden">{{ $t(title.replace('title', 'shortTitle')) }}</span>
      </NuxtLink>
      <div class="ml-auto flex items-center gap-3">
        <div class="relative">
          <button ref="langButton" class="text-lg" @click="dropdowns.lang = !dropdowns.lang">
            <Icon name="ic:round-translate" />
          </button>

          <TransitionSlide :offset="[0, 4]">
            <div v-if="dropdowns.lang" class="flex flex-col gap-1 absolute top-10 right-0 bg-indigo-500 p-2 text-sm">
              <button v-for="item in locales" :key="item.code" class="w-24 flex items-center text-left px-2 py-1 transition hover:bg-indigo-400" @click="setLocale(item.code)">
                <span>{{ item.label }}</span>
              </button>
            </div>
          </TransitionSlide>
        </div>

        <NuxtLink v-if="!user.signedIn" to="/sign-in" class="text-xs md:text-base whitespace-nowrap">
          {{ $t('header.signIn') }}
        </NuxtLink>
        <div v-else class="relative">
          <div class="flex items-center cursor-pointer" @click.stop="showUserMenu = !showUserMenu">
            <div class="w-8 h-8 overflow-hidden">
              <img class="w-8" :src="user.avatarThumb">
            </div>
            <Icon name="solar:alt-arrow-down-bold" size="20" />
          </div>
          <TransitionSlide>
            <div v-if="showUserMenu" class="absolute right-0 bg-white text-black border border-gray-200 whitespace-nowrap py-1 flex flex-col items-stretch">
              <div class="text-gray-400 px-3 py-1 text-sm">
                {{ $i18n.locale === 'en' ? user.englishName : user.localName }}
              </div>
              <NuxtLink to="/user/if" :class="menuClass">
                {{ $t('user.if') }}
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
  </header>
</template>

<style lang="less">
.nav {
  @apply text-gray-300 hover:text-white whitespace-nowrap;

  &.router-link-active {
    @apply text-white;
  }
}
</style>
