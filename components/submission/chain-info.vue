<script setup lang="ts">
const props = defineProps<{
  submission: Submission
}>()

const route = useRoute()
const to = computed(() => props.submission.phase !== SubmissionPhase.INSERTIONS
  ? `/chain/${props.submission.scramble?.number ?? route.params.number}/${props.submission.id}`
  : undefined)
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
    <NuxtLink v-if="to" :to="to" class="text-sm bg-indigo-500 text-white px-2 py-1 mt-1 flex-inline items-center">
      {{ $t('chain.continue') }} <Icon name="ic:round-keyboard-double-arrow-right" />
    </NuxtLink>
  </div>
</template>
