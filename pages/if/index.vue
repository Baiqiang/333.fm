<script setup lang="ts">
import { Algorithm, centerCycleTable, Cube } from 'insertionfinder'

const { t } = useI18n()
useSeoMeta({
  title: t('if.title'),
})
const user = useUser()
const router = useRouter()
const form = useIFForm()
const localForm = useLocalStorage('form.if', form.$state)
onMounted(() => {
  form.$patch(localForm.value)
})
form.$subscribe((_, state) => {
  localForm.value = state
})
const scrambleState = computed<boolean | null>(() => {
  if (form.scramble.length === 0)
    return null

  try {
    const formatted = formatAlgorithmToArray(form.scramble)
    return formatted.length > 0 && formatted.length <= 50
  }
  catch (e) {
    return false
  }
})
const formattedSkeletonLength = computed<number>(() => {
  if (!scrambleState.value)
    return 0

  try {
    const alg = new Algorithm(removeComment(form.skeleton))
    return alg.length
  }
  catch (e) {
    return 0
  }
})
const skeletonState = computed<boolean | null>(() => {
  if (form.skeleton.length === 0)
    return null

  try {
    const formatted = formatAlgorithmToArray(form.skeleton)
    return formatted.length <= 50
  }
  catch (e) {
    return false
  }
})
const bestCube = computed<Cube | null>(() => {
  if (!scrambleState.value || !skeletonState.value)
    return null
  try {
    const cube = new Cube()
    cube.twist(new Algorithm(formatAlgorithm(form.scramble)))
    cube.twist(new Algorithm(removeComment(form.skeleton)))
    return cube.getBestPlacement()
  }
  catch (e) {
    return null
  }
})
const cycles = computed<Partial<Cycles>>(() => {
  if (!scrambleState.value || !skeletonState.value)
    return {}
  if (!bestCube.value)
    return {}
  try {
    const corners = bestCube.value.getCornerCycles()
    const edges = bestCube.value.getEdgeCycles()
    const centers = centerCycleTable[bestCube.value.placement]
    const parity = bestCube.value.hasParity()
    const cycles: Partial<Cycles> = { }
    if (corners > 0)
      cycles.corners = corners
    if (edges > 0)
      cycles.edges = edges
    if (centers > 0)
      cycles.centers = centers
    if (parity)
      cycles.parity = parity
    return cycles
  }
  catch (e) {
    return {}
  }
})

