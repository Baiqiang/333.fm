<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'

const { t } = useI18n()
const user = useUser()

useSeoMeta({
  title: t('drTrigger.title'),
})

interface DRTriggerGame {
  id: number
  status: number
  levels: number
  difficulty: number
  remainingTime: number
  totalTimeBonus: number
  createdAt: string
}
interface DRTrigger {
  id: number
  scramble: string
  rzp: string
  arm: string
}
interface RoundResult {
  moves: number
  optimalMoves: number
  timeBonus: number
  duration: number
}
interface LeaderboardGame {
  id: number
  levels: number
  difficulty: number
  remainingTime: number
  totalTimeBonus: number
  createdAt: string
  user: User
}
interface Leaderboard {
  highestLevels: LeaderboardGame[]
}

const DIFFICULTY_OPTIONS = [4, 5, 6, 7, 8, 0] as const

const gameState = ref<'idle' | 'playing' | 'ended'>('idle')
const allCleared = ref(false)
const game = ref<DRTriggerGame | null>(null)
const trigger = ref<DRTrigger | null>(null)
const rounds = ref<RoundResult[]>([])
const lastRound = ref<RoundResult | null>(null)
const solution = ref('')
const loading = ref(false)
const error = ref('')
const timerDisplay = ref('10:00.00')
const isDR = ref<boolean | null>(null)
const solutionMoves = ref(0)
const showKeyboard = ref(false)
const difficulty = ref(5)
const lastTriggerInfo = ref<any>(null)
const myGames = ref<DRTriggerGame[]>([])
const myGamesTotal = ref(0)
const myGamesPage = ref(1)
const myGamesLoading = ref(false)

const cubeKeys = [
  ['U', 'U\'', 'U2', 'D', 'D\'', 'D2'],
  ['R', 'R\'', 'R2', 'L', 'L\'', 'L2'],
  ['F', 'F\'', 'F2', 'B', 'B\'', 'B2'],
]

let timerRaf: number | null = null
let gameStartedAt = 0
let serverRemainingAtSync = 0

const { data: leaderboard, refresh: refreshLeaderboard } = await useApi<Leaderboard>('/dr-trigger/leaderboard')

onMounted(async () => {
  if (!user.signedIn)
    return
  try {
    const data = await useClientApi<any>('/dr-trigger/ongoing')
    if (data && data.game && data.game.status === 0) {
      game.value = data.game
      trigger.value = data.trigger
      gameState.value = 'playing'
      serverRemainingAtSync = data.game.remainingTime
      gameStartedAt = Date.now()
      startTimer()
      return
    }
  }
  catch {}
  await loadMyGames()
})

function startTimer() {
  stopTimer()
  function tick() {
    if (!game.value || gameState.value !== 'playing')
      return
    const elapsed = Date.now() - gameStartedAt
    const remaining = Math.max(0, serverRemainingAtSync - elapsed)
    timerDisplay.value = formatTime(remaining)
    if (remaining <= 0) {
      handleTimeUp()
      return
    }
    timerRaf = requestAnimationFrame(tick)
  }
  timerRaf = requestAnimationFrame(tick)
}

