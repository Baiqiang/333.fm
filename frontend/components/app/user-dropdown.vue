<script setup lang="ts">
defineProps<{
  arrow?: boolean
}>()

const user = useUser()
const open = ref(false)
const el = ref<HTMLElement>()
const menuClass = 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer px-3 py-1'

onClickOutside(el, () => {
  open.value = false
})
useRouter().afterEach(() => {
  open.value = false
})
</script>

<template>
  <div ref="el" class="relative">
    <div class="flex items-center cursor-pointer" @click="open = !open">
      <div class="w-8 h-8 overflow-hidden">
        <img class="w-8 bg-gray-200 dark:bg-gray-700" :src="user.avatarThumb || '/images/default-avatar.svg'" @error="(e: Event) => { (e.target as HTMLImageElement).src = '/images/default-avatar.svg' }">
      </div>
      <Icon v-if="arrow" name="solar:alt-arrow-down-bold" size="20" />
    </div>
    <TransitionSlide>
      <div v-if="open" class="absolute right-0 top-10 bg-white dark:bg-gray-800 text-black dark:text-gray-200 border border-gray-200 dark:border-gray-700 whitespace-nowrap py-1 flex flex-col items-stretch shadow-md z-50">
        <div class="text-gray-400 px-3 py-1 text-sm flex items-center gap-2">
          <Icon name="mdi:account-circle" class="opacity-60" size="18" />
          {{ $i18n.locale === 'en' ? user.englishName : user.localName }}
        </div>
        <NuxtLink :to="`/profile/${userId(user as any)}`" :class="menuClass">
          <Icon name="mdi:account" size="18" class="mr-2 text-gray-400" />
          {{ $t('user.profile') }}
        </NuxtLink>
        <NuxtLink :to="`/practice/${userId(user as any)}`" :class="menuClass">
          <Icon name="mdi:book-open-variant" size="18" class="mr-2 text-gray-400" />
          {{ $t('user.practices') }}
        </NuxtLink>
        <NuxtLink :to="`/profile/${userId(user as any)}/reconstruction`" :class="menuClass">
          <Icon name="mdi:cube" size="18" class="mr-2 text-gray-400" />
          {{ $t('wca.recon.myRecons') }}
        </NuxtLink>
        <NuxtLink to="/user/if" :class="menuClass">
          <Icon name="mdi:wave-arrow-up" size="18" class="mr-2 text-gray-400" />
          {{ $t('user.if') }}
        </NuxtLink>
        <NuxtLink to="/user/bot-token" :class="menuClass">
          <Icon name="mdi:robot" size="18" class="mr-2 text-gray-400" />
          {{ $t('user.token') }}
        </NuxtLink>
        <NuxtLink to="/user/likes" :class="menuClass">
          <Icon name="mdi:thumb-up-outline" size="18" class="mr-2 text-gray-400" />
          {{ $t('user.likes') }}
        </NuxtLink>
        <NuxtLink to="/user/favorites" :class="menuClass">
          <Icon name="mdi:star-outline" size="18" class="mr-2 text-gray-400" />
          {{ $t('user.favorites') }}
        </NuxtLink>
        <NuxtLink to="/user/notifications" :class="menuClass">
          <Icon name="mdi:bell-outline" size="18" class="mr-2 text-gray-400" />
          {{ $t('notification.title') }}
        </NuxtLink>
        <template v-if="user.isAdmin">
          <hr>
          <div class="text-gray-400 px-3 py-1 text-sm flex items-center gap-2">
            <Icon name="mdi:shield-account" class="opacity-60" size="18" />
            {{ $t('admin.title') }}
          </div>
          <NuxtLink to="/admin/if" :class="menuClass">
            <Icon name="mdi:invoice-text-arrow-left-outline" size="18" class="mr-2 text-gray-400" />
            {{ $t('admin.if.title') }}
          </NuxtLink>
          <NuxtLink to="/admin/user" :class="menuClass">
            <Icon name="mdi:account-multiple-outline" size="18" class="mr-2 text-gray-400" />
            {{ $t('admin.user.title') }}
          </NuxtLink>
        </template>
        <div :class="menuClass" @click="user.signOut">
          <Icon name="mdi:logout" size="18" class="mr-2 text-gray-400" />
          {{ $t('header.signOut') }}
        </div>
      </div>
    </TransitionSlide>
  </div>
</template>
