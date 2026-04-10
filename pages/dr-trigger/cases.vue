<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

useSeoMeta({
  title: t('drTrigger.cases.title'),
})

interface TriggerCase {
  id: number
  caseId: number
  rzp: string
  arm: string
  pairs: number
  tetrad: string | null
  corners: string | null
  optimalMoves: number
  solutions: DRTriggerSolution[]
  symmetryGroup: string | null
  symmetryGroupSize?: number
}

interface CasesResponse {
  items: TriggerCase[]
  meta: PaginationMeta
}

const merged = ref(route.query.merged !== 'false')
const moves = ref(route.query.moves ? Number(route.query.moves) : 0)
const rzpN = ref(route.query.rzpc ? String(route.query.rzpc) : '')
const rzpM = ref(route.query.rzpe ? String(route.query.rzpe) : '')
const armN = ref(route.query.armc ? String(route.query.armc) : '')
const armM = ref(route.query.arme ? String(route.query.arme) : '')
const eo = ref(route.query.eo ? String(route.query.eo) : '')
const page = ref(route.query.page ? Number(route.query.page) : 1)
const meta = ref<PaginationMeta>({
  totalItems: 0,
  itemCount: 0,
  itemsPerPage: 50,
  totalPages: 0,
  currentPage: 1,
})

const { data: distinctMoves } = await useApi<number[]>('/dr-trigger/distinct-moves')
const { data: rzpList } = await useApi<string[]>('/dr-trigger/rzps')
const { data: armList } = await useApi<string[]>('/dr-trigger/distinct-arms')

const rzpOptions = computed(() => {
  if (!rzpList.value)
    return { ns: [] as string[], ms: [] as string[] }
  const ns = new Set<string>()
  const ms = new Set<string>()
  for (const r of rzpList.value) {
    const match = r.match(/^(\d+)c(\d+)e$/)
    if (match) {
      ns.add(match[1])
      ms.add(match[2])
    }
  }
  return {
    ns: [...ns].sort((a, b) => Number(a) - Number(b)),
    ms: [...ms].sort((a, b) => Number(a) - Number(b)),
  }
})

const armOptions = computed(() => {
  if (!armList.value)
    return { ns: [] as string[], ms: [] as string[] }
  const ns = new Set<string>()
  const ms = new Set<string>()
  for (const a of armList.value) {
    if (a.length === 2) {
      ns.add(a[0])
      ms.add(a[1])
    }
  }
  return {
    ns: [...ns].sort((a, b) => Number(a) - Number(b)),
    ms: [...ms].sort((a, b) => Number(a) - Number(b)),
  }
})

const queryString = computed(() => {
  const params = new URLSearchParams()
  if (!merged.value)
    params.set('merged', 'false')
  if (moves.value > 0)
    params.set('moves', String(moves.value))
  if (rzpN.value)
    params.set('rzpc', rzpN.value)
  if (rzpM.value)
    params.set('rzpe', rzpM.value)
  if (armN.value)
    params.set('armc', armN.value)
  if (armM.value)
    params.set('arme', armM.value)
  if (eo.value)
    params.set('eo', eo.value)
  if (page.value > 1)
    params.set('page', String(page.value))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
})

const { data: casesData } = await useApi<CasesResponse>(() => `/dr-trigger/cases${queryString.value}`)

watch(casesData, (val) => {
  if (val)
    meta.value = val.meta
}, { immediate: true })

function buildQuery() {
  const query: Record<string, string> = {}
  if (!merged.value)
    query.merged = 'false'
  if (moves.value > 0)
    query.moves = String(moves.value)
  if (rzpN.value)
    query.rzpc = rzpN.value
  if (rzpM.value)
    query.rzpe = rzpM.value
  if (armN.value)
    query.armc = armN.value
  if (armM.value)
    query.arme = armM.value
  if (eo.value)
    query.eo = eo.value
  if (page.value > 1)
    query.page = String(page.value)
  return query
}