function stopTimer() {
  if (timerRaf != null) {
    cancelAnimationFrame(timerRaf)
    timerRaf = null
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const hundredths = Math.floor((ms % 1000) / 10)
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`
}

async function startGame() {
  loading.value = true
  error.value = ''
  try {
    const data = await useClientApi<any>('/dr-trigger/start', { method: 'POST', body: { difficulty: difficulty.value } })
    game.value = data.game
    trigger.value = data.trigger
    rounds.value = []
    lastRound.value = null
    allCleared.value = false
    gameState.value = 'playing'
    solution.value = ''
    serverRemainingAtSync = data.game.remainingTime
    gameStartedAt = Date.now()
    startTimer()
  }
  catch (e: any) {
    error.value = e?.data?.message || e.message || 'Failed to start game'
  }
  finally {
    loading.value = false
  }
}

function validateSolution() {
  isDR.value = null
  solutionMoves.value = 0
  if (!solution.value.trim() || !trigger.value)
    return

  try {
    const cleanSolution = replaceQuote(solution.value)
    if (cleanSolution.includes('NISS') || cleanSolution.includes('(')) {
      isDR.value = false
      return
    }
    const alg = new Algorithm(cleanSolution)
    solutionMoves.value = alg.length

    const cube = new Cube()
    cube.twist(new Algorithm(trigger.value.scramble))
    cube.twist(alg)
    const bestCube = cube.getBestPlacement()
    const drStatus = bestCube.getDominoReductionStatus()
    isDR.value = drStatus.includes('UD')
  }
  catch {
    isDR.value = false
  }
}

watch(solution, () => {
  validateSolution()
})

const canSubmit = computed(() => isDR.value === true && !loading.value && gameState.value === 'playing')

async function submitSolution() {
  if (!canSubmit.value || !game.value)
    return
  loading.value = true
  error.value = ''
  try {
    const data = await useClientApi<any>('/dr-trigger/submit', {
      method: 'POST',
      body: {
        gameId: game.value.id,
        solution: solution.value,
      },
    })
    if (data.ended) {
      game.value = data.game
      rounds.value = data.rounds || []
      allCleared.value = data.allCleared || false
      lastTriggerInfo.value = data.lastTrigger || null
      gameState.value = 'ended'
      stopTimer()
      timerDisplay.value = allCleared.value ? formatTime(data.game.remainingTime) : '0:00.00'
      refreshLeaderboard()
      loadMyGames()
    }
    else {
      game.value = data.game
      trigger.value = data.trigger
      lastRound.value = data.lastRound
      rounds.value.push(data.lastRound)
      solution.value = ''
      serverRemainingAtSync = data.game.remainingTime
      gameStartedAt = Date.now()
    }
  }
  catch (e: any) {
    error.value = e?.data?.message || e.message || 'Failed to submit'
    if (error.value === 'Game not found or already ended') {
      gameState.value = 'ended'
      stopTimer()
    }
  }
  finally {
    loading.value = false
  }
}

async function handleTimeUp() {
  stopTimer()
  if (!game.value)
    return
  timerDisplay.value = '0:00.00'
  try {
    const data = await useClientApi<any>(`/dr-trigger/abandon/${game.value.id}`, { method: 'POST' })
    game.value = data.game
    rounds.value = data.rounds || []
    lastTriggerInfo.value = data.lastTrigger || null
    gameState.value = 'ended'
    refreshLeaderboard()
    loadMyGames()
  }
  catch {}
}

async function abandonGame() {
  if (!game.value || !confirm(t('drTrigger.abandonConfirm')))
    return
  loading.value = true
  try {
    const data = await useClientApi<any>(`/dr-trigger/abandon/${game.value.id}`, { method: 'POST' })
    game.value = data.game
    rounds.value = data.rounds || []
    lastTriggerInfo.value = data.lastTrigger || null
    gameState.value = 'ended'
    stopTimer()
    timerDisplay.value = '0:00.00'
    refreshLeaderboard()
    loadMyGames()
  }
  catch (e: any) {
    error.value = e?.data?.message || e.message
  }
  finally {
    loading.value = false
  }
}

async function resetToIdle() {
  gameState.value = 'idle'
  game.value = null
  trigger.value = null
  rounds.value = []
  lastRound.value = null
  allCleared.value = false
  lastTriggerInfo.value = null
  solution.value = ''
  error.value = ''
  await loadMyGames()
}

const solutionInput = ref<HTMLInputElement>()
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && canSubmit.value) {
    e.preventDefault()
    submitSolution()
  }
}

function appendMove(move: string) {
  solution.value = solution.value ? `${solution.value} ${move}` : move
}

function deleteLastMove() {
  const parts = solution.value.trim().split(/\s+/)
  parts.pop()
  solution.value = parts.join(' ')
}

function clearSolution() {
  solution.value = ''
}

async function loadMyGames(page = 1) {
  if (!user.signedIn)
    return
  myGamesLoading.value = true
  try {
    const data = await useClientApi<any>(`/dr-trigger/my-games?page=${page}`)
    myGames.value = data.games
    myGamesTotal.value = data.total
    myGamesPage.value = page
  }
  catch {}
  myGamesLoading.value = false
}

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-3xl">
    <h1 class="text-2xl font-bold font-poppins mb-4">
      {{ $t('drTrigger.title') }}
    </h1>

    <!-- Rules -->
    <div v-if="gameState === 'idle'" class="mb-6">
      <p class="text-gray-600 mb-4">
        {{ $t('drTrigger.description') }}
      </p>
      <h2 class="font-bold mb-2">
        {{ $t('drTrigger.rules.title') }}
      </h2>
      <ol class="text-sm mb-4 list-decimal list-inside marker:text-blue-500">
        <li v-for="rule, i in $tm('drTrigger.rules.list')" :key="i">
          {{ rule }}
        </li>
      </ol>
      <p class="text-xs text-gray-400 mb-4">
        {{ $t('drTrigger.credit') }}
        <a href="https://github.com/EvanBrown96/drm_doc_dev/tree/main/public" target="_blank" class="text-indigo-400 hover:underline">EvanBrown96/drm_doc_dev</a>
      </p>

      <!-- Difficulty + Start -->
      <div v-if="user.signedIn" class="mb-6">
        <div class="mb-3">
          <label class="font-bold text-sm block mb-1">{{ $t('drTrigger.difficulty.label') }}</label>
          <div class="flex gap-1.5 flex-wrap">
            <button
              v-for="d in DIFFICULTY_OPTIONS"
              :key="d"
              class="px-3 py-1.5 text-sm font-mono transition-all duration-200 border"
              :class="difficulty === d ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'"
              @click="difficulty = d"
            >
              {{ d === 0 ? $t('drTrigger.difficulty.unlimited') : `≤${d}` }}
            </button>
          </div>
        </div>
        <button
          class="bg-indigo-500 text-white px-6 py-3 text-lg shadow-md hover:bg-indigo-600 hover:-translate-y-0.5 transition-all duration-200"
          :disabled="loading"
          @click="startGame"
        >
          <Spinner v-if="loading" class="w-5 h-5 text-white border-[3px] inline-block mr-2" />
          {{ $t('drTrigger.start') }}
        </button>
      </div>
      <div v-else class="mb-6">
        <NuxtLink to="/sign-in" class="bg-indigo-500 text-white px-4 py-2 shadow-md hover:bg-indigo-600 transition-all duration-200 inline-block">
          {{ $t('drTrigger.signInToPlay') }}
        </NuxtLink>
      </div>
      <div v-if="error" class="text-red-500 mb-4">
        {{ error }}
      </div>
    </div>

    <!-- Game Playing -->
    <div v-if="gameState === 'playing' && trigger" class="mb-6" :class="{ 'pb-52': showKeyboard }">
      <!-- Sticky timer bar -->
      <div class="sticky top-0 z-10 bg-white shadow-md px-3 py-2 mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-gray-500 text-sm font-semibold">{{ $t('drTrigger.level', { level: (game?.levels ?? 0) + 1 }) }}</span>
          <span class="text-xs text-gray-400">({{ game?.difficulty === 0 ? $t('drTrigger.difficulty.unlimited') : `≤${game?.difficulty}` }})</span>
        </div>
        <div class="font-mono font-bold text-2xl" :class="{ 'text-red-500': game && game.remainingTime < 30000, 'text-indigo-600': !game || game.remainingTime >= 30000 }">
          {{ timerDisplay }}
        </div>
      </div>

      <!-- Last round feedback -->
      <div v-if="lastRound" class="mb-2 px-3 py-1.5 border-l-4 text-xs" :class="lastRound.timeBonus >= 10000 ? 'border-green-500 bg-green-50' : lastRound.timeBonus > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'">
        <span v-if="lastRound.timeBonus >= 10000" class="text-green-700 font-semibold">{{ $t('drTrigger.optimal') }}</span>
        <span v-else-if="lastRound.timeBonus > 0" class="text-blue-700 font-semibold">{{ $t('drTrigger.nearOptimal') }}</span>
        <span v-else class="text-gray-500">{{ $t('drTrigger.noBonus') }}</span>
        <span class="ml-1 text-gray-600">
          {{ (lastRound.moves / 100).toFixed(0) }} / {{ (lastRound.optimalMoves / 100).toFixed(0) }}
        </span>
        <span v-if="lastRound.timeBonus > 0" class="ml-1 font-bold" :class="lastRound.timeBonus >= 10000 ? 'text-green-600' : 'text-blue-600'">
          {{ $t('drTrigger.timeBonus', { seconds: (lastRound.timeBonus / 1000).toFixed(0) }) }}
        </span>
      </div>

      <!-- Scramble + Cube Display -->
      <div class="mb-2">
        <StickyScramble :scramble="trigger.scramble" :sticky="false" />
        <Cube3d :moves="trigger.scramble + solution" />
        <div class="text-xs text-gray-400 font-mono mt-0.5">
          RZP: {{ trigger.rzp }}
        </div>
      </div>

      <!-- Solution Input -->
      <div class="mb-2">
        <div class="flex gap-2">
          <input
            ref="solutionInput"
            v-model="solution"
            class="block w-full font-mono shadow-sm border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50 p-2 border text-sm"
            placeholder="e.g. R U R'"
            @keydown="handleKeydown"
          >
          <button
            class="bg-indigo-500 text-white px-3 py-2 shadow-md hover:bg-indigo-600 transition-all duration-200 shrink-0"
            :class="{ 'opacity-50 cursor-not-allowed': !canSubmit }"
            :disabled="!canSubmit"
            @click="submitSolution"
          >
            <Spinner v-if="loading" class="w-4 h-4 text-white border-[3px]" />
            <Icon v-else name="material-symbols:send" />
          </button>
        </div>
        <div class="mt-0.5 text-xs flex items-center justify-between">
          <span>
            <span v-if="isDR === true" class="text-green-600 font-semibold">DR ✓ · {{ $t('common.moves', { moves: solutionMoves }) }}</span>
            <span v-else-if="isDR === false" class="text-red-500">{{ $t('drTrigger.notDR') }}</span>
          </span>
          <div class="flex items-center gap-2">
            <button
              class="px-1.5 py-0.5 transition-all duration-200"
              :class="showKeyboard ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'"
              @click="showKeyboard = !showKeyboard"
            >
              <Icon name="mdi:keyboard" />
            </button>
            <button
              class="text-gray-400 hover:text-red-500 transition-colors px-1"
              @click="abandonGame"
            >
              <Icon name="mdi:stop-circle-outline" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="error" class="text-red-500 text-xs mb-1">
        {{ error }}
      </div>

      <!-- Virtual Keyboard — fixed at bottom on mobile -->
      <div v-if="showKeyboard" class="fixed bottom-0 left-0 right-0 z-20 bg-gray-100 border-t border-gray-300 p-2 md:static md:border-0 md:bg-transparent md:p-0 md:mt-2">
        <div class="grid grid-cols-6 gap-1 max-w-lg mx-auto">
          <template v-for="row in cubeKeys" :key="row[0]">
            <button
              v-for="key in row"
              :key="key"
              class="bg-white border border-gray-300 shadow-sm font-mono text-sm font-semibold py-2 active:bg-indigo-100 active:border-indigo-400 hover:bg-gray-50 transition-colors select-none"
              @click="appendMove(key)"
            >
              {{ key }}
            </button>
          </template>
        </div>
        <div class="grid grid-cols-3 gap-1 mt-1 max-w-lg mx-auto">
          <button
            class="bg-gray-200 border border-gray-300 shadow-sm text-sm py-1.5 active:bg-gray-300 hover:bg-gray-100 transition-colors select-none"
            @click="deleteLastMove"
          >
            <Icon name="mdi:backspace-outline" class="text-lg" />
          </button>
          <button
            class="bg-gray-200 border border-gray-300 shadow-sm text-sm py-1.5 active:bg-gray-300 hover:bg-gray-100 transition-colors select-none"
            @click="clearSolution"
          >
            Clear
          </button>
          <button
            class="bg-indigo-500 text-white shadow-sm text-sm py-1.5 active:bg-indigo-700 hover:bg-indigo-600 transition-colors select-none"
            :class="{ 'opacity-50': !canSubmit }"
            :disabled="!canSubmit"
            @click="submitSolution"
          >
            {{ $t('drTrigger.submit') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Game Over -->
    <div v-if="gameState === 'ended'" class="mb-6">
      <div class="bg-white shadow-md p-6 mb-4">
        <h2 class="text-xl font-bold mb-4" :class="allCleared ? 'text-green-600' : 'text-indigo-600'">
          {{ allCleared ? $t('drTrigger.allCleared') : $t('drTrigger.gameOver') }}
        </h2>
        <div v-if="allCleared && game" class="mb-4 px-3 py-2 border-l-4 border-green-500 bg-green-50 text-green-700 text-sm">
          {{ $t('drTrigger.allClearedDesc', { time: formatTime(game.remainingTime) }) }}
        </div>
        <div class="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <div class="text-lg md:text-3xl font-bold text-indigo-600">
              {{ game?.levels ?? 0 }}
            </div>
            <div class="text-sm text-gray-500">
              {{ $t('drTrigger.result.levels') }}
            </div>
          </div>
          <div>
            <div class="text-lg md:text-3xl font-bold text-indigo-600">
              {{ formatTime((game?.totalTimeBonus ?? 0) + 600000) }}
            </div>
            <div class="text-sm text-gray-500">
              {{ $t('drTrigger.result.totalTime') }}
            </div>
          </div>
          <div>
            <div class="text-lg md:text-3xl font-bold text-green-600">
              +{{ ((game?.totalTimeBonus ?? 0) / 1000).toFixed(0) }}s
            </div>
            <div class="text-sm text-gray-500">
              {{ $t('drTrigger.result.totalBonus') }}
            </div>
          </div>
        </div>

        <!-- Round details -->
        <div v-if="rounds.length > 0" class="border-t border-gray-200 pt-3">
          <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-x-3 gap-y-1 text-sm">
            <div class="font-bold text-gray-400">
              #
            </div>
            <div class="font-bold text-gray-400">
              {{ $t('common.moves', { moves: '' }).trim() }}
            </div>
            <div class="font-bold text-gray-400">
              {{ $t('drTrigger.optimalMoves', { moves: '' }).trim() }}
            </div>
            <div class="font-bold text-gray-400">
              Bonus
            </div>
            <template v-for="(r, i) in rounds" :key="i">
              <div class="text-gray-400">
                {{ i + 1 }}
              </div>
              <div>{{ (r.moves / 100).toFixed(0) }}</div>
              <div class="text-gray-500">
                {{ (r.optimalMoves / 100).toFixed(0) }}
              </div>
              <div :class="r.timeBonus >= 10000 ? 'text-green-600 font-semibold' : r.timeBonus > 0 ? 'text-blue-600' : 'text-gray-400'">
                {{ r.timeBonus > 0 ? `+${(r.timeBonus / 1000).toFixed(0)}s` : '-' }}
              </div>
            </template>
          </div>
        </div>

        <!-- Last unsolved trigger -->
        <div v-if="lastTriggerInfo" class="border-t border-red-200 pt-3 mt-3">
          <div class="text-red-500 font-semibold text-sm mb-1">
            {{ $t('drTrigger.history.unsolved') }}
          </div>
          <div class="font-mono text-xs bg-gray-50 p-2 break-all mb-1">
            {{ lastTriggerInfo.scramble }}
          </div>
          <div class="text-xs text-gray-400 font-mono mb-1">
            RZP: {{ lastTriggerInfo.rzp }}
            · {{ $t('drTrigger.optimalMoves', { moves: (lastTriggerInfo.optimalMoves / 100).toFixed(0) }) }}
          </div>
          <div class="space-y-0.5 max-h-32 overflow-y-auto">
            <div
              v-for="(s, si) in lastTriggerInfo.solutions.filter((s: any) => s.length * 100 <= lastTriggerInfo.optimalMoves).slice(0, 10)"
              :key="si"
              class="font-mono text-xs bg-gray-50 px-2 py-0.5"
            >
              {{ s.solution }}
            </div>
          </div>
        </div>
      </div>

      <button
        class="bg-indigo-500 text-white px-6 py-3 text-lg shadow-md hover:bg-indigo-600 hover:-translate-y-0.5 transition-all duration-200"
        @click="resetToIdle"
      >
        {{ $t('drTrigger.playAgain') }}
      </button>
    </div>

    <!-- My Game History -->
    <div v-if="gameState !== 'playing' && user.signedIn && myGames.length > 0" class="mb-6 border-t border-gray-200 pt-4">
      <h2 class="font-bold mb-2">
        {{ $t('drTrigger.history.title') }}
      </h2>
      <div class="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-sm">
        <NuxtLink
          v-for="g in myGames"
          :key="g.id"
          :to="`/dr-trigger/${g.id}`"
          class="grid grid-cols-subgrid col-span-4 items-center px-1.5 py-1.5 mb-1 bg-white shadow hover:bg-gray-50 transition-colors"
        >
          <span class="text-gray-500">{{ $dayjs(g.createdAt).format('YYYY-MM-DD HH:mm') }}</span>
          <span class="text-xs text-gray-400 text-right">{{ g.difficulty === 0 ? $t('drTrigger.difficulty.unlimited') : `≤${g.difficulty}` }}</span>
          <span class="font-mono font-bold text-indigo-600 text-right">{{ g.levels }}</span>
          <span class="text-green-600 text-xs text-right">{{ g.totalTimeBonus > 0 ? `+${(g.totalTimeBonus / 1000).toFixed(0)}s` : '' }}</span>
        </NuxtLink>
      </div>
      <div v-if="myGamesTotal > 20" class="mt-2 flex gap-2">
        <button
          v-if="myGamesPage > 1"
          class="text-sm text-indigo-500 hover:underline"
          @click="loadMyGames(myGamesPage - 1)"
        >
          &larr;
        </button>
        <span class="text-sm text-gray-400">{{ myGamesPage }}</span>
        <button
          v-if="myGamesPage * 20 < myGamesTotal"
          class="text-sm text-indigo-500 hover:underline"
          @click="loadMyGames(myGamesPage + 1)"
        >
          &rarr;
        </button>
      </div>
    </div>

    <!-- Leaderboard -->
    <div v-if="leaderboard" class="mt-8">
      <h2 class="text-xl font-bold font-poppins mb-4">
        {{ $t('drTrigger.leaderboard.title') }}
      </h2>

      <div class="bg-white shadow-md p-4">
        <div v-if="leaderboard.highestLevels.length === 0" class="text-gray-400 text-sm">
          {{ $t('drTrigger.noGamesYet') }}
        </div>
        <div v-else class="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 gap-y-2 text-sm items-center">
          <template v-for="(entry, i) in leaderboard.highestLevels" :key="entry.id">
            <span class="text-gray-400 text-right">{{ i + 1 }}</span>
            <UserAvatarName :user="entry.user" />
            <span class="text-xs text-gray-400 text-right">{{ entry.difficulty === 0 ? '∞' : `≤${entry.difficulty}` }}</span>
            <span class="font-mono font-bold text-indigo-600 text-right">{{ entry.levels }}</span>
            <span class="text-xs text-right" :class="entry.remainingTime > 0 ? 'text-green-600' : 'text-gray-300'">
              {{ entry.remainingTime > 0 ? formatTime(entry.remainingTime) : '' }}
            </span>
            <NuxtLink :to="`/dr-trigger/${entry.id}`" class="text-indigo-400 hover:text-indigo-600 transition-colors">
              <Icon name="mdi:eye-outline" />
            </NuxtLink>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
