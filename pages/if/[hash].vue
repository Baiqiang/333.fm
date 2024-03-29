<script setup lang="ts">
// definePageMeta({
//   alias: [
//     '/if/:hash',
//     '/sf/:hash',
//   ],
// })
const { params, path } = useRoute()
const router = useRouter()
const { t } = useI18n()
const { data: finder } = await useApi<InsertionFinder>(`/if/${params.hash}`)
if (!finder.value) {
  throw createError({
    statusCode: 404,
    message: t('error.404'),
  })
}

if ((finder.value.type === IFType.SLICEY_FINDER && path.startsWith('/if'))
  || (finder.value.type === IFType.INSERTION_FINDER && path.startsWith('/sf'))) {
  router.replace({
    path: `/${finder.value.type === IFType.INSERTION_FINDER ? 'if' : 'sf'}/${params.hash}`,
  })
}

useSeoMeta({
  title: t('common.resultTitle', { t: finder.value.type === IFType.INSERTION_FINDER ? t('if.title') : t('sf.title') }),
})

const commentedSkeleton = computed<string>(() => {
  if (!finder.value)
    return ''

  return finder.value!.skeleton.split('\n').map((part: string) => {
    const s = part.split('//')
    if (s.length === 1)
      return s[0]

    return `${s[0]}<span class="text-gray-400">//${s.slice(1, s.length).join('//')}</span>`
  }).join('\n')
})
const scramble = computed<string>(() => finder.value?.scramble ?? '')
const skeleton = computed<string>(() => finder.value?.skeleton ?? '')
const realSkeleton = computed<string>(() => finder.value?.realSkeleton ?? '')
const formatedCycleDetail = computed<string>(() => {
  if (!finder.value)
    return ''
  return formatCycleDetail(finder.value.cycleDetail)
})
const algKeys = [
  '3CP',
  '3CP-pure',
  '2x2CP',
  'CO',
  'C-other',
  '3EP',
  '2x2EP',
  'EO',
  'E-other',
  'parity',
  'extras/parity',
  'center',
  '3CP3EP',
  'no-parity-other',
  'extras/no-parity-other',
]
const sortedAlgs = computed<string[]>(() => (finder.value?.algs ?? []).sort((a, b) => algKeys.indexOf(a) - algKeys.indexOf(b)))
const cycles = computed<Partial<Cycles>>(() => {
  if (!finder.value)
    return {}
  const cycles = finder.value.cycles
  const result: Partial<Cycles> = {}
  for (const [key, cycle] of Object.entries(cycles)) {
    if (cycle)
      result[key as keyof Cycles] = cycle
  }

  return result
})
const greedy = computed<number>(() => finder.value?.greedy ?? 0)
const status = computed<number>(() => finder.value?.status ?? -1)
const duration = computed<string>(() => {
  if (!finder.value)
    return ''
  const nanoseconds = finder.value.result?.duration ?? 0
  const milliseconds = nanoseconds / 1e6
  const seconds = nanoseconds / 1e9
  const minutes = Math.floor(seconds / 60)
  if (seconds < 1)
    return `${milliseconds}ms`

  if (minutes < 1)
    return `${seconds}s`

  return `${minutes}m${Math.floor(seconds % 60)}s`
})
const fewestMoves = computed(() => finder.value?.result?.fewest_moves ?? '-')
const result = computed<IFResult | null>(() => finder.value?.result ?? null)
const isIF = computed(() => finder.value?.type === IFType.INSERTION_FINDER)
const form = useIFForm()
const localForm = useLocalStorage('form.if', form.$state)
function findThis() {
  const scramble = finder.value?.scramble ?? ''
  const skeleton = finder.value?.skeleton ?? ''
  const algs = finder.value?.algs ?? []
  const greedy = finder.value?.greedy ?? 0
  localForm.value = {
    scramble,
    skeleton,
    algs,
    greedy,
    name: localForm.value.name,
  }
  router.push({
    path: '/if',
  })
}

