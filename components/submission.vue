<script setup lang="ts">
const props = defineProps<{
  submission: Submission
}>()
const showComment = ref(false)
const showOriginal = ref(false)
const solution = computed(() => {
  if (showOriginal.value)
    return props.submission.solution

  try {
    return formatAlgorithm(props.submission.solution)
  }
  catch (error) {
    return props.submission.solution.replaceAll('\n', ' ')
  }
})
</script>

<template>
  <div>
    <div class="flex gap-2 justify-start items-start">
      <Sequence :sequence="solution" />
      <button class="text-indigo-500" @click="showOriginal = !showOriginal">
        <Icon
          :name="showOriginal ? 'ic:sharp-rotate-90-degrees-cw' : 'ic:sharp-rotate-90-degrees-ccw'"
          size="20"
        />
      </button>
      <button v-if="submission.comment.trim() !== ''" class="text-indigo-500" @click="showComment = !showComment">
        <Icon
          :name="showComment ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'"
          size="20"
        />
      </button>
    </div>
    <TransitionExpand>
      <Sequence v-if="showComment" :sequence="submission.comment" class="bg-gray-200" />
    </TransitionExpand>
  </div>
</template>
