<script setup lang="ts">
const props = defineProps<{
  endless: Endless
}>()
const { data } = await useApi<{ submissions: Submission[] }>(`/endless/${props.endless.alias}/user-stats`)

interface PersonalResult {
  level: number
  moves: number
  mo3: number
  ao5: number
  ao12: number
  mean: number
  unlimited: boolean
}

const stats = computed<{
  results: PersonalResult[]
  movesCount: {
    moves: number
    count: number
  }[]
  best: {
    single: number
    mean: number
    mo3: number
    ao5: number
    ao12: number
  }
  worst: {
    single: number
    mean: number
    mo3: number
    ao5: number
    ao12: number
  }
}>(() => {
  const results: PersonalResult[] = []
  const movesCountMap: Record<number, {
    moves: number
    count: number
  }> = {}
  const moves: number[] = []
  const best = {
    single: Number.POSITIVE_INFINITY,
    mean: Number.POSITIVE_INFINITY,
    mo3: Number.POSITIVE_INFINITY,
    ao5: Number.POSITIVE_INFINITY,
    ao12: Number.POSITIVE_INFINITY,
  }
  const worst = {
    single: Number.NEGATIVE_INFINITY,
    mean: Number.NEGATIVE_INFINITY,
    mo3: Number.NEGATIVE_INFINITY,
    ao5: Number.NEGATIVE_INFINITY,
    ao12: Number.NEGATIVE_INFINITY,
  }
  for (const submission of (data.value?.submissions || [])) {
    movesCountMap[submission.moves] = {
      moves: submission.moves,
      count: (movesCountMap[submission.moves]?.count || 0) + 1,
    }
    moves.push(submission.moves)
    const mo3 = aoN(moves, 3, true)
    const ao5 = aoN(moves, 5)
    const ao12 = aoN(moves, 12)
    const mean = aoN(moves, 0, true)
    if (submission.moves < best.single)
      best.single = submission.moves
    if (submission.moves > worst.single)
      worst.single = submission.moves
    if (mo3 < best.mo3)
      best.mo3 = mo3
    if (mo3 > worst.mo3)
      worst.mo3 = mo3
    if (ao5 < best.ao5)
      best.ao5 = ao5
    if (ao5 > worst.ao5)
      worst.ao5 = ao5
    if (ao12 < best.ao12)
      best.ao12 = ao12
    if (ao12 > worst.ao12)
      worst.ao12 = ao12
    if (mean < best.mean)
      best.mean = mean
    if (mean > worst.mean)
      worst.mean = mean

    results.push({
      level: results.length + 1,
      moves: submission.moves,
      mo3,
      ao5,
      ao12,
      mean,
      unlimited: submission.mode === CompetitionMode.UNLIMITED,
    })
  }

  results.reverse()

  return {
    results,
    movesCount: Object.values(movesCountMap).sort((a, b) => a.moves - b.moves),
    best,
    worst,
  }
})
const best = computed(() => stats.value.best)
const worst = computed(() => stats.value.worst)
const movesCount = computed(() => stats.value.movesCount)

function getClass(value: number, best: number, worst: number, unlimited = false) {
  const cls = []
  if (value === best)
    cls.push('bg-green-500 text-white')
  if (value === worst)
    cls.push('bg-red-500 text-white')
  if (cls.length > 0)
    cls.push('py-1')
  if (unlimited) {
    if (cls.length === 0) {
      cls.push('bg-orange-500')
    }
    else {
      cls.push('bg-gradient-to-r from-orange-500 from-50% to-50%')
      if (value === best)
        cls.push('to-green-500')
      if (value === worst)
        cls.push('to-red-500')
    }
  }
  return cls.join(' ')
}
</script>

<template>
  <div class="mt-4">
    <h4 class="font-bold mb-2">
      {{ $t(`endless.stats.personal`) }}
    </h4>
    <div class="grid auto-cols-max gap-x-2 gap-y-0 text-center">
      <div class="grid grid-cols-subgrid col-span-6 font-bold bg-gray-200 py-1">
        <div class="px-2">
          Level
        </div>
        <div class="px-2">
          {{ $t('weekly.results') }}
        </div>
        <div class="px-2">
          Mo3
        </div>
        <div class="px-2">
          Ao5
        </div>
        <div class="px-2">
          Ao12
        </div>
        <div class="px-2">
          {{ $t('result.mean') }}
        </div>
      </div>
      <div v-for="r in stats.results" :key="r.level" class="grid grid-cols-subgrid col-span-6 font-mono odd:bg-gray-200 items-center">
        <div class="">
          {{ r.level }}
        </div>
        <div class="font-bold py-1" :class="getClass(r.moves, best.single, worst.single, r.unlimited)">
          {{ formatResult(r.moves) }}
        </div>
        <div :class="getClass(r.mo3, best.mo3, worst.mo3)">
          {{ formatResult(r.mo3, 2) }}
        </div>
        <div :class="getClass(r.ao5, best.ao5, worst.ao5)">
          {{ formatResult(r.ao5, 2) }}
        </div>
        <div :class="getClass(r.ao12, best.ao12, worst.ao12)">
          {{ formatResult(r.ao12, 2) }}
        </div>
        <div :class="getClass(r.mean, best.mean, worst.mean)">
          {{ formatResult(r.mean, 2) }}
        </div>
      </div>
    </div>
    <div class="grid auto-cols-max gap-x-2 gap-y-0 text-center mt-4">
      <div class="grid grid-cols-subgrid col-span-2 font-bold bg-gray-200 py-1">
        <div class="px-2">
          {{ $t('endless.stats.moves') }}
        </div>
        <div class="px-2">
          {{ $t('endless.stats.count') }}
        </div>
      </div>
      <div v-for="m in movesCount" :key="m.moves" class="grid grid-cols-subgrid col-span-2 font-mono odd:bg-gray-200 items-center">
        <div class="py-1">
          {{ formatResult(m.moves) }}
        </div>
        <div>
          {{ m.count }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unlimited-best {
  background-image: linear-gradient(to right, theme('colors.orange.500') 50%, theme('colors.green.500') 50%);
}
</style>
