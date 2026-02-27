<script setup lang="ts">
const props = withDefaults(defineProps<{
  scramble: Scramble
  competition: Competition
  submissions: Submission[]
  type?: string
  allowDnf?: boolean
  allowUnlimited?: boolean
  allowChangeMode?: boolean
  allowAttachment?: boolean
  allowSubmit?: boolean
  modeDescription?: string
}>(), {
  type: 'weekly',
  allowDnf: true,
  allowUnlimited: true,
  allowChangeMode: false,
  allowAttachment: true,
  allowSubmit: false,
})
const emit = defineEmits<{
  submitted: [Submission]
}>()
const { t } = useI18n()
const submissionsMap = computed(() => {
  const ret: Record<number, Submission> = {}
  for (const submission of props.submissions) ret[submission.mode] = submission

  return ret
})
const form = reactive<SubmissionForm>({
  mode: CompetitionMode.REGULAR,
  solution: '',
  comment: '',
  attachments: [],
})
// if there is an unlimited submission, use unlimited mode
if (submissionsMap.value[CompetitionMode.UNLIMITED])
  form.mode = CompetitionMode.UNLIMITED
const localForm = useLocalStorage<Record<number, Record<number, Omit<SubmissionForm, 'mode'>>>>(`form.${props.type}.${props.competition.alias}`, {})
onMounted(() => {
  const localValue = submissionsMap.value[form.mode] || localForm.value[props.scramble.number]?.[form.mode]
  if (localValue) {
    form.solution = localValue.solution
    form.comment = localValue.comment
    form.attachments = localValue.attachments
  }
})
watch(form, (state) => {
  localForm.value = {
    ...localForm.value,
    [props.scramble.number]: {
      ...localForm.value[props.scramble.number],
      [props.allowChangeMode ? 0 : form.mode]: {
        solution: state.solution,
        comment: state.comment,
        attachments: state.attachments,
      },
    },
  }
})
watch(() => form.mode, (mode) => {
  // don't change anything if mode is allowed to be changed
  if (props.allowChangeMode)
    return
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
const uploadingPromise = ref<Promise<any>>()
const { moves, isSolved } = useComputedState(props, form)
const isOnGoing = computed(() => isInStatus(props.competition, CompetitionStatus.ON_GOING))
const canSubmit = computed(() => props.allowSubmit || isOnGoing.value)
const solutionState = computed<boolean | null>(() => {
  if (form.solution.length === 0)
    return null
  if (!isSolved.value)
    return false
  return moves.value !== DNF
})
const solutionSubmitted = computed<boolean>(() => {
  if (props.allowChangeMode)
    return props.submissions.length > 0
  return submissionsMap.value[form.mode] !== undefined
})
const solutionDisabled = computed<boolean>(() => {
  if (form.mode === CompetitionMode.UNLIMITED
    && !props.allowChangeMode
    && props.allowUnlimited
    && canSubmit.value
  ) {
    return false
  }
  if (props.submissions.length === 0 && canSubmit.value)
    return false
  return true
})
const unlimitedWorse = computed<boolean>(() => {
  return props.allowUnlimited && form.mode === CompetitionMode.UNLIMITED && props.submissions.some(s => s.moves < moves.value * 100)
})
const formState = computed<boolean>(() => {
  if (!props.allowDnf && !solutionState.value)
    return false
  if (!props.allowChangeMode
    && form.mode === CompetitionMode.REGULAR
    && !submissionsMap.value[CompetitionMode.REGULAR]
    && submissionsMap.value[CompetitionMode.UNLIMITED]
  ) {
    return false
  }
  if (unlimitedWorse.value)
    return false
  if (!canSubmit.value && !submissionsMap.value[form.mode]) {
    return false
  }
  return solutionState.value !== null
})
const { confirm, cancel, reveal, isRevealed } = useConfirmDialog()
const loading = ref(false)
const confirmMessage = ref(t('weekly.confirmDNF'))
async function submit() {
  loading.value = true
  await uploadingPromise.value
  try {
    const submission = submissionsMap.value[CompetitionMode.REGULAR] || props.submissions[0]
    if ((form.mode === CompetitionMode.REGULAR && submissionsMap.value[CompetitionMode.REGULAR]) || (props.allowChangeMode && submission)) {
      const { data, refresh } = await useApiPost<Submission>(`/${props.type}/${props.competition.alias}/${submission.id}`, {
        body: {
          mode: props.allowChangeMode ? form.mode : undefined,
          comment: form.comment,
          attachments: form.attachments.map(a => a.id),
        },
        immediate: false,
      })
      await refresh()
      if (data.value)
        emit('submitted', data.value)
    }
    else {
      if (moves.value === DNF) {
        confirmMessage.value = t('weekly.confirmDNF')
        const { isCanceled } = await reveal()
        if (isCanceled)
          return
      }
      const { data, refresh } = await useApiPost<Submission>(`/${props.type}/${props.competition.alias}`, {
        body: {
          scrambleId: props.scramble.id,
          mode: form.mode,
          solution: form.solution,
          comment: form.comment,
          attachments: form.attachments.map(a => a.id),
        },
        immediate: false,
      })
      await refresh()
      if (data.value)
        emit('submitted', data.value)
    }
  }
  catch (e: any) {
    if (e.response && e.response.data && e.response.data.message)
      alert(e.response.data.message)

    else alert(e.message)
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
    const { data, refresh } = await useApiPost<Submission>(`/weekly/${props.competition.alias}/${submissionsMap.value[CompetitionMode.REGULAR].id}/unlimited`, {
      immediate: false,
    })
    await refresh()
    if (data.value) {
      emit('submitted', data.value)
      form.solution = t('weekly.regular.unlimitedSubmitted')
    }
  }
  catch (e: any) {
    if (e.response && e.response.data && e.response.data.message)
      alert(e.response.data.message)

    else alert(e.message)
  }
}
function reset() {
  if (!submissionsMap.value[form.mode])
    form.solution = ''

  form.comment = ''
  form.attachments = []
}
</script>

<template>
  <div v-if="canSubmit || submissions.length > 0" class="mt-6">
    <FormWrapper class="relative" @submit="submit" @reset="reset">
      <FormSignInRequired />
      <FormInput
        v-if="allowUnlimited"
        v-model="form.mode"
        type="radio"
        :label="$t('weekly.mode.label')"
        :state="null"
        :attrs="{ required: true }"
        :options="[
          { label: $t('weekly.regular.label'),
            description: $t('weekly.regular.description'),
            value: CompetitionMode.REGULAR,
            disabled: !canSubmit && !submissionsMap[CompetitionMode.REGULAR],
          },
          {
            label: $t('weekly.unlimited.label'),
            description: $t('weekly.unlimited.description'),
            value: CompetitionMode.UNLIMITED,
            disabled: !canSubmit && !submissionsMap[CompetitionMode.UNLIMITED],
          },
        ]"
      >
        <template v-if="modeDescription" #description>
          {{ modeDescription }}
        </template>
      </FormInput>
      <FormInput
        v-model="form.solution"
        type="textarea"
        :rows="6"
        :label="$t('weekly.solution.label') + (solutionSubmitted ? $t('weekly.submitted') : '')"
        :state="solutionState"
        :attrs="{ required: true, disabled: solutionDisabled }"
      >
        <template #description>
          <div v-if="unlimitedWorse" class="text-red-500">
            {{ $t('weekly.unlimited.invalid') }}
          </div>
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
        :rows="10"
        :label="$t('weekly.comment.label')"
        :state="null"
        class="mt-4"
        :attrs="{ disabled: !canSubmit && submissions.length === 0 }"
      >
        <template #description>
          <p class="py-1" v-html="$t('weekly.comment.description')" />
        </template>
      </FormInput>
      <FormAttachments
        v-if="allowAttachment"
        v-model="form.attachments"
        v-model:uploading="uploadingPromise"
      />
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
          v-if="allowUnlimited && !allowChangeMode && form.mode === CompetitionMode.REGULAR && submissionsMap[CompetitionMode.REGULAR] && !submissionsMap[CompetitionMode.UNLIMITED] && isOnGoing"
          class="px-2 py-1 text-white bg-orange-500 focus:outline-none ml-2"
          @click.prevent="turnToUnlimited"
        >
          {{ $t('weekly.turnToUnlimited.label') }}
        </button>
      </div>
    </FormWrapper>
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
