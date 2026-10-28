<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('tools.htrSubsetStats.title'),
})
// Keeps the layout from shifting when the detail modal locks body scrolling.
useHead({ htmlAttrs: { style: 'scrollbar-gutter: stable' } })

const { subsets, groups, qt, distances, nissDistances } = getHTRSubsetStats()

const route = useRoute()
const router = useRouter()
const view = ref<'grouped' | 'sorted'>('grouped')
const selectedName = computed({
  get: () => typeof route.query.subset === 'string' ? route.query.subset : undefined,
  set: subset => router.replace({ query: { ...route.query, subset } }),
})
const narrowScreen = useMediaQuery('(max-width: 639px)')
const isMobile = ref(false)
onMounted(() => watch(narrowScreen, value => isMobile.value = value, { immediate: true }))
const selected = computed(() => subsets.find(s => s.name === selectedName.value))

const averageQT = qt.reduce((sum, r) => sum + r.qt * drWeightToProbability(r.weight), 0)
const lowQTWeight = qt.filter(r => r.qt <= 2).reduce((sum, r) => sum + r.weight, 0)
const maxQT = Math.max(...qt.map(r => r.weight))
const maxGroup = Math.max(...groups.map(g => g.weight))
const groupRows = groups.map((g) => {
  let offset = 0
  const segments = g.subsets.map((subset) => {
    const width = subset.weight / maxGroup * 100
    offset += width
    return { subset, width, center: offset - width / 2 }
  })
  // Segments too narrow for an inline number get labels above with leader lines.
  return { ...g, segments, leader: segments.some(s => s.width < 8) }
})

const sortedRows = subsets
  .flatMap(s => s.edges.map(e => ({ key: `${s.name} ${e.edges}`, subset: s, edge: e })))
  .sort((a, b) => b.edge.weight - a.edge.weight)
const maxRowWeight = Math.max(...subsets.flatMap(s => s.edges.map(e => e.weight)))

