<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  name: string
  defaultDirection?: 'asc' | 'desc'
}>(), {
  label: '',
  defaultDirection: 'asc',
})
const currentField = mustInject(SYMBOL_FIELD)
const direction = mustInject(SYMBOL_DIRECTION)

const isSelected = computed(() => props.name === currentField.value)

function handleClick() {
  if (isSelected.value) {
    direction.value = direction.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    currentField.value = props.name
    direction.value = props.defaultDirection
  }
}

watch(currentField, (newVal) => {
  if (newVal !== props.name) {
    direction.value = props.defaultDirection
  }
})
</script>

<template>
  <div
    class="flex items-center justify-center cursor-pointer"
    @click="handleClick"
  >
    <slot name="label">
      <span>{{ label }}</span>
    </slot>
    <span v-if="isSelected">
      <Icon
        :name="direction === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
        class="w-4 h-4"
      />
    </span>
    <span v-else>
      <Icon
        name="mdi:arrow-up-down"
        class="w-4 h-4 text-gray-400"
      />
    </span>
  </div>
</template>
