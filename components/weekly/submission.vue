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
      <pre v-if="hasResult" class="whitespace-pre-wrap break-all">{{ solution }} ({{ formatResult(submission.moves) }})</pre>
      <span v-else class="text-red-500">{{ submission.moves === DNF ? 'DNF' : 'DNS' }}</span>
      <button v-if="submission.comment.trim() !== ''" class="text-indigo-500" @click="showComment = !showComment">
        <Icon
          :name="showComment ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'"
          size="20"
        />
      </button>
    </div>
    <TransitionExpand>
      <pre v-if="showComment" class="whitespace-pre-wrap break-all bg-gray-200">{{ submission.comment }}</pre>
    </TransitionExpand>
  </div>
</template>
