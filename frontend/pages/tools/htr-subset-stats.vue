<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('tools.htrSubsetStats.title'),
})

const { subsets, groups, qt, distances } = getHTRSubsetStats()

const view = ref<'grouped' | 'sorted'>('grouped')
const selectedName = ref<string>()
const selected = computed(() => subsets.find(s => s.name === selectedName.value))

const averageQT = qt.reduce((sum, r) => sum + r.qt * drWeightToProbability(r.weight), 0)
const lowQTWeight = qt.filter(r => r.qt <= 2).reduce((sum, r) => sum + r.weight, 0)
const maxQT = Math.max(...qt.map(r => r.weight))
const maxGroup = Math.max(...groups.map(g => g.weight))

const sortedRows = subsets
  .flatMap(s => s.edges.map(e => ({ key: `${s.name} ${e.edges}`, subset: s, edge: e })))
  .sort((a, b) => b.edge.weight - a.edge.weight)
const maxRowWeight = Math.max(...subsets.flatMap(s => s.edges.map(e => e.weight)))

const htrRows = [
  { name: '', group: '', weight: distances.reduce((sum, n) => sum + n, 0), distances },
  ...subsets,
]
const htrLengths = Array.from({ length: distances.length }, (_, i) => i)

function percent(weight: number, digits = 3) {
  return `${(drWeightToProbability(weight) * 100).toFixed(digits)}%`
}

function count(weight: number) {
  return drWeightToCount(weight).toLocaleString()
}
</script>

