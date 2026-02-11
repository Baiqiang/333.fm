<script setup lang="ts">
const emit = defineEmits<{
  tabActived: [tab: number]
}>()
const tabs: Tab[] = reactive<Tab[]>([])
const activeIndex = defineModel<number>('activeIndex', {
  default: 0,
})
function selectTab(index: number, updateHash = false) {
  tabs[activeIndex.value].active = false
  activeIndex.value = index
  tabs[index].active = true

  // Update URL hash if tab has a hash
  const hash = tabs[index].hash
  if (hash && updateHash) {
    window.location.hash = hash
  }

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

// Listen for hash changes
watch(() => route.hash, (newHash) => {
  if (tabs.length === 0)
    return

  const hash = newHash.replace('#', '')
  const index = tabs.findIndex(tab => tab.hash === hash)
  if (index !== -1 && index !== activeIndex.value) {
    selectTab(index)
  }
})
</script>

<template>
  <div class="tabs-container">
    <div v-if="tabs.length > 1" class="tabs-header">
      <div class="tabs-nav">
        <button
          v-for="{ name, hash }, index in tabs"
          :id="hash"
          :key="index"
          type="button"
          class="tab-button"
          :class="{ 'tab-button--active': index === activeIndex }"
          @click="selectTab(index, true)"
        >
          {{ name }}
        </button>
        <div class="tabs-indicator" />
      </div>
    </div>
    <div class="tabs-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tabs-container {
  @apply w-full;
}

.tabs-header {
  @apply border-b border-gray-200 bg-white sticky top-0 z-10;
}

.tabs-nav {
  @apply flex relative overflow-x-auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs-nav::-webkit-scrollbar {
  display: none;
}

.tab-button {
  @apply flex-shrink-0 px-2.5 py-2 text-xs md:px-3 md:py-2.5 md:text-sm lg:px-4 lg:py-3 lg:text-sm font-medium text-gray-500 bg-transparent border-none cursor-pointer relative whitespace-nowrap text-center transition-all duration-200 ease-in-out;
}

.tab-button:hover {
  @apply text-gray-700 bg-gray-50;
}

.tab-button--active {
  @apply text-blue-600 bg-white;
}

.tab-button--active::after {
  content: '';
  @apply absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 transition-all duration-200 ease-in-out;
  bottom: -1px;
}

.tabs-indicator {
  @apply flex-1;
}

.tabs-content {
  @apply py-2 md:py-3 lg:py-4;
}
</style>
