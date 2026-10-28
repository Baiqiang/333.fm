<script setup lang="ts">
interface NavChild {
  title: string
  path: string
}
const props = defineProps<{
  title: string
  path?: string
  activePrefix?: string
  onClick?: () => void
  children?: NavChild[]
}>()
const route = useRoute()
function matches(prefix: string) {
  return route.path === prefix || route.path.startsWith(`${prefix}/`)
}
const active = computed(() => {
  if (props.activePrefix)
    return matches(props.activePrefix)
  return props.children?.some(child => matches(child.path)) ?? false
})
const showChildren = ref(false)
const navRef = useTemplateRef('navRef')
onClickOutside(navRef, () => showChildren.value = false)

const isMobile = ref(false)
function checkMobile() {
  isMobile.value = window.innerWidth < 768
}
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <a
    v-if="path && onClick"
    :href="path"
    class="nav cursor-pointer"
    :class="{ active }"
    @click.prevent="onClick"
  >
    {{ title }}
  </a>
  <NuxtLink
    v-else-if="path"
    :to="path"
    class="nav"
    active-class="active"
  >
    {{ title }}
  </NuxtLink>
  <div
    v-else
    ref="navRef"
    class="relative group"
    @mouseenter="!isMobile && (showChildren = true)"
    @mouseleave="!isMobile && (showChildren = false)"
  >
    <template v-if="isMobile">
      <span class="block px-4 pt-2 text-xs text-indigo-200 dark:text-gray-400">
        {{ title }}
      </span>
      <NuxtLink
        v-for="(child, idx) in children"
        :key="idx"
        :to="child.path"
        class="nav sub-nav"
        :class="{ active: matches(child.path) }"
      >
        {{ child.title }}
      </NuxtLink>
    </template>
    <a v-else class="nav cursor-pointer" :class="{ active }" @click="showChildren = true">
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
        v-if="showChildren && !isMobile"
        class="z-10 min-w-[10rem] overflow-hidden md:absolute md:left-0 bg-indigo-500 dark:bg-gray-800"
      >
        <NuxtLink
          v-for="(child, idx) in children"
          :key="idx"
          :to="child.path"
          class="nav sub-nav"
          :class="{ active: matches(child.path) }"
          @click="showChildren = false"
        >
          {{ child.title }}
        </NuxtLink>
      </div>
    </TransitionExpand>
  </div>
</template>

<style scoped>
@reference "~/assets/css/tailwind.css";

.nav {
  @apply text-gray-300 hover:text-white whitespace-nowrap block px-4 py-1.5 md:p-0;
}
.nav.active {
  @apply text-white font-bold;
}
.sub-nav {
  @apply pl-8! md:px-4! py-1! md:py-2!;
}
</style>