<template>
  <div class="pb-20">
    <Heading1>
      {{ $t('tools.htrSubsetStats.title') }}
    </Heading1>
    <p class="text-sm text-gray-600 mb-6">
      {{ $t('tools.htrSubsetStats.description') }}
    </p>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="bg-white shadow-md p-3 border-l-4 border-indigo-500">
        <div class="text-xl font-poppins font-semibold">
          {{ averageQT.toFixed(3) }}
        </div>
        <div class="text-xs text-gray-500">
          {{ $t('tools.htrSubsetStats.averageQT') }}
        </div>
      </div>
      <div class="bg-white shadow-md p-3 border-l-4 border-indigo-500">
        <div class="text-xl font-poppins font-semibold">
          {{ percent(lowQTWeight, 2) }}
        </div>
        <div class="text-xs text-gray-500">
          {{ $t('tools.htrSubsetStats.lowQT') }}
        </div>
      </div>
      <div class="bg-white shadow-md p-3 border-l-4 border-indigo-500">
        <div class="text-xl font-poppins font-semibold">
          {{ htrDistanceMean(distances).toFixed(3) }}
        </div>
        <div class="text-xs text-gray-500">
          {{ $t('tools.htrSubsetStats.averageHTR') }}
        </div>
      </div>
      <div class="bg-white shadow-md p-3 border-l-4 border-indigo-500">
        <div class="text-xl font-poppins font-semibold">
          {{ DR_STATE_COUNT.toLocaleString() }}
        </div>
        <div class="text-xs text-gray-500">
          {{ $t('tools.htrSubsetStats.drStates') }}
        </div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4 mb-6">
      <div class="bg-white shadow-md p-4">
        <h2 class="font-poppins font-semibold mb-3">
          {{ $t('tools.htrSubsetStats.qtDistribution') }}
        </h2>
        <div v-for="r in qt" :key="r.qt" class="flex items-center gap-2 text-sm mb-1.5">
          <div class="w-10 shrink-0 font-semibold">
            {{ r.qt }}QT
          </div>
          <div class="flex-1 bg-gray-100 h-5">
            <div class="h-full bg-indigo-500" :style="{ width: `${r.weight / maxQT * 100}%` }" />
          </div>
          <div class="w-20 text-right tabular-nums">
            {{ percent(r.weight) }}
          </div>
          <div class="w-28 text-right text-gray-500 tabular-nums">
            {{ count(r.weight) }}
          </div>
        </div>
      </div>
      <div class="bg-white shadow-md p-4">
        <h2 class="font-poppins font-semibold mb-3">
          {{ $t('tools.htrSubsetStats.groupDistribution') }}
        </h2>
        <div v-for="g in groups" :key="g.name" class="flex items-center gap-2 text-sm mb-1.5">
          <div class="w-12 shrink-0 font-semibold">
            {{ g.name }}
          </div>
          <div class="flex-1 bg-gray-100 h-5 flex">
            <div
              v-for="s in g.subsets"
              :key="s.name"
              class="h-full border-r border-white last:border-r-0 opacity-90 text-[10px] leading-5 text-white text-center overflow-hidden"
              :class="HTR_GROUP_STYLES[g.name].bg"
              :style="{ width: `${s.weight / maxGroup * 100}%` }"
              :title="`${s.name}: ${percent(s.weight)}`"
            >
              {{ s.qt }}
            </div>
          </div>
          <div class="w-20 text-right tabular-nums">
            {{ percent(g.weight) }}
          </div>
          <div class="w-28 text-right text-gray-500 tabular-nums">
            {{ count(g.weight) }}
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          {{ $t('tools.htrSubsetStats.groupHint') }}
        </p>
      </div>
    </div>

    <div class="bg-white shadow-md p-4 mb-6">
      <h2 class="font-poppins font-semibold mb-1">
        {{ $t('tools.htrSubsetStats.transitions') }}
      </h2>
      <p class="text-xs text-gray-500 mb-2">
        {{ $t('tools.htrSubsetStats.transitionHint') }}
      </p>
      <div class="overflow-x-auto">
        <HtrSubsetTransitionGraph :subsets="subsets" @select="selectedName = $event" />
      </div>
    </div>

    <div class="bg-white shadow-md p-4 mb-6">
      <h2 class="font-poppins font-semibold mb-1">
        {{ $t('tools.htrSubsetStats.htrDistribution') }}
      </h2>
      <p class="text-xs text-gray-500 mb-2">
        {{ $t('tools.htrSubsetStats.htrHint') }}
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-xs tabular-nums">
          <thead>
            <tr class="text-gray-500">
              <th class="p-1 text-left">
                {{ $t('tools.htrSubsetStats.column.subset') }}
              </th>
              <th v-for="n in htrLengths" :key="n" class="p-1 text-center min-w-8">
                {{ n }}
              </th>
              <th class="p-1 text-right">
                {{ $t('tools.htrSubsetStats.average') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in htrRows"
              :key="r.name"
              class="border-t border-gray-100"
              :class="r.name ? 'cursor-pointer hover:bg-gray-50' : 'font-semibold'"
              @click="r.name && (selectedName = r.name)"
            >
              <td class="p-1 font-semibold whitespace-nowrap">
                <span v-if="r.group" class="inline-block w-2 h-2 rounded-full mr-1.5" :class="HTR_GROUP_STYLES[r.group].bg" />
                {{ r.name || $t('tools.htrSubsetStats.all') }}
              </td>
              <td
                v-for="n in htrLengths"
                :key="n"
                class="p-1 text-center"
                :style="r.distances[n] ? { background: `rgba(99, 102, 241, ${Math.sqrt(r.distances[n] / r.weight) * 0.9})` } : {}"
                :class="(r.distances[n] ?? 0) / r.weight > 0.3 ? 'text-white' : ''"
                :title="r.distances[n] ? `${r.name || $t('tools.htrSubsetStats.all')} · ${n}: ${(r.distances[n] / r.weight * 100).toFixed(2)}%` : ''"
              >
                {{ r.distances[n] ? (r.distances[n] / r.weight * 100).toFixed(r.distances[n] / r.weight < 0.01 ? 2 : 1) : '' }}
              </td>
              <td class="p-1 text-right font-semibold">
                {{ htrDistanceMean(r.distances).toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center justify-between mb-2">
      <div>
        <h2 class="font-poppins font-semibold text-lg">
          {{ $t('tools.htrSubsetStats.subsets') }}
        </h2>
        <p class="text-xs text-gray-500">
          {{ $t('tools.htrSubsetStats.clickHint') }}
        </p>
      </div>
      <div class="flex gap-2">
        <button
          v-for="v in (['grouped', 'sorted'] as const)"
          :key="v"
          class="px-3 py-1 text-sm border transition-all duration-200"
          :class="view === v ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
          @click="view = v"
        >
          {{ $t(`tools.htrSubsetStats.view.${v}`) }}
        </button>
      </div>
    </div>
    <div v-if="view === 'grouped'" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="s in subsets"
        :key="s.name"
        class="bg-white shadow-md p-3 border-l-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        :class="HTR_GROUP_STYLES[s.group].border"
        @click="selectedName = s.name"
      >
        <div class="flex items-baseline justify-between mb-2">
          <div class="font-poppins font-semibold">
            {{ s.name }}
            <span class="ml-1 text-xs font-normal text-gray-500">{{ s.qt }}QT</span>
          </div>
          <div class="text-sm tabular-nums">
            <span class="font-semibold">{{ percent(s.weight, 2) }}</span>
            <span class="ml-1.5 text-xs text-gray-500">{{ count(s.weight) }}</span>
          </div>
        </div>
        <div
          v-for="e in s.edges"
          :key="e.edges"
          class="flex items-center gap-2 text-xs py-0.5"
        >
          <div class="w-10 shrink-0 text-gray-600">
            {{ e.edges }}
          </div>
          <div class="flex-1 bg-gray-100 h-2.5">
            <div class="h-full" :class="HTR_GROUP_STYLES[s.group].bg" :style="{ width: `${e.weight / maxRowWeight * 100}%` }" />
          </div>
          <div class="w-14 text-right tabular-nums font-semibold">
            {{ percent(e.weight, 3) }}
          </div>
          <div class="w-24 text-right tabular-nums text-gray-500">
            {{ count(e.weight) }}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
          <span>{{ $t('tools.htrSubsetStats.averageHTRShort', { n: htrDistanceMean(s.distances).toFixed(2) }) }}</span>
          <span v-if="s.transitions.some(x => x.qt < s.qt)">
            ↓ {{ s.transitions.filter(x => x.qt < s.qt).map(x => x.name).join(', ') }}
          </span>
        </div>
      </div>
    </div>

    <div v-else class="bg-white shadow-md overflow-x-auto max-w-3xl">
      <table class="w-full text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
        <thead class="bg-indigo-500 text-white">
          <tr>
            <th class="p-2 text-right w-10">
              #
            </th>
            <th class="p-2 text-left">
              {{ $t('tools.htrSubsetStats.column.subset') }}
            </th>
            <th class="p-2 text-left">
              {{ $t('tools.htrSubsetStats.column.edges') }}
            </th>
            <th class="p-2 text-right">
              {{ $t('tools.htrSubsetStats.column.probability') }}
            </th>
            <th class="p-2 w-1/4" />
            <th class="p-2 text-right">
              {{ $t('tools.htrSubsetStats.column.count') }}
            </th>
            <th class="p-2 text-right">
              {{ $t('tools.htrSubsetStats.column.htr') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in sortedRows"
            :key="r.key"
            class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
            @click="selectedName = r.subset.name"
          >
            <td class="px-2 py-1 text-right text-gray-400 tabular-nums">
              {{ i + 1 }}
            </td>
            <td class="px-2 py-1 font-semibold">
              <span class="inline-block w-2 h-2 rounded-full mr-1.5" :class="HTR_GROUP_STYLES[r.subset.group].bg" />
              {{ r.subset.name }}
            </td>
            <td class="px-2 py-1">
              {{ r.edge.edges }}
            </td>
            <td class="px-2 py-1 text-right tabular-nums font-semibold">
              {{ percent(r.edge.weight, 4) }}
            </td>
            <td class="px-2 py-1">
              <div class="bg-gray-100 h-2.5">
                <div class="h-full" :class="HTR_GROUP_STYLES[r.subset.group].bg" :style="{ width: `${r.edge.weight / maxRowWeight * 100}%` }" />
              </div>
            </td>
            <td class="px-2 py-1 text-right tabular-nums text-gray-500">
              {{ count(r.edge.weight) }}
            </td>
            <td class="px-2 py-1 text-right tabular-nums">
              {{ htrDistanceMean(r.edge.distances).toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <HtrSubsetDetail
      v-if="selected"
      :subset="selected"
      @close="selectedName = undefined"
      @select="selectedName = $event"
    />
  </div>
</template>
