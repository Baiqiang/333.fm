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

const submissions = ref<Submission[]>([])
const phases = computed(() => flattenPhases(scramble.value, tree.value))
const flatSkeleton = flattenSkeleton(tree.value)
await fetchData()
async function fetchData() {
  fetchSubmissions()
  fetchTree()
}
async function fetchTree() {
  const { data, refresh } = await useApi<{ scramble: Scramble, tree: Submission | null }>(`${apiPath.value}`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    tree.value = data.value.tree
}
async function fetchSubmissions() {
  const { data, refresh } = await useApi<Submission[]>(`${apiPath.value}/submissions`, {
    immediate: false,
  })
  await refresh()
  for (const submission of data.value || []) {
    submission.scramble = scramble.value
    submission.parent = tree.value
  }
  if (data.value)
    submissions.value = data.value
}
useSeoMeta({
  title: `${t('weekly.scramble', { number: params.number })} - ${t('chain.title')}`,
})
useIntervalFn(fetchSubmissions, 5000)
bus.on(fetchData)
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
      <Sequence :sequence="scramble.scramble" :source="scramble.scramble" />
    </NuxtLink>
    <div v-if="tree" class="my-2">
      <ChainPhase
        v-for="phase in phases"
        :key="phase.phase"
        v-bind="phase"
        comment
        link
      />
      <div class="italic text-sm mt-1">
        * {{ $t('chain.tip') }}
      </div>
    </div>
    <CubeExpanded :moves="scramble.scramble + flatSkeleton" />
    <ChainForm :scramble="scramble" :tree="tree" :submissions="submissions" @submitted="fetchSubmissions" />
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
