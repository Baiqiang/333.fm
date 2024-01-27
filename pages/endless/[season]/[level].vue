<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
const { params } = useRoute()
const { data, error } = await useApi<Progress>(`/endless/${params.season}/${params.level}`)
if (!data.value || error.value) {
  throw createError({
    statusCode: 404,
  })
}
const progress = reactive<Progress>(data.value)
const endless = inject<Ref<Endless>>(SYMBOL_ENDLESS)!
const myProgress = inject<Ref<UserProgress>>(SYMBOL_ENDLESS_PROGRESS)!
const updateMyProgress = inject<() => void>(SYMBOL_ENDLESS_UPDATE_PROGRESS)!
const updateEndless = inject<() => void>(SYMBOL_ENDLESS_UPDATE)!
const level = computed<number>(() => Number.parseInt(params.level as string))
const myLevel = computed(() => myProgress.value.next?.level ?? 0)
const chanllenge = computed<Chanllenge | undefined>(() => {
  const chanllenges = endless.value.chanllenges
  if (!chanllenges)
    return

  if (chanllenges.length === 1)
    return chanllenges[0]

  let chanllenge = chanllenges.find(c => c.levels?.includes(level.value))
  if (chanllenge)
    return chanllenge

  chanllenge = chanllenges.find(c => c.startLevel! <= level.value && c.endLevel! >= level.value)
  if (chanllenge)
    return chanllenge

  return level.value % 10 === 0 ? chanllenges[chanllenges.length - 1] : chanllenges[chanllenges.length - 2]
})
const submissions = ref<Submission[]>([])
const { t } = useI18n()
useSeoMeta({
  title: `${t('endless.level', { level: params.level })} - ${t('endless.title')} ${params.season}`,
})
if (progress.submission)
  await fetchSubmissions()

async function fetchSubmissions() {
  const { data, refresh } = await useApi<Submission[]>(`/endless/${endless.value.alias}/${params.level}/submissions`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    submissions.value = data.value
}
async function updateData(submission: Submission) {
  progress.submission = submission
  await updateMyProgress()
  await fetchSubmissions()
  if (endless.value.levels.length === level.value)
    await updateEndless()
}
</script>

<template>
  <div>
    <h2 class="font-bold mb-2 text-xl">
      {{ $t('endless.level', { level: params.level }) }}
    </h2>
    <div class="mb-2">
      <div v-if="chanllenge" class="mb-2">
        {{ $t('endless.kickCondition', { single: formatResult(chanllenge.single), team: formatResult(chanllenge.team[0]), persons: chanllenge.team[1] }) }}
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
          <div v-for="{ user, submission } in progress.kickedBy" :key="user.id" class="flex items-center">
            <UserAvatarName :user="user">
              ({{ formatResult(submission.moves) }})
            </UserAvatarName>
          </div>
        </div>
      </template>
    </div>
    <div class="font-bold text-lg">
      {{ $t('if.scramble.label') }}
    </div>
    <Sequence :sequence="progress.scramble.scramble" :source="progress.scramble.scramble" />
    <CubeExpanded :moves="progress.scramble.scramble" />
    <EndlessForm
      :scramble="progress.scramble"
      :competition="endless"
      :submission="progress.submission"
      :level="level"
      @submitted="updateData"
    />
    <div class="flex justify-between mt-4">
      <NuxtLink v-if="level > 1" class="bg-indigo-500 text-white px-3 py-2" :to="`/endless/${endless.alias}/${level - 1}`">
        {{ $t('endless.previous') }}
      </NuxtLink>
      <div v-else />
      <NuxtLink v-if="myLevel > level && level < endless.levels.length" class="bg-indigo-500 text-white px-3 py-2" :to="`/endless/${endless.alias}/${level + 1}`">
        {{ $t('endless.next') }}
      </NuxtLink>
      <div v-else class="bg-gray-500 text-white px-3 py-2 flex items-center">
        <Icon name="solar:lock-keyhole-bold" />{{ $t('endless.next') }}
      </div>
    </div>
    <div v-if="progress.submission">
      <Submissions :submissions="submissions" sortable />
    </div>
  </div>
</template>
