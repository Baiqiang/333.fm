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
])
const user = useUser()
const showUserMenu = ref(false)
const menuClass = 'hover:bg-gray-200 cursor-pointer px-3 py-1'
onMounted(() => {
  document.body.addEventListener('click', () => showUserMenu.value = false)
})
const { setLocale, locale } = useI18n()
function switchLang() {
  setLocale(locale.value === 'en' ? 'zh-CN' : 'en')
}
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
        {{ $t(title) }}
      </NuxtLink>
      <div class="ml-auto flex items-center gap-2">
        <div class="cursor-pointer select-none flex flex-col items-stretch text-xs text-center leading-3" @click="switchLang">
          <div class="border border-white" :class="{ 'bg-white text-indigo-500': locale === 'zh-CN' }">
            EN
          </div>
          <div class="border border-white" :class="{ 'bg-white text-indigo-500': locale === 'en' }">
            简
          </div>
        </div>
        <NuxtLink v-if="!user.signedIn" to="/sign-in" class="text-xs md:text-base whitespace-nowrap">
          {{ $t('header.signIn') }}
        </NuxtLink>
        <div v-else class="relative">
          <div class="flex items-center">
            <img class="w-8 cursor-pointer" :src="user.avatarThumb" @click.stop="showUserMenu = !showUserMenu">
            <Icon name="solar:alt-arrow-down-bold" size="20" />
          </div>
          <TransitionSlide>
            <div v-if="showUserMenu" class="absolute right-0 bg-white text-black border border-gray-200 whitespace-nowrap py-1">
              <NuxtLink to="/user/if" class="block" :class="menuClass">
                {{ $t('user.if') }}
              </NuxtLink>
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