function updateUrl() {
  router.replace({ path: '/dr-trigger/cases', query: buildQuery() })
}

watch([merged, moves, rzpN, rzpM, armN, armM, eo], () => {
  page.value = 1
  updateUrl()
})

watch(page, () => {
  updateUrl()
})

function onPageUpdate(p: number) {
  page.value = p
}

function reverseSolution(solution: string): string {
  return solution
    .split(' ')
    .filter(t => t)
    .map((t) => {
      if (t.endsWith('2'))
        return t
      if (t.endsWith('\''))
        return t.slice(0, -1)
      return `${t}'`
    })
    .reverse()
    .join(' ')
}

function getCaseMoves(c: TriggerCase): string {
  if (!c.solutions || c.solutions.length === 0)
    return ''
  return reverseSolution(c.solutions[0].solution)
}

// --- Modal (fully decoupled from Vue Router to prevent flicker) ---
const modalCase = ref<TriggerCase | null>(null)
const modalLoading = ref(false)
const showAllSolutions = ref(false)
const symmetryVariants = ref<TriggerCase[]>([])
const symmetryVariantsLoading = ref(false)
const showSymmetryVariants = ref(false)
const modalOpen = ref(false)

async function loadSymmetryVariants(group: string) {
  symmetryVariantsLoading.value = true
  try {
    symmetryVariants.value = await useClientApi<TriggerCase[]>(`/dr-trigger/symmetry-group/${group}`)
  }
  catch {
    symmetryVariants.value = []
  }
  symmetryVariantsLoading.value = false
}

function buildCaseUrl(id: number) {
  const query = buildQuery()
  const qs = new URLSearchParams(query).toString()
  return `/dr-trigger/cases/${id}${qs ? `?${qs}` : ''}`
}

function resetModalState() {
  modalOpen.value = false
  modalCase.value = null
  modalLoading.value = false
  showAllSolutions.value = false
  showSymmetryVariants.value = false
  symmetryVariants.value = []
}

function openCase(c: TriggerCase) {
  modalCase.value = c
  modalOpen.value = true
  showAllSolutions.value = false
  showSymmetryVariants.value = false
  symmetryVariants.value = []
  history.pushState(null, '', buildCaseUrl(c.id))
}

async function openCaseById(id: number) {
  const found = casesData.value?.items.find(c => c.id === id)
  if (found) {
    modalCase.value = found
    modalOpen.value = true
    showAllSolutions.value = false
    showSymmetryVariants.value = false
    symmetryVariants.value = []
    return
  }
  modalOpen.value = true
  modalLoading.value = true
  try {
    const data = await useClientApi<TriggerCase>(`/dr-trigger/case/${id}`)
    modalCase.value = data
    showAllSolutions.value = false
    showSymmetryVariants.value = false
    symmetryVariants.value = []
  }
  catch {
    modalCase.value = null
  }
  modalLoading.value = false
}

function selectVariant(v: TriggerCase) {
  modalCase.value = v
  showAllSolutions.value = false
  history.replaceState(null, '', buildCaseUrl(v.id))
}

let closingByButton = false

function closeModal() {
  resetModalState()
  closingByButton = true
  history.back()
}

function onPopState() {
  if (closingByButton) {
    closingByButton = false
    return
  }
  if (modalOpen.value) {
    resetModalState()
  }
}

function toggleSymmetryVariants() {
  showSymmetryVariants.value = !showSymmetryVariants.value
  if (showSymmetryVariants.value && symmetryVariants.value.length === 0 && modalCase.value?.symmetryGroup) {
    loadSymmetryVariants(modalCase.value.symmetryGroup)
  }
}

const initialCaseId = route.params.id ? Number(route.params.id) : null
if (initialCaseId) {
  openCaseById(initialCaseId)
}

