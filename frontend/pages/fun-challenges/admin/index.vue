<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
const user = useUser()
if (!user.isFunChallengeAdmin)
  throw createError({ statusCode: 403 })

const { t } = useI18n()
const dayjs = useDayjs()
const { data: competitions, refresh } = await useApi<Competition[]>('/fun-challenges/admin/competitions')
const form = reactive({
  subType: CompetitionSubType.QTM_CHALLENGE,
  format: CompetitionFormat.BO1,
  startTime: '',
  endTime: '',
  scrambles: '',
})
const start = computed(() => form.startTime ? dayjs(form.startTime) : null)
const end = computed(() => form.endTime ? dayjs(form.endTime) : null)
const loading = ref(false)
const formState = computed(() => {
  if (!form.startTime || !form.endTime)
    return false
  if (new Date(form.endTime) <= new Date(form.startTime))
    return false
  return true
})
const subTypeOptions = [
  CompetitionSubType.QTM_CHALLENGE,
  CompetitionSubType.STM_CHALLENGE,
  CompetitionSubType.ATM_CHALLENGE,
  CompetitionSubType.CENTER_SOLVED_CHALLENGE,
].map(value => ({
  label: t(`funChallenge.types.${value}`),
  value,
}))
const formatOptions = [
  { label: t('common.bo1'), value: CompetitionFormat.BO1 },
  { label: t('common.mo3'), value: CompetitionFormat.MO3 },
]

function parseScrambles() {
  return form.scrambles
    .split('\n')
    .map(scramble => scramble.trim())
    .filter(Boolean)
}

async function submit() {
  if (!formState.value || loading.value)
    return
  loading.value = true
  try {
    const scrambles = parseScrambles()
    const { error, refresh: submitRefresh } = await useApiPost<Competition>('/fun-challenges/admin/create', {
      body: {
        subType: form.subType,
        format: form.format,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        scrambles: scrambles.length ? scrambles : undefined,
      },
      immediate: false,
    })
    await submitRefresh()
    if (error.value)
      throw error.value
    form.scrambles = ''
    await refresh()
  }
  catch (e: any) {
    const message = (e.data || e.response?.data)?.message || e.message
    alert(message)
  }
  finally {
    loading.value = false
  }
}

async function postAction(path: string) {
  const { error } = await useApiPost(path)
  if (error.value)
    alert((error.value.data as any)?.message || error.value.message)
  await refresh()
}

async function deleteCompetition(competition: Competition) {
  if (!confirm(t('funChallenge.admin.deleteConfirm', { name: competition.name })))
    return
  const { error } = await useApiDelete(`/fun-challenges/admin/${competition.alias}`)
  if (error.value)
    alert((error.value.data as any)?.message || error.value.message)
  await refresh()
}
</script>

<template>
  <div>
    <Heading1>
      {{ $t('funChallenge.admin.title') }}
    </Heading1>
    <FormWrapper class="clear-both" @submit="submit">
      <FormInput
        v-model="form.subType"
        type="select"
        :label="$t('funChallenge.type')"
        :options="subTypeOptions"
        :state="null"
      />
      <FormInput
        v-model="form.format"
        type="select"
        :label="$t('common.format')"
        :options="formatOptions"
        :state="null"
      />
      <FormInput
        v-model="form.startTime"
        type="datetime-local"
        :label="$t('funChallenge.admin.startTime')"
        :state="null"
      />
      <FormInput
        v-model="form.endTime"
        type="datetime-local"
        :label="$t('funChallenge.admin.endTime')"
        :state="null"
      >
        <template #description>
          <div v-if="start && end" class="mt-2 text-sm bg-gray-50 border-l-2 md:border-l-4 border-blue-500 p-2">
            {{ start.format('YYYY-MM-DD HH:mm') }} - {{ end.format('YYYY-MM-DD HH:mm') }}
          </div>
        </template>
      </FormInput>
      <FormInput
        v-model="form.scrambles"
        type="textarea"
        :rows="4"
        :label="$t('funChallenge.admin.scrambles')"
        :state="null"
      >
        <template #description>
          {{ $t('funChallenge.admin.scramblesDescription') }}
        </template>
      </FormInput>
      <div class="mt-4">
        <button
          class="px-2 py-1 text-white bg-blue-500 focus:outline-hidden"
          :class="{ 'opacity-50 cursor-not-allowed': !formState || loading }"
          :disabled="!formState || loading"
          @click.prevent="submit"
        >
          {{ $t('form.submit') }}
        </button>
      </div>
    </FormWrapper>

    <h2 class="font-bold text-lg md:text-2xl my-4">
      {{ $t('funChallenge.admin.recent') }}
    </h2>
    <div class="flex flex-col gap-3">
      <div v-for="competition in competitions" :key="competition.id" class="bg-white shadow-md p-4">
        <NuxtLink :to="competitionPath(competition)" class="text-indigo-500 font-bold">
          {{ competition.name }}
        </NuxtLink>
        <div class="text-sm text-gray-500">
          {{ competition.alias }}
        </div>
        <div class="text-sm">
          {{ $t('common.status') }}: {{ competition.status }}
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-if="competition.status !== CompetitionStatus.ON_GOING && competition.status !== CompetitionStatus.ENDED"
            class="px-2 py-1 text-white bg-indigo-500"
            @click="postAction(`/fun-challenges/admin/${competition.alias}/start`)"
          >
            {{ $t('funChallenge.admin.start') }}
          </button>
          <button
            v-if="competition.status !== CompetitionStatus.ENDED"
            class="px-2 py-1 text-white bg-orange-500"
            @click="postAction(`/fun-challenges/admin/${competition.alias}/end`)"
          >
            {{ $t('funChallenge.admin.end') }}
          </button>
          <button
            v-if="competition.status === CompetitionStatus.NOT_STARTED"
            class="px-2 py-1 text-white bg-rose-500"
            @click="deleteCompetition(competition)"
          >
            {{ $t('funChallenge.admin.delete') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