const htrMode = ref<'normal' | 'niss'>('normal')
const htrRows = computed(() => [
  { name: '', group: '', weight: distances.reduce((sum, n) => sum + n, 0), distances, nissDistances },
  ...subsets,
].map(r => ({ ...r, distances: htrMode.value === 'niss' ? r.nissDistances : r.distances })))
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
          <span class="text-sm font-normal text-gray-500">/ NISS {{ htrDistanceMean(nissDistances).toFixed(2) }}</span>
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
          <div class="hidden sm:block w-28 text-right text-gray-500 tabular-nums">
            {{ count(r.weight) }}
          </div>
        </div>
      </div>
      <div class="bg-white shadow-md p-4">
        <h2 class="font-poppins font-semibold mb-3">
          {{ $t('tools.htrSubsetStats.groupDistribution') }}
        </h2>
        <div v-for="g in groupRows" :key="g.name" class="flex items-end gap-2 text-sm mb-1.5">
          <div class="w-12 shrink-0 font-semibold leading-5">
            {{ g.name }}
          </div>
          <div class="flex-1 relative" :class="g.leader ? 'pt-5' : ''">
            <svg v-if="g.leader" class="absolute inset-x-0 top-0 w-full h-5 overflow-visible text-gray-500">
              <g
                v-for="(seg, i) in g.segments"
                :key="seg.subset.name"
                class="cursor-pointer"
                @click="selectedName = seg.subset.name"
              >
                <text :x="`${i * 20 + 8}px`" y="10" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">{{ seg.subset.qt }}</text>
                <line :x1="`${i * 20 + 8}px`" y1="12" :x2="`${seg.center}%`" y2="20" stroke="currentColor" stroke-width="1" />
              </g>
            </svg>
            <div class="bg-gray-100 h-5 flex">
              <div
                v-for="seg in g.segments"
                :key="seg.subset.name"
                class="h-full border-r border-white last:border-r-0 opacity-90 hover:opacity-100 text-[10px] leading-5 text-white text-center overflow-hidden cursor-pointer"
                :class="HTR_GROUP_STYLES[g.name].bg"
                :style="{ width: `${seg.width}%` }"
                :title="`${seg.subset.name}: ${percent(seg.subset.weight)}`"
                @click="selectedName = seg.subset.name"
              >
                {{ g.leader ? '' : seg.subset.qt }}
              </div>
            </div>
          </div>
          <div class="w-20 text-right tabular-nums leading-5">
            {{ percent(g.weight) }}
          </div>
          <div class="hidden sm:block w-28 text-right text-gray-500 tabular-nums leading-5">
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
        <HtrSubsetTransitionGraph :subsets="subsets" :vertical="isMobile" @select="selectedName = $event" />
      </div>
    </div>

    <div class="bg-white shadow-md p-4 mb-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 class="font-poppins font-semibold">
          {{ $t('tools.htrSubsetStats.htrDistribution') }}
        </h2>
        <HtrSubsetModeToggle v-model="htrMode" />
      </div>
      <p class="text-xs text-gray-500 mb-2">
        {{ htrMode === 'niss' ? $t('tools.htrSubsetStats.nissHint', { n: HTR_NISS_SAMPLES_PER_COSET }) : $t('tools.htrSubsetStats.htrHint') }}
      </p>
      <div class="sm:hidden">
        <div class="flex gap-1.5 text-[9px] text-gray-400 tabular-nums tracking-tighter">
          <div class="w-[4.5rem] shrink-0" />
          <div class="flex-1 flex gap-px">
            <div v-for="n in htrLengths" :key="n" class="flex-1 text-center" :class="n % 2 ? 'bg-gray-500/10' : ''">
              {{ n }}
            </div>
          </div>
          <div class="w-[4.25rem] shrink-0 text-right tracking-normal">
            {{ $t('tools.htrSubsetStats.range') }} · {{ $t('tools.htrSubsetStats.average') }}
          </div>
        </div>
        <div
          v-for="r in htrRows"
          :key="r.name"
          class="flex items-end gap-1.5 py-1.5 border-t border-gray-100 text-xs"
          :class="r.name ? 'cursor-pointer' : 'font-semibold'"
          @click="r.name && (selectedName = r.name)"
        >
          <div class="w-[4.5rem] shrink-0 font-semibold whitespace-nowrap self-center">
            <span v-if="r.group" class="inline-block w-2 h-2 rounded-full mr-1" :class="HTR_GROUP_STYLES[r.group].bg" />
            {{ r.name || $t('tools.htrSubsetStats.all') }}
          </div>
          <div class="flex-1 flex gap-px h-11">
            <div
              v-for="n in htrLengths"
              :key="n"
              class="flex-1 flex flex-col justify-end items-center"
              :class="n % 2 ? 'bg-gray-500/10' : ''"
            >
              <span v-if="r.distances[n] === Math.max(...r.distances)" class="text-[10px] leading-3 font-semibold tabular-nums">{{ n }}</span>
              <div
                class="w-full"
                :class="r.group ? HTR_GROUP_STYLES[r.group].bg : 'bg-indigo-500'"
                :style="{ height: `${(r.distances[n] ?? 0) / Math.max(...r.distances) * 2}rem` }"
              />
            </div>
          </div>
          <div class="w-[4.25rem] shrink-0 text-right tabular-nums self-center whitespace-nowrap">
            <span class="text-gray-500">{{ r.distances.findIndex(x => x > 0) }}–{{ r.distances.length - 1 }}</span>
            <span class="ml-1 font-semibold">{{ htrDistanceMean(r.distances).toFixed(2) }}</span>
          </div>
        </div>
        <div class="flex gap-1.5 text-[9px] text-gray-400 tabular-nums tracking-tighter border-t border-gray-100">
          <div class="w-[4.5rem] shrink-0" />
          <div class="flex-1 flex gap-px">
            <div v-for="n in htrLengths" :key="n" class="flex-1 text-center" :class="n % 2 ? 'bg-gray-500/10' : ''">
              {{ n }}
            </div>
          </div>
          <div class="w-[4.25rem] shrink-0" />
        </div>
      </div>
      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full text-xs tabular-nums">
          <thead>
            <tr class="text-gray-500">
              <th class="p-1 text-left sticky left-0 bg-white">
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
              <td class="p-1 font-semibold whitespace-nowrap sticky left-0 bg-white">
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
                {{ r.distances[n] ? formatSharePercent(r.distances[n] / r.weight, r.distances[n] / r.weight < 0.01 ? 2 : 1) : '' }}
              </td>
              <td class="p-1 text-right font-semibold">
                {{ htrDistanceMean(r.distances).toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex flex-wrap items-end justify-between gap-2 mb-2">
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
          <span>{{ $t('tools.htrSubsetStats.averageNISSShort', { n: htrDistanceMean(s.nissDistances).toFixed(2) }) }}</span>
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
            <th class="p-2 w-1/4 hidden sm:table-cell" />
            <th class="p-2 text-right hidden sm:table-cell">
              {{ $t('tools.htrSubsetStats.column.count') }}
            </th>
            <th class="p-2 text-right">
              {{ $t('tools.htrSubsetStats.column.htr') }}
            </th>
            <th class="p-2 text-right">
              {{ $t('tools.htrSubsetStats.column.niss') }}
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
            <td class="px-2 py-1 hidden sm:table-cell">
              <div class="bg-gray-100 h-2.5">
                <div class="h-full" :class="HTR_GROUP_STYLES[r.subset.group].bg" :style="{ width: `${r.edge.weight / maxRowWeight * 100}%` }" />
              </div>
            </td>
            <td class="px-2 py-1 text-right tabular-nums text-gray-500 hidden sm:table-cell">
              {{ count(r.edge.weight) }}
            </td>
            <td class="px-2 py-1 text-right tabular-nums">
              {{ htrDistanceMean(r.edge.distances).toFixed(2) }}
            </td>
            <td class="px-2 py-1 text-right tabular-nums">
              {{ htrDistanceMean(r.edge.nissDistances).toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ClientOnly>
      <Transition name="htr-detail">
        <HtrSubsetDetail
          v-if="selected"
          :subset="selected"
          @close="selectedName = undefined"
          @select="selectedName = $event"
        />
      </Transition>
    </ClientOnly>
  </div>
</template>