onMounted(() => {
  window.addEventListener('popstate', onPopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
})

function optimalSolutions(solutions: DRTriggerSolution[]) {
  const min = Math.min(...solutions.map(s => s.length))
  return solutions.filter(s => s.length === min)
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-5xl">
    <BackTo to="/dr-trigger" :label="$t('drTrigger.title')" />

    <h1 class="text-2xl font-bold font-poppins mb-4">
      {{ $t('drTrigger.cases.title') }}
    </h1>

    <!-- Compact filters -->
    <div class="bg-white shadow-md p-3 mb-4">
      <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
        <!-- Moves -->
        <div>
          <label class="font-bold text-xs md:text-sm text-gray-500 block mb-0.5">{{ $t('drTrigger.cases.moves') }}</label>
          <select
            v-model.number="moves"
            class="w-20 font-mono text-xs md:text-sm p-1 border border-gray-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/50"
          >
            <option :value="0">
              {{ $t('drTrigger.cases.allMoves') }}
            </option>
            <option v-for="m in distinctMoves" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
        </div>

        <!-- RZP -->
        <div>
          <label class="font-bold text-xs md:text-sm text-gray-500 block mb-0.5">RZP</label>
          <div class="flex items-center gap-1">
            <select v-model="rzpN" class="w-14 font-mono text-xs md:text-sm p-1 border border-gray-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/50">
              <option value="">
                N
              </option>
              <option v-for="n in rzpOptions.ns" :key="n" :value="n">
                {{ n }}
              </option>
            </select>
            <span class="text-gray-400 text-xs md:text-sm font-mono">c</span>
            <select v-model="rzpM" class="w-14 font-mono text-xs md:text-sm p-1 border border-gray-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/50">
              <option value="">
                M
              </option>
              <option v-for="m in rzpOptions.ms" :key="m" :value="m">
                {{ m }}
              </option>
            </select>
            <span class="text-gray-400 text-xs md:text-sm font-mono">e</span>
            <button v-if="rzpN || rzpM" class="text-gray-400 hover:text-red-500 transition-colors" @click="rzpN = ''; rzpM = ''">
              <Icon name="mdi:close" class="text-sm" />
            </button>
          </div>
        </div>

        <!-- ARM -->
        <div>
          <label class="font-bold text-xs md:text-sm text-gray-500 block mb-0.5">ARM</label>
          <div class="flex items-center gap-1">
            <select v-model="armN" class="w-14 font-mono text-xs md:text-sm p-1 border border-gray-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/50">
              <option value="">
                N
              </option>
              <option v-for="n in armOptions.ns" :key="n" :value="n">
                {{ n }}
              </option>
            </select>
            <span class="text-gray-400 text-xs md:text-sm font-mono">c</span>
            <select v-model="armM" class="w-14 font-mono text-xs md:text-sm p-1 border border-gray-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/50">
              <option value="">
                M
              </option>
              <option v-for="m in armOptions.ms" :key="m" :value="m">
                {{ m }}
              </option>
            </select>
            <span class="text-gray-400 text-xs md:text-sm font-mono">e</span>
            <button v-if="armN || armM" class="text-gray-400 hover:text-red-500 transition-colors" @click="armN = ''; armM = ''">
              <Icon name="mdi:close" class="text-sm" />
            </button>
          </div>
        </div>

        <!-- EO -->
        <div>
          <label class="font-bold text-xs md:text-sm text-gray-500 block mb-0.5">{{ $t('drTrigger.cases.eoBreaking') }}</label>
          <select
            v-model="eo"
            class="w-22 font-mono text-xs md:text-sm p-1 border border-gray-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/50"
          >
            <option value="">
              {{ $t('drTrigger.cases.allMoves') }}
            </option>
            <option value="include">
              Include
            </option>
            <option value="only">
              Only
            </option>
          </select>
        </div>

        <!-- Merged -->
        <div class="self-end pb-0.5">
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              v-model="merged"
              type="checkbox"
              class="accent-indigo-500"
            >
            <span class="text-xs md:text-sm text-gray-600">{{ $t('drTrigger.cases.merged') }}</span>
          </label>
        </div>

        <!-- Count -->
        <div v-if="casesData" class="text-xs md:text-sm text-gray-400 self-end pb-0.5">
          {{ $t('drTrigger.cases.total', { total: meta.totalItems }) }}
        </div>
      </div>
    </div>

    <!-- Grid -->
    <div v-if="casesData && casesData.items.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      <div
        v-for="c in casesData.items"
        :key="c.id"
        class="bg-white shadow-sm p-2 hover:shadow-md transition-all duration-200 group"
      >
        <CubeCss3d :moves="getCaseMoves(c)" filter="dr" class="w-full mb-1.5" />
        <div
          class="cursor-pointer px-1 -mx-1 py-0.5 transition-colors group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30"
          @click="openCase(c)"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] md:text-xs text-gray-500 font-mono">{{ c.rzp }}</span>
            <span class="flex items-center gap-1">
              <span v-if="merged && c.symmetryGroupSize && c.symmetryGroupSize > 1" class="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-mono px-1">x{{ c.symmetryGroupSize }}</span>
              <span class="text-[10px] md:text-xs text-gray-400 font-mono">{{ formatArm(c.arm) }}</span>
            </span>
          </div>
          <div class="text-[10px] md:text-xs text-gray-400 mt-0.5">
            {{ $t('drTrigger.cases.moves') }}: <span class="font-mono font-semibold text-gray-600">{{ c.optimalMoves / 100 }}</span>
          </div>
          <div v-if="c.solutions.length > 0" class="font-mono text-xs md:text-sm mt-1 truncate">
            {{ c.solutions[0].solution }}
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="casesData" class="text-gray-400 text-sm py-8 text-center">
      {{ $t('drTrigger.cases.noResults') }}
    </div>

    <Pagination :meta="meta" @update="onPageUpdate" />

    <!-- Modal overlay: always mounted, visibility controlled by CSS -->
    <div
      class="fixed inset-0 z-100 flex items-center justify-center transition-all duration-200 cursor-pointer"
      :class="modalOpen ? 'bg-black/40 visible opacity-100' : 'invisible opacity-0 pointer-events-none'"
      @click.self="closeModal"
    >
      <div
        class="bg-white shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden relative cursor-default transition-transform duration-200"
        :class="modalOpen ? 'scale-100' : 'scale-95'"
      >
        <button class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors z-10 cursor-pointer" @click="closeModal">
          <Icon name="mdi:close" class="text-xl" />
        </button>

        <div v-if="modalLoading" class="p-8 text-center">
          <Spinner class="w-6 h-6 border-[3px] text-indigo-500 mx-auto" />
        </div>

        <template v-else-if="modalCase">
          <div class="p-4">
            <!-- Header -->
            <h2 class="text-lg font-bold font-poppins mb-3">
              {{ $t('drTrigger.cases.detail') }}
              <span class="font-mono text-indigo-600">#{{ modalCase.caseId }}</span>
            </h2>

            <!-- Info -->
            <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-sm mb-3">
              <span class="font-mono">RZP: <span class="font-semibold text-indigo-600">{{ modalCase.rzp }}</span></span>
              <span class="font-mono">{{ formatArm(modalCase.arm) }}</span>
              <span class="text-gray-500">{{ $t('drTrigger.cases.optimalMoves') }}: <span class="font-mono font-bold text-indigo-600">{{ modalCase.optimalMoves / 100 }}</span></span>
              <span class="text-gray-500">{{ $t('drTrigger.cases.pairs') }}: <span class="font-mono">{{ modalCase.pairs }}</span></span>
              <span v-if="modalCase.tetrad" class="text-gray-500">Tetrad: <span class="font-mono">{{ modalCase.tetrad }}</span></span>
              <span v-if="modalCase.corners" class="text-gray-500">Corners: <span class="font-mono">{{ modalCase.corners }}</span></span>
            </div>

            <!-- Cube -->
            <Cube3d :moves="getCaseMoves(modalCase)" filter="dr" class="max-w-56 mb-4" />

            <!-- Optimal solutions -->
            <div class="mb-3">
              <h3 class="font-bold text-xs text-gray-500 mb-1">
                {{ $t('drTrigger.history.optimalSolutions') }}
                <span class="text-gray-400 font-normal">({{ optimalSolutions(modalCase.solutions).length }})</span>
              </h3>
              <div class="space-y-0.5">
                <div
                  v-for="(s, si) in optimalSolutions(modalCase.solutions)"
                  :key="si"
                  class="font-mono text-sm bg-gray-50 px-2 py-1.5 flex items-center justify-between gap-2"
                >
                  <span class="break-all">
                    {{ s.solution }}
                    <span v-if="s.eoBreaking" class="text-red-400 ml-1 text-xs">{{ $t('drTrigger.cases.eoBreaking') }}</span>
                  </span>
                  <span class="text-gray-400 text-xs shrink-0">({{ s.length }})</span>
                </div>
              </div>
            </div>

            <!-- All solutions -->
            <div v-if="modalCase.solutions.length > optimalSolutions(modalCase.solutions).length">
              <button
                class="font-bold text-sm text-gray-500 mb-1 flex items-center gap-1 hover:text-indigo-500 transition-colors cursor-pointer"
                @click="showAllSolutions = !showAllSolutions"
              >
                {{ $t('drTrigger.cases.allSolutions') }}
                <span class="text-gray-400 font-normal">({{ modalCase.solutions.length }})</span>
                <Icon
                  name="mdi:chevron-down"
                  class="transition-transform text-gray-400"
                  :class="{ 'rotate-180': showAllSolutions }"
                />
              </button>
              <div v-if="showAllSolutions" class="space-y-0.5 max-h-60 overflow-y-auto">
                <div
                  v-for="(s, si) in modalCase.solutions.filter(s => s.length > optimalSolutions(modalCase!.solutions)[0].length)"
                  :key="si"
                  class="font-mono text-sm bg-gray-50 px-2 py-1.5 flex items-center justify-between gap-2"
                >
                  <span class="break-all">
                    {{ s.solution }}
                    <span v-if="s.eoBreaking" class="text-red-400 ml-1 text-xs">{{ $t('drTrigger.cases.eoBreaking') }}</span>
                  </span>
                  <span class="text-gray-400 text-xs shrink-0">({{ s.length }})</span>
                </div>
              </div>
            </div>

            <!-- Symmetric variants -->
            <div v-if="modalCase.symmetryGroup" class="mt-3 border-t border-gray-200 pt-3">
              <button
                class="font-bold text-sm text-gray-500 mb-1 flex items-center gap-1 hover:text-indigo-500 transition-colors cursor-pointer"
                @click="toggleSymmetryVariants"
              >
                {{ $t('drTrigger.cases.symmetricVariants') }}
                <span v-if="modalCase.symmetryGroupSize" class="text-gray-400 font-normal">({{ modalCase.symmetryGroupSize }})</span>
                <Icon
                  name="mdi:chevron-down"
                  class="transition-transform text-gray-400"
                  :class="{ 'rotate-180': showSymmetryVariants }"
                />
              </button>
              <div v-if="showSymmetryVariants">
                <Spinner v-if="symmetryVariantsLoading" class="w-5 h-5 border-[3px] text-indigo-500 my-2" />
                <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                  <div
                    v-for="v in symmetryVariants"
                    :key="v.id"
                    class="p-1.5 cursor-pointer transition-colors"
                    :class="v.id === modalCase.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'bg-gray-50 hover:bg-gray-100'"
                    @click="selectVariant(v)"
                  >
                    <CubeCss3d :moves="getCaseMoves(v)" filter="dr" class="w-full mb-1 pointer-events-none" />
                    <div class="text-[10px] font-mono text-gray-500 truncate">
                      {{ v.rzp }} #{{ v.caseId }}
                    </div>
                    <div class="text-[10px] font-mono text-gray-400 truncate">
                      {{ v.solutions[0]?.solution }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
