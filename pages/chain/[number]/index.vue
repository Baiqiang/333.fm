<script setup lang="ts">
const { t } = useI18n()
const { params } = useRoute()
const router = useRouter()
const bus = useEventBus('submission')
const apiPath = computed<string>(() => `/chain/${params.number}${params.id ? `/${params.id}` : ''}`)
const { data, error } = await useApi<{ scramble: Scramble, tree: Submission | null }>(apiPath.value)
if (!data.value || error.value) {
  throw createError({
    statusCode: 404,
  })
}
const scramble = ref<Scramble>(data.value.scramble)
const tree = ref<Submission | null>(data.value.tree)
if (tree.value && tree.value.phase === SubmissionPhase.INSERTIONS)
  router.push(`/chain/${scramble.value.number}/${tree.value.parentId}`)

const top10 = ref<Submission[]>([])
const submissions = ref<Submission[]>([])
const phases = computed(() => flattenPhases(scramble.value, tree.value))
const flatSkeleton = flattenSkeleton(tree.value)
await fetchData()
async function fetchData() {
  fetchSubmissions()
  fetchTop10()
}
async function fetchSubmissions() {
  const { data, refresh } = await useApi<Submission[]>(`${apiPath.value}/submissions`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    submissions.value = data.value
}
async function fetchTop10() {
  const { data, refresh } = await useApi<Submission[]>(`/chain/${params.number}/top10`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    top10.value = data.value
}
useSeoMeta({
  title: `${t('weekly.scramble', { number: params.number })} - ${t('chain.title')}`,
})
useIntervalFn(fetchSubmissions, 5000)
bus.on(fetchSubmissions)
</script>

<template>
  <div>
    <h2 class="font-bold my-2">
      {{ $t('common.basicRules') }}
    </h2>
    <ol class="text-sm mb-2 list-decimal list-inside marker:text-blue-500">
      <li v-for="m, i in $tm('chain.rules')" :key="i">
        {{ m }}
      </li>
    </ol>
    <div class="font-bold text-lg">
      {{ $t('if.scramble.label') }}
    </div>
    <NuxtLink :to="`/chain/${scramble.number}`">
      <Sequence :sequence="scramble.scramble" />
    </NuxtLink>
    <div v-if="tree" class="my-2">
      <ChainPhase
        v-for="phase in phases"
        :key="phase.phase"
        v-bind="phase"
        comment
        link
      />
    </div>
    <CubeExpanded :moves="scramble.scramble + flatSkeleton" />
    <ChainForm :scramble="scramble" :tree="tree" @submitted="fetchSubmissions" />
    <Submissions :submissions="submissions" sortable chain :chained-skeleton="scramble.scramble + flatSkeleton" />
  </div>
</template>
