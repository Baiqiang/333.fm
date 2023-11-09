<script setup lang="ts">
const emit = defineEmits<{
  tabActived: [tab: number]
}>()
const tabs: Tab[] = reactive<Tab[]>([])
const activeIndex = ref(0)
function selectTab(index: number) {
  tabs[activeIndex.value].active = false
  activeIndex.value = index
  tabs[activeIndex.value].active = true
  emit('tabActived', index)
}
function addTab(tab: Tab) {
  return tabs.push(tab) - 1
}
provide(SYMBOL_ADD_TAB, addTab)
provide(SYMBOL_ACTIVE_INDEX, activeIndex)
onMounted(() => selectTab(0))
</script>

<template>
  <div>
    <div class="flex text-xs md:text-sm whitespace-nowrap">
      <div
        v-for="{ name }, index in tabs"
        :key="name"
        class="cursor-pointer py-1 px-2 border-gray-500"
        :class="{ 'border-b text-blue-500': index !== activeIndex, 'border border-b-0': index === activeIndex }"
        @click="selectTab(index)"
      >
        {{ name }}
      </div>
      <div class="flex-1 border-b border-gray-500" />
    </div>
    <slot />
  </div>
</template>