if (status.value !== IFStatus.FINISHED) {
  const { pause } = useIntervalFn(async () => {
    const { data, error } = await useApi<InsertionFinder>(`/if/${params.hash}`)
    if (error.value)
      return

    finder.value = data.value
    if (status.value === IFStatus.FINISHED)
      pause()
  }, 1000)
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-y-1 mt-4">
    <div v-if="isIF" class="md:col-span-2 flex justify-end">
      <button class="bg-indigo-500 px-2 py-1 text-white hover:bg-opacity-80" @click="findThis">
        {{ $t('if.find') }}
      </button>
    </div>
    <template v-if="finder?.type === 0">
      <div class="font-bold">
        {{ $t('if.scramble.label') }}
      </div>
      <div>
        <Sequence :sequence="scramble" />
        <CubeExpanded :moves="scramble" />
      </div>
      <div class="font-bold">
        {{ $t('if.skeleton.label') }}
      </div>
      <div>
        <Sequence :sequence="commentedSkeleton" html />
        <hr class="my-2">
        <div v-if="formatedCycleDetail">
          {{ $t('if.skeleton.to', { length: formatAlgorithmToArray(realSkeleton).length, detail: formatedCycleDetail }) }}
        </div>
        <CubeExpanded :moves="`${scramble}\n${skeleton}`" best />
      </div>
      <div class="font-bold">
        {{ $t('if.algs.label') }}
      </div>
      <div class="flex flex-wrap gap-1">
        <div v-for="alg in sortedAlgs" :key="alg" class="text-sm px-1 whitespace-nowrap flex items-center" :class="getBadgeClass(alg)">
          {{ $t(`if.algs.${alg}.label`) }}
        </div>
      </div>
      <div class="font-bold">
        {{ $t('if.cycles.label') }}
      </div>
      <div>
        <div class="grid grid-cols-[100px_1fr]">
          <template v-for="cycle, key in cycles" :key="key">
            <div class="">
              {{ $t(`if.cycles.${key}`) }}
            </div>
            <div>
              {{ key === 'parity' ? $t('common.yes') : cycle }}
            </div>
          </template>
        </div>
      </div>
      <div class="font-bold">
        {{ $t('if.greedy.label') }}
      </div>
      <div>
        {{ greedy }}
      </div>
    </template>
    <template v-else>
      <div class="font-bold">
        {{ $t('if.skeleton.label') }}
      </div>
      <div>
        <Sequence :sequence="skeleton" />
      </div>
    </template>
    <div class="font-bold">
      {{ $t('common.status') }}
    </div>
    <div class="col-xs-12 col-sm-9 flex items-center content-start">
      <Spinner v-if="status === 0" class="w-6 h-6 mr-1 text-red-600 border-[3px]" />
      <Spinner v-if="status === 1" class="w-6 h-6 mr-1 text-blue-600 border-[3px]" />
      {{ $t(`if.status.${status}`) }}
    </div>
    <template v-if="status === 2">
      <div class="font-bold">
        {{ $t('if.duration') }}
      </div>
      <div>
        {{ duration }}
      </div>
      <div class="font-bold">
        {{ $t('if.fewestmoves') }}
      </div>
      <div>
        {{ fewestMoves }}
      </div>
      <div class="font-bold">
        {{ $t('if.solutions.label') }}
      </div>
      <div v-if="!result">
        {{ $t('if.solutions.exceed') }}
      </div>
      <div v-else-if="!result.solutions.length">
        {{ $t('if.solutions.noProper') }}
      </div>
      <div v-else>
        <template v-if="!result.solutions[0].merged_insertions">
          <IfSolution v-for="(solution, index) in result.solutions" :key="index" :solution="solution" :merged="false" :is-if="isIF" />
        </template>
        <template v-else>
          <Tabs>
            <Tab :name="$t('if.solutions.merged')">
              <IfSolution v-for="(solution, index) in result.solutions" :key="index" :solution="solution" :merged="true" :is-if="isIF" />
            </Tab>
            <Tab :name="$t('if.solutions.expanded')">
              <IfSolution v-for="(solution, index) in result.solutions" :key="index" :solution="solution" :merged="false" :is-if="isIF" />
            </Tab>
          </Tabs>
        </template>
      </div>
    </template>
  </div>
</template>
