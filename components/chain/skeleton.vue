<script setup lang="ts">
const props = defineProps<{
  skeleton: string
  inverse?: boolean
  disabled?: boolean
}>()
const insertPlace = defineModel<number>({
  set(value) {
    if (props.disabled)
      return
    return value
  },
})
const formattedSkeleton = computed(() => {
  return formatAlgorithmToArray(props.skeleton)
})
</script>

<template>
  <div class="flex items-center gap-1 flex-wrap">
    <div v-if="inverse">
      (
    </div>
    <template v-for="twist, j of formattedSkeleton" :key="j">
      <ChainInsertPlace
        v-if="!disabled || insertPlace === j"
        v-model="insertPlace"
        :insert-place="j"
        :disabled="disabled"
      />
      <div>
        {{ twist }}
      </div>
    </template>
    <ChainInsertPlace
      v-if="!disabled || insertPlace === formattedSkeleton.length"
      v-model="insertPlace"
      :insert-place="formattedSkeleton.length"
      :disabled="disabled"
    />
    <div v-if="inverse">
      )
    </div>
  </div>
</template>
