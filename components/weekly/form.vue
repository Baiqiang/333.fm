<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'

const props = defineProps<{
  scramble: Scramble
  competition: Competition
  submissions: Submission[]
}>()
const emit = defineEmits<{
  submitted: []
}>()
const { t } = useI18n()
const dayjs = useDayjs()
const week = computed(() => dayjs(props.competition.startTime).format('YYYY-ww'))
const submissionsMap = computed(() => {
  const ret: Record<number, Submission> = {}
  for (const submission of props.submissions)
    ret[submission.mode] = submission

  return ret
})
const form = reactive({
  mode: CompetitionMode.REGULAR,
  solution: '',
  comment: '',
})
// if there is an unlimited submission, use unlimited mode
if (submissionsMap.value[CompetitionMode.UNLIMITED])
  form.mode = CompetitionMode.UNLIMITED
const localForm = useLocalStorage<Record<number, Record<number, { solution: string; comment: string }>>>(`form.weekly.${week.value}`, {})
onMounted(() => {
  const localValue = submissionsMap.value[form.mode] || localForm.value[props.scramble.number]?.[form.mode]
  if (localValue) {
    form.solution = localValue.solution
    form.comment = localValue.comment
  }
})
watch(form, (state) => {
  localForm.value = {
    ...localForm.value,
    [props.scramble.number]: {
      ...localForm.value[props.scramble.number],
      [form.mode]: {
        solution: state.solution,
        comment: state.comment,
      },
    },
  }
})
watch(() => form.mode, (mode) => {
  const localValue = submissionsMap.value[mode] || localForm.value[props.scramble.number]?.[mode]
  if (localValue) {
    form.solution = localValue.solution
    form.comment = localValue.comment
  }
  else {
    form.solution = ''
    form.comment = ''
  }
  if (mode === CompetitionMode.REGULAR && submissionsMap.value[CompetitionMode.UNLIMITED] && !submissionsMap.value[CompetitionMode.REGULAR])
    form.solution = t('weekly.regular.unlimitedSubmitted')
})
const solutionAlg = computed(() => {
  // check NISS and ()
  if (form.solution.includes('NISS') || form.solution.includes('('))
    return null
  try {
    return new Algorithm(form.solution)
  }
  catch (e) {
    return null
  }
})
const moves = computed<number>(() => {
  if (!solutionAlg.value)
    return DNF
  try {
    const cube = new Cube()
    cube.twist(new Algorithm(props.scramble.scramble))
    cube.twist(solutionAlg.value)
    if (cube.getCornerCycles() > 0
      || cube.getEdgeCycles() > 0
      || cube.getCenterCycles() > 0
      || cube.hasParity())
      return DNF
    return solutionAlg.value.twists.length + solutionAlg.value.inverseTwists.length
  }
  catch (e) {
    return DNF
  }
})
const solutionState = computed<boolean | null>(() => {
  if (form.solution.length === 0)
    return null
  if (!solutionAlg.value)
    return false

  try {
    const cube = new Cube()
    cube.twist(new Algorithm(props.scramble.scramble))
    cube.twist(solutionAlg.value)
    if (cube.getCornerCycles() > 0
      || cube.getEdgeCycles() > 0
      || cube.getCenterCycles() > 0
      || cube.hasParity())
      return false
    // total moves cannot be more than 80
    if (solutionAlg.value.twists.length + solutionAlg.value.inverseTwists.length > 80)
      return false
    return true
  }
  catch (e) {
    return false
  }
})
const solutionDisabled = computed<boolean>(() => {
  if (form.mode === CompetitionMode.UNLIMITED)
    return false
  if (props.submissions.length === 0)
    return false
  return true
})
const formState = computed<boolean>(() => {
  if (form.mode === CompetitionMode.REGULAR && !submissionsMap.value[CompetitionMode.REGULAR] && submissionsMap.value[CompetitionMode.UNLIMITED])
    return false
  return solutionState.value !== null
})
const { confirm, cancel, reveal, isRevealed } = useConfirmDialog()
const loading = ref(false)
const confirmMessage = ref(t('weekly.confirmDNF'))
async function submit() {
  loading.value = true
  try {
    if (form.mode === CompetitionMode.REGULAR && submissionsMap.value[CompetitionMode.REGULAR]) {
      const { data, refresh } = await useApiPost<Submission>(`/weekly/${week.value}/${submissionsMap.value[CompetitionMode.REGULAR].id}`, {
        body: {
          comment: form.comment,
        },
        immediate: false,
      })
      await refresh()
      if (data.value)
        emit('submitted')
    }
    else {
      if (moves.value === DNF) {
        confirmMessage.value = t('weekly.confirmDNF')
        const { isCanceled } = await reveal()
        if (isCanceled)
          return
      }
      const { data, refresh } = await useApiPost<Submission>(`/weekly/${week.value}`, {
        body: {
          scrambleId: props.scramble.id,
          mode: form.mode,
          solution: form.solution,
          comment: form.comment,
        },
        immediate: false,
      })
      await refresh()
      if (data.value)
        emit('submitted')
    }
  }
  catch (e: any) {
    if (e.response && e.response.data && e.response.data.message)
      alert(e.response.data.message)

    else
      alert(e.message)
  }
  finally {
    loading.value = false
  }
}
async function turnToUnlimited() {
  try {
    confirmMessage.value = t('weekly.turnToUnlimited.confirm')
    const { isCanceled } = await reveal()
    if (isCanceled)
      return
    const { data, refresh } = await useApiPost<Submission>(`/weekly/${week.value}/${submissionsMap.value[CompetitionMode.REGULAR].id}/unlimited`, {
      immediate: false,
    })
    await refresh()
    if (data.value) {
      emit('submitted')
      form.solution = t('weekly.regular.unlimitedSubmitted')
    }
  }
  catch (e: any) {
    if (e.response && e.response.data && e.response.data.message)
      alert(e.response.data.message)

    else
      alert(e.message)
  }
}
function reset() {
  if (!submissionsMap.value[form.mode])
    form.solution = ''

  form.comment = ''
}
</script>

