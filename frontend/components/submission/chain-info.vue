<script setup lang="ts">
const props = defineProps<{
  submission: Submission
}>()

const route = useRoute()
const to = computed(() => props.submission.phase !== SubmissionPhase.INSERTIONS
  ? `/chain/${props.submission.scramble?.number ?? route.params.number}/${props.submission.id}`
  : undefined)
const cls = computed(() => {
  const { viewed, declined, latestSubmitted } = props.submission
  let cls = ''
  if (!viewed && !declined && !latestSubmitted)
    cls += 'bg-blue-500'
  else if (latestSubmitted)
    cls += 'bg-green-500'
  else if (declined)
    cls += 'bg-yellow-500'
  else if (viewed)
    cls += 'bg-gray-500'

  return cls
})
</script>

<template>
  <div>
    <div v-if="submission.continuances > 0" class="flex text-sm gap-1">
      <div>
        {{ $t('chain.continuances', { n: submission.continuances }) }}
      </div>
      <div v-if="submission.finishes > 0">
        | {{ $t('chain.finishes', { n: submission.finishes }) }}
      </div>
      <div v-if="submission.best > 0">
        | {{ $t('chain.best') }} {{ formatResult(submission.best) }}
      </div>
    </div>
    <NuxtLink v-if="to" :to="to" class="text-sm text-white px-2 py-1 mt-1 flex-inline items-center relative" :class="cls">
      {{ $t('chain.continue') }} <Icon name="ic:round-keyboard-double-arrow-right" />
      <div v-if="submission.notification" class="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
    </NuxtLink>
  </div>
</template>
