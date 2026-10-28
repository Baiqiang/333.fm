<script setup lang="ts">
import type { HTRSubsetStat } from '~/utils/htr-subset-stats'

const props = defineProps<{
  subset: HTRSubsetStat
}>()

const emit = defineEmits<{
  close: []
  select: [name: string]
}>()

const bucket = ref(-1)
const example = ref<ReturnType<typeof randomHTRExample>>()

const rows = computed(() => [
  { label: '', distances: props.subset.distances, weight: props.subset.weight },
  ...props.subset.edges.map(e => ({ label: e.edges, distances: e.distances, weight: e.weight })),
])
const lengths = computed(() => {
  const first = props.subset.distances.findIndex(n => n > 0)
  return Array.from({ length: props.subset.distances.length - first }, (_, i) => first + i)
})

function share(n: number, total: number) {
  return n / total
}

function generate() {
  const cosets = bucket.value < 0
    ? props.subset.edges.flatMap(e => e.cosets)
    : props.subset.edges[bucket.value].cosets
  example.value = randomHTRExample(cosets)
}

watch(() => props.subset.name, () => {
  bucket.value = -1
  generate()
}, { immediate: true })
watch(bucket, generate)

onKeyStroke('Escape', () => emit('close'))

const scrollLock = useScrollLock(import.meta.client ? document.body : null)
onMounted(() => scrollLock.value = true)
onUnmounted(() => scrollLock.value = false)
</script>

<template>
  <div class="fixed inset-0 z-[60] flex md:items-center justify-center bg-black/50 md:p-6" @click="emit('close')">
    <div class="bg-white shadow-lg w-full md:max-w-3xl h-dvh md:h-auto md:max-h-[90dvh] overflow-y-auto overscroll-contain border-t-4" :class="HTR_GROUP_STYLES[subset.group].border" @click.stop>
      <div class="sticky top-0 z-10 bg-white flex items-start justify-between gap-4 px-4 md:px-5 pt-3 pb-2 mb-2 border-b border-gray-100">
        <div class="min-w-0">
          <div class="font-poppins font-semibold text-xl">
            {{ subset.name }}
            <span class="ml-1 text-sm font-normal text-gray-500">{{ subset.qt }}QT</span>
          </div>
          <div class="text-xs md:text-sm text-gray-500 tabular-nums">
            {{ (drWeightToProbability(subset.weight) * 100).toFixed(3) }}% · {{ drWeightToCount(subset.weight).toLocaleString() }}
            · {{ $t('tools.htrSubsetStats.averageHTRShort', { n: htrDistanceMean(subset.distances).toFixed(2) }) }}
          </div>
        </div>
        <button class="shrink-0 w-9 h-9 -mr-2 text-gray-400 hover:text-gray-600 text-3xl leading-none" @click="emit('close')">
          ×
        </button>
      </div>
      <div class="px-4 md:px-5 pb-6">
        <h3 class="font-poppins font-semibold mb-2">
          {{ $t('tools.htrSubsetStats.htrDistribution') }}
        </h3>
        <div class="overflow-x-auto mb-5">
          <table class="w-full text-xs tabular-nums">
            <thead>
              <tr class="text-gray-500">
                <th class="p-1 text-left">
                  {{ $t('tools.htrSubsetStats.column.edges') }}
                </th>
                <th v-for="n in lengths" :key="n" class="p-1 text-center">
                  {{ n }}
                </th>
                <th class="p-1 text-right">
                  {{ $t('tools.htrSubsetStats.average') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.label" class="border-t border-gray-100">
                <td class="p-1 font-semibold whitespace-nowrap">
                  {{ r.label || $t('tools.htrSubsetStats.all') }}
                </td>
                <td
                  v-for="n in lengths"
                  :key="n"
                  class="p-1 text-center"
                  :style="r.distances[n] ? { background: `rgba(99, 102, 241, ${Math.sqrt(share(r.distances[n], r.weight)) * 0.9})` } : {}"
                  :class="share(r.distances[n] ?? 0, r.weight) > 0.3 ? 'text-white' : ''"
                >
                  {{ r.distances[n] ? `${(share(r.distances[n], r.weight) * 100).toFixed(1)}` : '' }}
                </td>
                <td class="p-1 text-right font-semibold">
                  {{ htrDistanceMean(r.distances).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
          <p class="text-xs text-gray-500 mt-1">
            {{ $t('tools.htrSubsetStats.htrHint') }}
          </p>
        </div>

        <h3 class="font-poppins font-semibold mb-2">
          {{ $t('tools.htrSubsetStats.reachable') }}
        </h3>
        <div class="flex flex-wrap gap-2 mb-5">
          <button
            v-for="t in subset.transitions"
            :key="t.name"
            class="px-2 py-1 text-sm border transition-all duration-200 hover:bg-gray-50"
            :class="t.qt < subset.qt ? 'border-green-500 text-green-700' : 'border-gray-300 text-gray-500'"
            @click="emit('select', t.name)"
          >
            {{ t.qt < subset.qt ? '↓' : '↑' }} {{ t.name }} <span class="text-xs">{{ t.qt }}QT</span>
          </button>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 class="font-poppins font-semibold">
            {{ $t('tools.htrSubsetStats.example') }}
          </h3>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="(label, i) in [$t('tools.htrSubsetStats.all'), ...subset.edges.map(e => e.edges)]"
              :key="label"
              class="px-2 py-0.5 text-xs border transition-all duration-200"
              :class="bucket === i - 1 ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
              @click="bucket = i - 1"
            >
              {{ label }}
            </button>
            <button class="px-2 py-0.5 text-xs bg-indigo-500 hover:bg-indigo-600 text-white" @click="generate">
              {{ $t('tools.htrSubsetStats.another') }}
            </button>
          </div>
        </div>
        <div v-if="example" class="grid md:grid-cols-2 gap-4 items-start">
          <CubeExpanded :key="example.scramble" class="max-w-xs w-full mx-auto sm:max-w-none" :moves="example.scramble" />
          <div class="text-sm">
            <div class="text-gray-500 text-xs mb-1">
              {{ $t('tools.htrSubsetStats.scramble') }}
            </div>
            <div class="font-mono break-words mb-3">
              {{ example.scramble }}
            </div>
            <Spoiler :key="example.solution" :spoiled="$t('tools.htrSubsetStats.optimalHTR', { n: example.moves })">
              <div class="text-gray-500 text-xs mb-1">
                {{ $t('tools.htrSubsetStats.optimalHTR', { n: example.moves }) }}
              </div>
              <div class="font-mono break-words py-2">
                {{ example.solution || '-' }}
              </div>
            </Spoiler>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