<template>
  <div class="mt-6">
    <form class="relative" @submit="submit" @reset="reset">
      <FormSignInRequired />
      <FormInput
        v-model="form.mode"
        type="radio"
        :label="$t('weekly.mode.label')"
        :state="null"
        :attrs="{ required: true }"
        :options="[
          { label: $t('weekly.regular.label'), description: $t('weekly.regular.description'), value: CompetitionMode.REGULAR },
          { label: $t('weekly.unlimited.label'), description: $t('weekly.unlimited.description'), value: CompetitionMode.UNLIMITED },
        ]"
      />
      <FormInput
        v-model="form.solution"
        type="textarea"
        :rows="4"
        :label="$t('weekly.solution.label') + (submissionsMap[form.mode] ? $t('weekly.submitted') : '')"
        :state="solutionState"
        :attrs="{ required: true, disabled: solutionDisabled }"
      >
        <template #description>
          <div v-if="moves !== DNF" class="text-green-500 text-bold">
            {{ $t('common.moves', { moves }) }}
          </div>
          <div v-else class="text-red-500 text-bold">
            DNF
          </div>
          <I18nT keypath="if.scramble.description" tag="p" scope="global">
            <template #notation>
              <Notation />
            </template>
          </I18nT>
        </template>
      </FormInput>
      <FormInput
        v-model="form.comment"
        type="textarea"
        :rows="4"
        :label="$t('weekly.comment.label')"
        :state="null"
        class="mt-4"
      >
        <template #description>
          <p class="py-1" v-html="$t('weekly.comment.description')" />
        </template>
      </FormInput>
      <div class="mt-4">
        <button
          class="px-2 py-1 text-white bg-blue-500 focus:outline-none"
          :class="{ 'bg-opacity-50 cursor-not-allowed': !formState }"
          :disabled="!formState"
          @click.prevent="submit"
        >
          <Spinner v-if="loading" class="w-4 h-4 text-white border-[3px]" />
          <template v-else>
            {{ $t('form.submit') }}
          </template>
        </button>
        <button class="px-2 py-1 text-white bg-gray-500 focus:outline-none ml-2" @click.prevent="reset">
          {{ $t('form.reset') }}
        </button>
        <button
          v-if="form.mode === CompetitionMode.REGULAR && submissionsMap[CompetitionMode.REGULAR] && !submissionsMap[CompetitionMode.UNLIMITED]"
          class="px-2 py-1 text-white bg-orange-500 focus:outline-none ml-2"
          @click.prevent="turnToUnlimited"
        >
          {{ $t('weekly.turnToUnlimited.label') }}
        </button>
      </div>
    </form>
  </div>
  <Teleport to="body">
    <Modal v-if="isRevealed" :cancel="cancel">
      <div class="mb-5 font-bold">
        {{ confirmMessage }}
      </div>
      <div class="flex gap-2 justify-end">
        <button class="bg-rose-500 hover:bg-opacity-90 text-white cursor-pointer px-2 py-1" @click="confirm">
          {{ $t('form.confirm') }}
        </button>
        <button class="bg-gray-300 hover:bg-opacity-80 cursor-pointer px-2 py-1" @click="cancel">
          {{ $t('form.cancel') }}
        </button>
      </div>
    </Modal>
  </Teleport>
</template>
