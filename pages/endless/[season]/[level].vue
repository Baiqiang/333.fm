<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
const { params } = useRoute()
const bus = useEventBus('submission')
const { data, error } = await useApi<Progress>(`/endless/${params.season}/${params.level}`)
if (!data.value || error.value) {
  throw createError({
    statusCode: 404,
  })
}
const user = useUser()
const progress = reactive<Progress>(data.value)
const endless = inject<Ref<Endless>>(SYMBOL_ENDLESS)!
const myProgress = inject<Ref<UserProgress>>(SYMBOL_ENDLESS_PROGRESS)!
const updateMyProgress = inject<() => void>(SYMBOL_ENDLESS_UPDATE_PROGRESS)!
const updateEndless = inject<() => void>(SYMBOL_ENDLESS_UPDATE)!
const level = computed<number>(() => Number.parseInt(params.level as string))
const myLevel = computed(() => myProgress.value.next?.level ?? 0)

function matchesChallengeLevel(challenge: Challenge, targetLevel: number) {
  if (challenge.levels?.includes(targetLevel))
    return true
  if (challenge.startLevel === undefined || challenge.startLevel === null)
    return false
  if (targetLevel < challenge.startLevel)
    return false
  return challenge.endLevel === undefined || challenge.endLevel === null || targetLevel <= challenge.endLevel
}

function isAnyValidSolutionRule(challenge: Challenge) {
  return challenge.type === ChallengeType.REGULAR
    && challenge.challenge.single === 8000
    && challenge.challenge.team[0] === 8000
    && challenge.challenge.team[1] === 1
}

const challenge = computed<Challenge | undefined>(() => {
  const challenges = endless.value.challenges
  if (!challenges?.length)
    return
  return challenges.find(c => matchesChallengeLevel(c, level.value))
})
const { t } = useI18n()

const bossInitialHp = computed(() => {
  if (challenge.value?.type !== ChallengeType.BOSS)
    return 0
  return progress.scramble.initialHP || challenge.value.challenge.maxHitPoints || 0
})

const bossCurrentHp = computed(() => {
  if (challenge.value?.type !== ChallengeType.BOSS)
    return 0
  return Math.max(0, Math.min(progress.scramble.currentHP || 0, bossInitialHp.value))
})

const bossHpPercent = computed(() => {
  if (bossInitialHp.value <= 0)
    return 0
  return Math.max(0, Math.min(100, bossCurrentHp.value / bossInitialHp.value * 100))
})

function kickoffSummary(submission: Submission) {
  if (submission.moves <= 0)
    return ''
  return formatResult(submission.moves)
}

function isBossInstantKill(submission: Submission) {
  return challenge.value?.type === ChallengeType.BOSS && submission.bossInstantKill === true
}

function bossEffectLabel(submission: Submission) {
  if (challenge.value?.type !== ChallengeType.BOSS)
    return ''
  if (isBossInstantKill(submission))
    return t('endless.instantKill')
  if (submission.damage && submission.damage > 0)
    return t('endless.damageDealt', { damage: submission.damage })
  return ''
}

const isConditionMode = computed(() => endless.value.subType === CompetitionSubType.MYSTERY)
const conditions = computed(() => progress.conditions ?? [])
const allTriggered = computed(() => conditions.value.length > 0 && conditions.value.every(c => c.revealed && !c.autoRevealed))
const triggeredCount = computed(() => conditions.value.filter(c => c.revealed && !c.autoRevealed).length)

const submissions = ref<Submission[]>([])
useSeoMeta({
  title: `${t('endless.level', { level: params.level })} - ${t('endless.title')} ${params.season}`,
})
if (progress.submission)
  await fetchSubmissions()
bus.on(fetchSubmissions)

