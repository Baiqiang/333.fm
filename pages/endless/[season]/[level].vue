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
const level = computed<number>(() => Number.parseInt(params.level as string))
const myLevel = computed(() => myProgress.value.next?.level ?? 0)
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
}
</script>

<template>
  <div>
    <h2 class="font-bold mb-2 text-xl">
      {{ $t('endless.level', { level: params.level }) }}
    </h2>
    <div class="mb-2">
      <div class="font-bold text-lg">
        {{ $t('endless.kickedBy') }}
      </div>
      <div class="flex flex-col md:flex-row gap-2">
        <div v-for="kickedBy in progress.kickedBy" :key="kickedBy.id" class="flex items-center">
          <img :src="kickedBy.user.avatarThumb" class="w-6 h-6 mr-1">{{ localeName(kickedBy.user.name, $i18n.locale) }} ({{ formatResult(kickedBy.submission.moves) }})
        </div>
      </div>
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
      <div
        v-for="submission in submissions"
        :key="submission.id"
        class="border-t border-gray-300 pt-2 mt-2 flex flex-col md:flex-row gap-2 items-start"
      >
        <WeeklyUser :user="submission.user">
          <div v-if="submission.moves !== DNF" class="font-bold" :class="{ 'text-indigo-500': submission.mode === CompetitionMode.REGULAR, 'text-orange-500': submission.mode === CompetitionMode.UNLIMITED }">
            {{ formatResult(submission.moves) }}
          </div>
          <div v-else class="text-gray-500 font-bold">
            DNF
          </div>
        </WeeklyUser>
        <WeeklySubmission :submission="submission" />
      </div>
    </div>
  </div>
</template>
