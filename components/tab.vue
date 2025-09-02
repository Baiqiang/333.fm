<script setup lang="ts">
const props = defineProps<{
  name: string
  hash?: string
}>()
const addTab = inject(SYMBOL_ADD_TAB) as (tab: Tab) => number
const activeIndex = inject(SYMBOL_ACTIVE_INDEX) as Ref<number>
const index = ref(0)
index.value = addTab({
  name: computed(() => props.name),
  hash: props.hash,
  active: false,
})
</script>

<template>
  <Transition
    name="tab-transition"
    mode="out-in"
    appear
  >
    <div
      v-show="activeIndex === index"
      :key="index"
      class="tab-panel"
    >
      <slot />
    </div>
  </Transition>
</template>

<style scoped>
.tab-panel {
  @apply w-full;
  min-height: 6.25rem;
}

.tab-transition-enter-active,
.tab-transition-leave-active {
  @apply transition-all duration-300 ease-in-out;
}

.tab-transition-enter-from {
  @apply opacity-0 transform translate-x-2.5;
}

.tab-transition-leave-to {
  @apply opacity-0 transform -translate-x-2.5;
}

.tab-transition-enter-to,
.tab-transition-leave-from {
  @apply opacity-100 transform translate-x-0;
}
</style>
