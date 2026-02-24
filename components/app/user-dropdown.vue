<script setup lang="ts">
defineProps<{
  arrow?: boolean
}>()

const user = useUser()
const open = ref(false)
const el = ref<HTMLElement>()
const menuClass = 'hover:bg-gray-200 cursor-pointer px-3 py-1'

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
        <img class="w-8" :src="user.avatarThumb">
      </div>
      <Icon v-if="arrow" name="solar:alt-arrow-down-bold" size="20" />
    </div>
    <TransitionSlide>
      <div v-if="open" class="absolute right-0 top-10 bg-white text-black border border-gray-200 whitespace-nowrap py-1 flex flex-col items-stretch shadow-md z-50">
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
</template>
