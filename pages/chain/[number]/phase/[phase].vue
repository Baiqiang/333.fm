<script setup lang="ts">
const { t } = useI18n()
const { params } = useRoute()
const bus = useEventBus('submission')
const apiPath = computed<string>(() => `/chain/${params.number}/${params.phase}`)
const { data, error } = await useApi<{ scramble: Scramble, tree: Submission | null }>(`/chain/${params.number}`)
if (!data.value || error.value) {
  throw createError({
    statusCode: 404,
  })
}
const scramble = ref<Scramble>(data.value.scramble)
const submissions = ref<Submission[]>([])
const phases = [
  SubmissionPhase.FINISHED,
  SubmissionPhase.SCRAMBLED,
  SubmissionPhase.EO,
  SubmissionPhase.DR,
  SubmissionPhase.HTR,
  SubmissionPhase.SKELETON,
  SubmissionPhase.INSERTIONS,
].map(phase => SubmissionPhase[phase])
await fetchSubmissions()
async function fetchSubmissions() {
  const { data, refresh } = await useApi<Submission[]>(`${apiPath.value}/submissions`, {
    immediate: false,
  })
  await refresh()
  for (const submission of data.value || [])
    submission.scramble = scramble.value

  if (data.value)
    submissions.value = data.value
}
useSeoMeta({
  title: `${params.phase} - ${t('weekly.scramble', { number: params.number })} - ${t('chain.title')}`,
})
useIntervalFn(fetchSubmissions, 5000)
bus.on(fetchSubmissions)
</script>

<template>
  <div>
    <div class="font-bold text-lg">
      {{ $t('if.scramble.label') }}
    </div>
    <NuxtLink :to="`/chain/${scramble.number}`">
      <Sequence :sequence="scramble.scramble" :source="scramble.scramble" />
    </NuxtLink>
    <CubeExpanded :moves="scramble.scramble" />
    <div class="flex flex-wrap gap-2 mt-2">
      <NuxtLink
        v-for="phase in phases"
        :key="phase"
        :to="`/chain/${scramble.number}/phase/${phase}`"
        :class="{ 'text-blue-500': phase !== params.phase }"
      >
        {{ phase }}
      </NuxtLink>
    </div>
    <div class="flex gap-1 flex-wrap text-xs text-white mt-2">
      <div class="bg-blue-500 px-2 py-1">
        {{ $t('chain.status.yet') }}
      </div>
      <div class="bg-green-500 px-2 py-1">
        {{ $t('chain.status.latest') }}
      </div>
      <div class="bg-yellow-500 px-2 py-1">
        {{ $t('chain.status.declined') }}
      </div>
      <div class="bg-gray-500 px-2 py-1">
        {{ $t('chain.status.viewed') }}
      </div>
    </div>
    <Submissions class="mt-2" :submissions="submissions" sortable chain />
  </div>
</template>
