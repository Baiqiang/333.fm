<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

interface GameDetail {
  id: number
  status: number
  levels: number
  difficulty: number
  remainingTime: number
  totalTimeBonus: number
  createdAt: string
}

interface RoundTrigger {
  caseId: number
  rzp: string
  arm: string
  solutions: DRTriggerSolution[]
}

interface GameRound {
  id: number
  scramble: string
  solution: string
  moves: number
  optimalMoves: number
  timeBonus: number
  duration: number
  trigger: RoundTrigger | null
}

interface GameResponse {
  game: GameDetail
  rounds: GameRound[]
}

const { params } = useRoute()
const { t } = useI18n()

const { data, error } = await useApi<GameResponse>(`/dr-trigger/game/${params.id}`)
if (!data.value || error.value) {
  throw createError({ statusCode: 404 })
}

const game = data.value.game
const rounds = data.value.rounds

useSeoMeta({
  title: `${t('drTrigger.title')} - ${t('drTrigger.level', { level: game.levels })}`,
})

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const hundredths = Math.floor((ms % 1000) / 10)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`
}

const expandedRound = ref<number | null>(null)
function toggleRound(i: number) {
  expandedRound.value = expandedRound.value === i ? null : i
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-3xl">
    <BackTo to="/dr-trigger" :label="$t('drTrigger.title')" />

    <h1 class="text-xl font-bold font-poppins mb-4">
      {{ $t('drTrigger.history.detail') }}
    </h1>

    <!-- Summary -->
    <div class="bg-white shadow-md p-4 mb-4">
      <div class="text-sm text-gray-500 mb-2">
        {{ $dayjs(game.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
      </div>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold text-indigo-600">
            {{ game.levels }}
          </div>
          <div class="text-xs text-gray-500">
            {{ $t('drTrigger.result.levels') }}
          </div>
        </div>
        <div>
          <div class="text-2xl font-bold text-indigo-600">
            {{ formatTime(game.totalTimeBonus + 600000) }}
          </div>
          <div class="text-xs text-gray-500">
            {{ $t('drTrigger.result.totalTime') }}
          </div>
        </div>
        <div>
          <div class="text-2xl font-bold text-green-600">
            +{{ (game.totalTimeBonus / 1000).toFixed(0) }}s
          </div>
          <div class="text-xs text-gray-500">
            {{ $t('drTrigger.result.totalBonus') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Rounds -->
    <div v-if="rounds.length > 0" class="space-y-2">
      <div
        v-for="(r, i) in rounds"
        :key="r.id"
        class="bg-white shadow-sm"
      >
        <button
          class="w-full flex items-center justify-between p-3 text-sm hover:bg-gray-50 transition-colors"
          @click="toggleRound(i)"
        >
          <span class="text-gray-400 w-8">{{ i + 1 }}</span>
          <span class="font-mono">{{ (r.moves / 100).toFixed(0) }}</span>
          <span class="text-gray-400">/ {{ (r.optimalMoves / 100).toFixed(0) }}</span>
          <span
            class="text-xs"
            :class="r.timeBonus >= 10000 ? 'text-green-600 font-semibold' : r.timeBonus > 0 ? 'text-blue-600' : 'text-gray-400'"
          >
            {{ r.timeBonus > 0 ? `+${(r.timeBonus / 1000).toFixed(0)}s` : '-' }}
          </span>
          <span class="text-gray-400 text-xs">{{ (r.duration / 1000).toFixed(1) }}s</span>
          <Icon
            name="mdi:chevron-down"
            class="transition-transform"
            :class="{ 'rotate-180': expandedRound === i }"
          />
        </button>

        <div v-if="expandedRound === i" class="border-t border-gray-100 p-3 text-sm space-y-3">
          <!-- Scramble -->
          <div>
            <div class="text-xs text-gray-400 mb-1">
              {{ $t('if.scramble.label') }}
            </div>
            <div class="font-mono text-xs bg-gray-50 p-2 break-all">
              {{ r.scramble }}
            </div>
            <CubeExpanded :moves="r.scramble" class="mt-2" />
          </div>

          <!-- Player solution -->
          <div>
            <div class="text-xs text-gray-400 mb-1">
              {{ $t('drTrigger.history.yourSolution') }}
            </div>
            <div class="font-mono bg-gray-50 p-2">
              {{ r.solution }}
            </div>
          </div>

          <!-- Optimal solutions from case data -->
          <div v-if="r.trigger?.solutions">
            <div class="text-xs text-gray-400 mb-1">
              {{ $t('drTrigger.history.optimalSolutions') }}
              <span class="text-gray-300">(RZP: {{ r.trigger.rzp }})</span>
            </div>
            <div class="space-y-0.5 max-h-40 overflow-y-auto">
              <div
                v-for="(s, si) in r.trigger.solutions.filter((s: DRTriggerSolution) => s.length * 100 <= r.optimalMoves).slice(0, 20)"
                :key="si"
                class="font-mono text-xs bg-gray-50 px-2 py-1"
              >
                {{ s.solution }}
                <span class="text-gray-400 ml-1">({{ s.length }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