async function fetchSubmissions() {
  const { data, refresh } = await useApi<Submission[]>(`/endless/${endless.value.alias}/${params.level}/submissions`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    submissions.value = data.value
}

async function refreshLevelProgress() {
  const { data, refresh } = await useApi<Progress>(`/endless/${endless.value.alias}/${params.level}`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    Object.assign(progress, data.value)
}

async function sleep(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function syncAfterSubmission() {
  if (isConditionMode.value) {
    const prevTriggered = triggeredCount.value
    for (let attempt = 0; attempt < 4; attempt++) {
      await refreshLevelProgress()
      if (triggeredCount.value > prevTriggered)
        return
      await sleep(250 * (attempt + 1))
    }
    return
  }
  const previousHp = progress.scramble.currentHP || 0
  const previousKickoffs = progress.kickedBy.length
  for (let attempt = 0; attempt < 4; attempt++) {
    await refreshLevelProgress()
    if (challenge.value?.type !== ChallengeType.BOSS)
      return
    if (progress.kickedBy.length > previousKickoffs)
      return
    if ((progress.scramble.currentHP || 0) !== previousHp)
      return
    await sleep(250 * (attempt + 1))
  }
}

async function updateData(submission: Submission) {
  progress.submission = submission
  fetchSubmissions()
  await updateMyProgress()
  await syncAfterSubmission()
  if ((myProgress.value.next?.level ?? 0) > level.value || endless.value.levels.length === level.value)
    await updateEndless()
}
</script>

<template>
  <div>
    <BackTo :to="competitionPath(endless)" :label="endless.name" />
    <h2 class="font-bold mb-2 text-xl">
      {{ $t('endless.level', { level: params.level }) }}
    </h2>
    <div class="mb-2">
      <div v-if="challenge?.type === ChallengeType.REGULAR && isAnyValidSolutionRule(challenge)" class="mb-2">
        {{ $t('endless.kickConditionAny') }}
      </div>
      <div v-else-if="challenge?.type === ChallengeType.REGULAR" class="mb-2">
        {{ $t('endless.kickCondition', { single: formatResult(challenge.challenge.single), team: formatResult(challenge.challenge.team[0]), persons: challenge.challenge.team[1] }) }}
      </div>
      <div v-else-if="challenge" class="mb-2">
        {{ $t('endless.bossKickCondition', {
          instantKill: formatResult(challenge.challenge.instantKill),
        }) }}
      </div>
      <div v-if="challenge?.type === ChallengeType.BOSS" class="mb-2">
        {{ $t('endless.bossCurrentHp', { hp: bossCurrentHp }) }}
        <div class="mt-1 relative h-6 overflow-hidden border border-red-950 bg-linear-to-r from-stone-950 via-red-950 to-stone-950 shadow-inner">
          <div
            class="absolute inset-y-0 left-0 overflow-hidden bg-linear-to-r from-red-800 via-red-600 to-orange-400 transition-all duration-500 ease-out"
            :style="{ width: `${bossHpPercent}%` }"
          >
            <div class="absolute inset-0 bg-linear-to-b from-white/20 via-transparent to-black/25" />
            <div class="absolute inset-0 animate-pulse bg-white/8" />
          </div>
          <div
            class="absolute inset-y-0 left-0 opacity-20 transition-all duration-500 ease-out bg-[linear-gradient(135deg,rgba(255,255,255,0.35)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.35)_50%,rgba(255,255,255,0.35)_75%,transparent_75%,transparent)] bg-size-[16px_16px]"
            :style="{ width: `${bossHpPercent}%` }"
          />
          <div class="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-wide text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
            {{ bossCurrentHp }} / {{ bossInitialHp }}
          </div>
        </div>
      </div>
      <div v-if="progress.dnfPenalty" class="border-l-4 border-red-700 bg-red-100 px-3 py-2 my-3 text-red-900 font-semibold">
        {{ $t('endless.bossDnfPenalty') }}
      </div>
      <div v-if="isConditionMode && conditions.length > 0" class="border border-gray-300 p-4 mb-3">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold">
            {{ $t('endlessChallenge.conditions.title') }}
          </h3>
          <span class="text-sm" :class="allTriggered ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-500'">
            {{ triggeredCount }} / {{ conditions.length }}
          </span>
        </div>
        <div class="space-y-2">
          <div
            v-for="(condition, idx) in conditions"
            :key="condition.id"
            class="flex items-center gap-3 p-2 border transition-all duration-300"
            :class="condition.revealed && !condition.autoRevealed
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
              : condition.autoRevealed
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'"
          >
            <div
              class="shrink-0 w-8 h-8 flex items-center justify-center text-sm font-bold"
              :class="condition.revealed && !condition.autoRevealed
                ? 'bg-green-500 text-white'
                : condition.autoRevealed
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'"
            >
              {{ condition.revealed && !condition.autoRevealed ? '✓' : condition.autoRevealed ? '?' : idx + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <div v-if="condition.revealed" class="font-medium">
                <EndlessChallengeConditionLabel :condition="condition" />
              </div>
              <div v-else class="text-gray-400 italic">
                {{ $t('endlessChallenge.conditions.hidden') }}
              </div>
            </div>
            <div v-if="condition.revealed && condition.contributors?.length" class="flex items-center gap-1 text-sm shrink-0">
              <UserAvatar v-for="c in condition.contributors" :key="c.userId" :user="(submissions.find(s => s.id === c.submissionId)?.user ?? condition.triggeredByUser)!" />
            </div>
            <div v-else-if="condition.revealed && condition.triggeredByUser" class="flex items-center gap-1 text-sm shrink-0">
              <UserAvatar :user="condition.triggeredByUser" />
            </div>
            <div v-if="condition.autoRevealed" class="text-xs text-amber-500 shrink-0">
              {{ $t('endlessChallenge.autoRevealed') }}
            </div>
          </div>
        </div>
        <div v-if="allTriggered" class="mt-3 text-center text-green-600 dark:text-green-400 font-bold">
          {{ $t('endlessChallenge.conditions.allMet') }}
        </div>
      </div>
      <div class="mb-2">
        {{ $t('endless.openAt', { time: $dayjs(progress.scramble.createdAt).locale($i18n.locale).format('LLL') }) }}
      </div>
      <template v-if="progress.kickedBy.length > 0 && progress.submission">
        <div class="mb-2">
          {{ $t('endless.kickedAt', { time: $dayjs(progress.kickedBy[0].createdAt).locale($i18n.locale).format('LLL') }) }}
        </div>
        <div class="font-bold text-lg">
          {{ $t('endless.kickedBy') }}
        </div>
        <div class="flex flex-col md:flex-row gap-2">
          <div v-for="{ user: kickoffUser, submission } in progress.kickedBy" :key="kickoffUser.id" class="flex items-center">
            <UserAvatarName :user="kickoffUser">
              <template v-if="kickoffSummary(submission)">
                ({{ kickoffSummary(submission) }})
                <span
                  v-if="bossEffectLabel(submission)"
                  class="ml-1 inline-flex items-center border px-1 text-xs font-bold"
                  :class="isBossInstantKill(submission)
                    ? 'border-orange-300 bg-red-600 text-white shadow-sm shadow-red-900/30 dark:border-orange-400 dark:bg-red-500'
                    : 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300'"
                >
                  {{ bossEffectLabel(submission) }}
                </span>
              </template>
            </UserAvatarName>
          </div>
        </div>
      </template>
    </div>
    <div class="font-bold text-lg">
      {{ $t('if.scramble.label') }}
    </div>
    <ScrambleDisplay v-if="progress.scramble.scramble" :scramble="progress.scramble.scramble" :cubie-cube="progress.scramble.cubieCube" />
    <Cube3d v-else :cubie-cube="progress.scramble.cubieCube" />
    <CompetitionForm
      type="endless"
      :scramble="progress.scramble"
      :competition="endless"
      :submissions="submissions.filter(s => s.user.id === user.id)"
      :mode-description="$t('endless.mode.description')"
      :allow-dnf="challenge?.type === ChallengeType.BOSS || isConditionMode"
      allow-submit
      allow-change-mode
      @submitted="updateData"
    />
    <div class="flex justify-between mt-4">
      <NuxtLink v-if="level > 1" class="bg-indigo-500 text-white px-3 py-2" :to="competitionPath(endless, { number: level - 1 })">
        {{ $t('endless.previous') }}
      </NuxtLink>
      <div v-else />
      <NuxtLink v-if="myLevel > level && level < endless.levels.length" class="bg-indigo-500 text-white px-3 py-2" :to="competitionPath(endless, { number: level + 1 })">
        {{ $t('endless.next') }}
      </NuxtLink>
      <div v-else class="bg-gray-500 text-white px-3 py-2 flex items-center">
        <Icon name="solar:lock-keyhole-bold" />{{ $t('endless.next') }}
      </div>
    </div>
    <div v-if="progress.submission">
      <Submissions :submissions="submissions" :scramble="progress.scramble" :competition="endless" sortable>
        <template #extra="submission">
          <span
            v-if="bossEffectLabel(submission)"
            class="ml-1 inline-flex items-center border px-1 text-xs font-bold"
            :class="isBossInstantKill(submission)
              ? 'border-orange-300 bg-red-600 text-white shadow-sm shadow-red-900/30 dark:border-orange-400 dark:bg-red-500'
              : 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300'"
          >
            {{ bossEffectLabel(submission) }}
          </span>
        </template>
      </Submissions>
    </div>
  </div>
</template>
