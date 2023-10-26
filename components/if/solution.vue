<script setup lang="ts">
const props = withDefaults(defineProps<{
  solution: Solution
  merged?: boolean
  isIf?: boolean
}>(), {
  merged: true,
})
const router = useRouter()
const formated = computed(() => {
  const indexes: Record<number, number> = {}
  const insertionSymbols: string[] = []
  const cancellations: number[] = []
  const formatedInsertions = props.solution.insertions.map(({ skeleton, insertion, insert_place: place }, index, insertions) => {
    let formattedSkeleton = skeleton.split(' ')
    let formattedInsertion = insertion.split(' ')
    const nextSkeleton = (insertions[index + 1] && insertions[index + 1].skeleton) || props.solution.final_solution
    const firstPart = formattedSkeleton.slice(0, place)
    const lastPart = formattedSkeleton.slice(place)
    const rotations = formattedInsertion.filter(notation => isRotation(notation))
    const cancelled = algLength(skeleton) + formattedInsertion.length - rotations.length - algLength(nextSkeleton)
    if (!indexes[cancelled])
      indexes[cancelled] = 0

    const insertionSymbol = (emojis[cancelled] && emojis[cancelled][indexes[cancelled]++]) || `@${index + 1}`
    // calulate marks
    const marks = calcMarks(firstPart, insertion, lastPart)
    applyMarks([
      firstPart,
      formattedInsertion,
      lastPart,
    ], marks)
    formattedSkeleton = [...firstPart, insertionSymbol, ...lastPart]
    formattedInsertion = [...formattedInsertion, `(${formattedInsertion.length - rotations.length}-${cancelled})`]
    cancellations.push(cancelled)
    insertionSymbols.push(insertionSymbol)
    return {
      skeleton,
      formattedSkeleton: formattedSkeleton.join(' '),
      insertions: [
        {
          place,
          cancelled,
          formattedInsertion: formattedInsertion.join(' '),
          insertionSymbol,
        },
      ],
    }
  })
  let index = 0
  const formatedMergedInsertions = (props.solution.merged_insertions ?? []).map(({ skeleton, insertions }) => {
    if (insertions.length === 0) {
      return {
        skeleton,
        formattedSkeleton: skeleton,
        insertions: [],
      }
    }
    const parts: string[][] = []
    let formattedSkeleton = skeleton.split(' ')
    let i: number
    for (i = 0; i < insertions.length; i++) {
      const lastPlace = insertions[i - 1]?.insert_place || 0
      const part = formattedSkeleton.slice(lastPlace, insertions[i].insert_place)
      parts.push(part)
      insertions[i].algorithms.forEach(({ algorithm }) => {
        parts.push(algorithm.split(' '))
      })
    }
    parts.push(formattedSkeleton.slice(insertions[i - 1].insert_place))
    const marks = calcMarks(...parts)
    applyMarks(parts, marks)
    formattedSkeleton = []
    const _insertions: FormatedInsertionDetail[] = []
    let j = 0
    let k = 0
    for (i = 0; i < insertions.length; i++) {
      formattedSkeleton.push(parts[j++].join(' '))
      insertions[i].algorithms.forEach(({ order }) => {
        const formattedInsertion = parts[j++]
        const rotations = formattedInsertion.filter(isRotation)
        const cancelled = cancellations[order + index]
        const insertionSymbol = insertionSymbols[order + index]
        _insertions.push({
          place: insertions[i].insert_place,
          cancelled,
          formattedInsertion: [...formattedInsertion, `(${formattedInsertion.length - rotations.length}-${cancelled})`].join(' '),
          insertionSymbol,
        })
        formattedSkeleton.push(insertionSymbol)
      })
      k += insertions[i].algorithms.length
    }
    index += k
    formattedSkeleton.push(parts[j++].join(' '))
    return {
      skeleton,
      formattedSkeleton: formattedSkeleton.join(' ').trim(),
      insertions: _insertions,
    }
  })

  return {
    formatedInsertions,
    formatedMergedInsertions,
  }
})
const _insertions = computed(() => props.merged ? formated.value.formatedMergedInsertions : formated.value.formatedInsertions)
const loading = ref(false)
async function findThis() {
  loading.value = true
  try {
    const { data, refresh } = await useApiPost<InsertionFinder>('/if', {
      body: {
        type: IFType.SLICEY_FINDER,
        name: '',
        skeleton: props.solution.final_solution,
      },
      immediate: false,
    })
    await refresh()
    router.push({
      path: `/sf/${data.value!.hash}`,
    })
  }
  catch (e: any) {
    if (e.response && e.response.data && e.response.data.message)
      alert(e.response.data.message)

    else
      alert(e.message)
  }
  loading.value = false
}
</script>

<template>
  <div class="py-3 grid grid-cols-12 gap-x-3 gap-y-1">
    <div class="font-semibold col-span-12 md:col-span-3 lg:col-span-2">
      {{ $t('if.solutions.insertions') }}
    </div>
    <div class="col-span-12 md:col-span-9">
      {{ solution.insertions.length }}
    </div>
    <template v-for="{ formattedSkeleton, insertions }, i in _insertions" :key="i">
      <div class="font-semibold col-span-12 md:col-span-3 lg:col-span-2">
        {{ $t('if.skeleton.label') }}
      </div>
      <div class="col-span-12 md:col-span-9">
        <pre class="whitespace-pre-wrap" v-html="formattedSkeleton" />
      </div>
      <template v-for="{ insertionSymbol, formattedInsertion }, j in insertions" :key="`${i}-${j}`">
        <div class="font-semibold col-span-12 md:col-span-3 lg:col-span-2">
          {{ insertionSymbol }}:
        </div>
        <div class="col-span-12 md:col-span-9">
          <pre class="whitespace-pre-wrap bg-gray-200" v-html="formattedInsertion" />
        </div>
      </template>
    </template>
    <div class="font-semibold col-span-12 md:col-span-3 lg:col-span-2">
      {{ $t('if.solutions.final') }}
    </div>
    <div class="col-span-12 md:col-span-9">
      <pre class="whitespace-pre-wrap">{{ solution.final_solution }}</pre>
      <button
        v-if="isIf"
        class="bg-indigo-500 text-white px-2 py-1 text-sm h-7"
        @click="findThis"
      >
        <Spinner v-if="loading" class="w-4 h-4 text-white border-[3px]" />
        <template v-else>
          {{ $t('sf.title') }}
        </template>
      </button>
    </div>
    <div class="font-semibold col-span-12 md:col-span-3 lg:col-span-2">
      {{ $t('if.solutions.cancellation') }}
    </div>
    <div class="col-span-12 md:col-span-9">
      {{ solution.cancellation }}
    </div>
  </div>
</template>
