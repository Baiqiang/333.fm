<script setup lang="ts">
defineProps<{
  title: string
  path?: string
  children?: { title: string, path: string }[]
}>()
const showChildren = ref(false)
const navRef = useTemplateRef('navRef')
onClickOutside(navRef, () => showChildren.value = false)
</script>

<template>
  <NuxtLink
    v-if="path"
    :to="path"
    class="nav"
    active-class="text-indigo-600 font-bold"
  >
    {{ title }}
  </NuxtLink>
  <div
    v-else
    ref="navRef"
    class="relative group"
    @mouseenter="showChildren = true"
    @mouseleave="showChildren = false"
  >
    <a class="nav cursor-pointer" @click="showChildren = !showChildren">
      {{ title }}
      <Icon
        name="mdi:menu-down"
        size="18"
        class="inline-block mr-1 align-middle transition-transform duration-300"
        :class="[
          showChildren ? 'rotate-180' : 'rotate-0',
        ]"
      />
    </a>
    <TransitionExpand>
      <div
        v-if="showChildren"
        class="z-10 min-w-[10rem] overflow-hidden md:absolute md:left-0 bg-indigo-500"
      >
        <NuxtLink
          v-for="(child, idx) in children"
          :key="idx"
          :to="child.path"
          class="nav sub-nav"
          @click="showChildren = false"
        >
          {{ child.title }}
        </NuxtLink>
      </div>
    </TransitionExpand>
  </div>
</template>

<style lang="less">
.nav {
  @apply text-gray-300 hover:text-white whitespace-nowrap block px-4 py-2 md:p-0;

  &.router-link-active {
    @apply text-white;
  }
}
.sub-nav {
  @apply md:px-4 py-2 !important;
}
</style>
