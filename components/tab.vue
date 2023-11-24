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
  <TransitionSlide>
    <div v-show="activeIndex === index">
      <slot />
    </div>
  </TransitionSlide>
</template>
