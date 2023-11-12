<script setup lang="ts">
const props = defineProps<{
  submission: Submission
}>()
const hasResult = computed(() => props.submission.moves !== DNF && props.submission.moves !== DNS)
const showComment = ref(false)
const solution = computed(() => formatAlgorithm(props.submission.solution))
</script>

<template>
  <div>
    <div class="flex gap-2 justify-start items-start">
      <Sequence :sequence="props.submission.solution" />
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
