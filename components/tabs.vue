<script setup lang="ts">
const emit = defineEmits<{
  tabActived: [tab: number]
}>()
const tabs: Tab[] = reactive<Tab[]>([])
const activeIndex = defineModel<number>('activeIndex', {
  default: 0,
})
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
const route = useRoute()
onMounted(() => {
  if (tabs.length === 0) {
    return
  }
  const index = tabs.findIndex(tab => tab.hash === route.hash.replace('#', ''))
  if (index !== -1)
    selectTab(index)
  else
    selectTab(activeIndex.value)
})
</script>

<template>
  <div>
    <div v-if="tabs.length > 1" class="overflow-x-auto">
      <div class="flex text-xs md:text-sm whitespace-nowrap">
        <a
          v-for="{ name, hash }, index in tabs"
          :id="hash"
          :key="index"
          class="cursor-pointer py-1 px-2 border-gray-500"
          :class="{ 'border-b text-blue-500': index !== activeIndex, 'border border-b-0': index === activeIndex }"
          :href="hash ? `#${hash}` : undefined"
          @click="selectTab(index)"
        >
          {{ name }}
        </a>
        <div class="flex-1 border-b border-gray-500" />
      </div>
    </div>
    <slot />
  </div>
</template>