const formatedCycleDetail = computed<string>(() => {
  if (!bestCube.value)
    return ''
  const placement = bestCube.value.placement
  const centerCycles = centerCycleTable[placement]
  const cycleDetail = {
    corner: bestCube.value.getCornerStatus(),
    edge: bestCube.value.getEdgeStatus(),
    center: centerCycles > 0
      ? [
          {
            length: centerLength(centerCycles, placement),
          },
        ]
      : [],
  }
  return formatCycleDetail(cycleDetail)
})
const totalCycle = computed<number>(() => {
  if (!cycles.value)
    return 0
  let total = 0
  if (cycles.value.corners)
    total += cycles.value.corners * 2
  if (cycles.value.edges)
    total += cycles.value.edges * 2
  if (cycles.value.centers) {
    total += cycles.value.centers * 2
    if (cycles.value.parity && cycles.value.centers === 1)
      total += 3
  }
  return total
})
const cycleState = computed<boolean>(() => {
  return totalCycle.value <= 10
})
const algTypes = [
  {
    type: 'corner',
    list: [
      '3CP',
      '3CP-pure',
      '2x2CP',
      'CO',
      'C-other',
    ],
  },
  {
    type: 'edge',
    list: [
      '3EP',
      '2x2EP',
      'EO',
      'E-other',
    ],
  },
  {
    type: 'other',
    list: [
      '3CP3EP',
      'parity',
      'center',
      'no-parity-other',
    ],
  },
  {
    type: 'extra',
    list: [
      'extras/parity',
      'extras/no-parity-other',
    ],
  },
]
const suggestAlgs = computed<string[]>(() => {
  const suggestAlgs = []
  if (cycles.value.corners! > 0) {
    suggestAlgs.push('3CP')
    suggestAlgs.push('3CP-pure')
  }
  if (cycles.value.edges! > 0)
    suggestAlgs.push('3EP')

  if (cycles.value.centers! > 0)
    suggestAlgs.push('center')

  if (cycles.value.parity)
    suggestAlgs.push('parity')

  return suggestAlgs
})
const formState = computed<boolean>(() => {
  return scrambleState.value === true && skeletonState.value === true && form.algs.length > 0 && cycleState.value === true
})
function checkAll() {
  form.algs = algTypes.reduce((algs: string[], type) => [...algs, ...type.list], [])
}
function checkNone() {
  form.algs = []
}
function checkNecessary() {
  form.algs = suggestAlgs.value
}
async function submit() {
  try {
    const { data, refresh } = await useApiPost<InsertionFinder>('/if', {
      body: {
        type: IFType.INSERTION_FINDER,
        name: form.name,
        scramble: form.scramble,
        skeleton: form.skeleton,
        algs: form.algs,
        greedy: form.greedy,
      },
      immediate: false,
    })
    await refresh()
    router.push({
      path: `/if/${data.value!.hash}`,
    })
  }
  catch (e: any) {
    if (e.response && e.response.data && e.response.data.message)
      alert(e.response.data.message)

    else alert(e.message)
  }
}
function reset() {
  form.name = ''
  form.scramble = ''
  form.skeleton = ''
  form.algs = []
  form.greedy = 2
}
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold py-3">
      {{ $t('if.title') }}
    </h1>
    <p class="mb-2" v-html="$t('if.description')" />
    <form class="pb-20" @submit="submit" @reset="reset">
      <button class="px-2 py-1 text-white bg-gray-500 focus:outline-none" @click.prevent="reset">
        {{ $t('form.reset') }}
      </button>
      <FormInput
        v-if="user.signedIn"
        v-model="form.name"
        type="text"
        :label="$t('if.name.label')"
        :state="null"
        class="my-4"
        :attrs="{ maxlength: 200 }"
      >
        <template #description>
          <p class="py-1" v-html="$t('if.name.description')" />
        </template>
      </FormInput>
      <FormInput
        v-model="form.scramble"
        type="text"
        :label="$t('if.scramble.label')"
        :state="scrambleState"
        :error-message="$t('if.scramble.invalid')"
        :attrs="{ required: true }"
      >
        <CubeExpanded v-if="scrambleState" class="my-2" :moves="form.scramble" />
        <template v-if="scrambleState !== false" #description>
          <I18nT keypath="if.scramble.description" tag="p" scope="global">
            <template #notation>
              <Notation />
            </template>
          </I18nT>
        </template>
      </FormInput>
      <FormInput
        v-model="form.skeleton"
        type="textarea"
        :rows="4"
        :label="$t('if.skeleton.label')"
        :state="skeletonState && cycleState"
        :error-message="$t('if.skeleton.invalid')"
        :attrs="{ required: true }"
        class="mt-4"
      >
        <CubeExpanded v-if="scrambleState && skeletonState" class="my-2" :moves="`${form.scramble}\n${form.skeleton}`" />
        <template #description>
          <div>
            STM: {{ algLength(form.skeleton, TurnMetric.STM) }}
          </div>
          <div>
            ATM: {{ algLength(form.skeleton, TurnMetric.ATM) }}
          </div>
          <div>
            QTM: {{ algLength(form.skeleton, TurnMetric.QTM) }}
          </div>
          <div>
            HTM: {{ algLength(form.skeleton, TurnMetric.HTM) }}
          </div>
          <div v-if="formatedCycleDetail" class="text-green-600">
            {{ $t('if.skeleton.to', { length: formattedSkeletonLength, detail: formatedCycleDetail }) }}
          </div>
          <div v-else-if="skeletonState" class="text-green-600">
            {{ $t('if.skeleton.solved', { length: formattedSkeletonLength }) }}
          </div>
          <div v-if="!cycleState" class="text-red-500">
            {{ $t('if.solutions.exceed') }}
          </div>
          <div v-else-if="scrambleState && skeletonState && totalCycle > 0" class="text-green-600">
            {{ $t('if.cycles.label') }}:
            <span v-for="cycle, key in cycles" :key="key" class="mr-1">
              <b>{{ $t(`if.cycles.${key}`) }}</b>: {{ cycle }}
            </span>
          </div>
          <p class="py-1" v-html="$t('if.skeleton.description')" />
          <ol class="list-inside list-decimal">
            <I18nT keypath="if.skeleton.list.0" tag="li" scope="global">
              <template #notation>
                <Notation />
              </template>
            </I18nT>
            <li>{{ $t('if.skeleton.list.1') }}</li>
            <li>{{ $t('if.skeleton.list.2') }}</li>
          </ol>
        </template>
      </FormInput>
      <FormInput
        :label="$t('if.algs.label')"
      >
        <div class="flex md:mt-2">
          <button class=" bg-green-600 focus:outline-none text-white px-2 py-1" @click.prevent="checkAll">
            {{ $t('if.algs.all') }}
          </button>
          <button class="bg-gray-500 focus:outline-none text-white px-2 py-1" @click.prevent="checkNone">
            {{ $t('if.algs.none') }}
          </button>
          <button class=" bg-sky-500 focus:outline-none text-white px-2 py-1" @click.prevent="checkNecessary">
            {{ $t('if.algs.necessary') }}
          </button>
        </div>
        <div v-for="{ type, list } in algTypes" :key="type">
          <div class="font-bold">
            {{ $t(`if.algs.${type}.label`) }}
          </div>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="alg in list"
              :key="alg"
              class="flex items-center gap-1"
              :class="{ 'border-b border-red-500 border-opacity-50': suggestAlgs.indexOf(alg) > -1 }"
            >
              <input v-model="form.algs" :value="alg" type="checkbox" class="border-gray-300 text-if focus:outline-if focus:ring-if focus:ring-2">
              <span class="whitespace-nowrap">{{ $t(`if.algs.${alg}.label`) }}</span>
              <a :href="`https://github.com/xuanyan0x7c7/insertionfinder/blob/master/data/algorithms/${alg}.txt`" target="_blank" class="text-sky-500">
                <Icon name="solar:question-circle-linear" />
              </a>
            </label>
          </div>
        </div>
        <div v-if="form.algs.length === 0" class="text-sm py-1 text-red-500">
          {{ $t('if.algs.description') }}
        </div>
      </FormInput>
      <FormInput
        v-model.number="form.greedy"
        type="range"
        :label="$t('if.greedy.label')"
        :attrs="{ required: true, min: 0, max: 6, class: 'mt-4', disabled: !user.signedIn }"
        class="mt-4"
      >
        <div>
          {{ form.greedy }}
          <NuxtLink v-if="!user.signedIn" to="/sign-in">
            {{ $t('common.signingInRequired') }}
          </NuxtLink>
        </div>
        <template #description>
          {{ $t('if.greedy.description') }}
        </template>
      </FormInput>
      <div class="mt-4">
        <button
          class="px-2 py-1 text-white bg-blue-500 focus:outline-none"
          :class="{ 'bg-opacity-50 cursor-not-allowed': !formState }"
          :disabled="!formState"
          @click.prevent="submit"
        >
          {{ $t('form.submit') }}
        </button>
        <button class="px-2 py-1 text-white bg-gray-500 focus:outline-none ml-2" @click.prevent="reset">
          {{ $t('form.reset') }}
        </button>
      </div>
    </form>
  </div>
</template>
