<script setup lang="ts">
const props = defineProps<{
  name: string
  hash?: string
}>()
const addTab = inject(SYMBOL_ADD_TAB) as (tab: Tab) => number
const activeIndex = inject(SYMBOL_ACTIVE_INDEX) as Ref<number>
const hash = computed(() => props.hash ?? '')
const index = ref(0)
index.value = addTab({
  name: computed(() => props.name),
  hash,
  active: false,
})
</script>

<template>
  <TransitionSlide>
    <div v-show="activeIndex === index" :id="hash">
      <slot />
    </div>
  </TransitionSlide>
</template>
