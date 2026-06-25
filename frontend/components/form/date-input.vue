<script setup lang="ts">
const props = defineProps<{
  modelValue?: Date
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', modelValue: Date): void
}>()
const dayjs = useDayjs()
const value = ref(props.modelValue ? dayjs(props.modelValue).format('YYYY-MM-DD') : '')
watch(value, (newVal) => {
  emit('update:modelValue', dayjs(newVal).toDate())
})
</script>

<template>
  <input v-model="value" type="date">
</template>
