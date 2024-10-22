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
  modeDescription?: string
}>(), {
  type: 'weekly',
  allowDnf: true,
  allowUnlimited: true,
  allowChangeMode: false,
  allowAttachment: true,
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
const fileInputId = useId()
const uploadingAttachments = ref<File[]>([])
const uploadingPromise = ref<Promise<any>>()
const { moves, isSolved } = useComputedState(props, form)
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
  if (form.mode === CompetitionMode.UNLIMITED && !props.allowChangeMode)
    return false
  if (props.submissions.length === 0)
    return false
  return true
})
const unlimitedWorse = computed<boolean>(() => {
  return form.mode === CompetitionMode.UNLIMITED && props.submissions.some(s => s.moves < moves.value * 100)
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
async function uploadAttachments(event: Event) {
  const files = (event.target as HTMLInputElement)?.files
  if (!files || files.length === 0)
    return
  let resolve = () => {}
  uploadingPromise.value = new Promise<void>(r => resolve = r)
  const formData = new FormData()
  for (const file of files) {
    formData.append('attachments', file)
  }
  uploadingAttachments.value = [...files]
  const { data, error, refresh } = await useApiPost<Attachment[]>('attachment', {
    body: formData,
    immediate: false,
  })
  await refresh()
  if (error.value) {
    alert(error.value.data?.message || error.value.message)
    return
  }
  form.attachments = (form.attachments || []).concat(data.value || [])
  uploadingAttachments.value = []
  resolve()
}
function removeAttachment(attachment: Attachment) {
  form.attachments = form.attachments.filter(a => a.id !== attachment.id)
}
function getTmpURL(file: File) {
  return URL.createObjectURL(file)
}
</script>

<template>
  <div class="mt-6">
    <form class="relative" @submit="submit" @reset="reset">
      <FormSignInRequired />
      <FormInput
        v-if="allowUnlimited"
        v-model="form.mode"
        type="radio"
        :label="$t('weekly.mode.label')"
        :state="null"
        :attrs="{ required: true }"
        :options="[
          { label: $t('weekly.regular.label'), description: $t('weekly.regular.description'), value: CompetitionMode.REGULAR },
          { label: $t('weekly.unlimited.label'), description: $t('weekly.unlimited.description'), value: CompetitionMode.UNLIMITED },
        ]"
      >
        <template v-if="modeDescription" #description>
          {{ modeDescription }}
        </template>
      </FormInput>
      <FormInput
        v-model="form.solution"
        type="textarea"
        :rows="4"
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
        :rows="6"
        :label="$t('weekly.comment.label')"
        :state="null"
        class="mt-4"
      >
        <template #description>
          <p class="py-1" v-html="$t('weekly.comment.description')" />
        </template>
      </FormInput>
      <FormInput
        v-if="allowAttachment"
        type="file"
        :label="$t('form.working.label')"
        :state="null"
        :attrs="{
          id: fileInputId,
          multiple: true,
          accept: 'image/*',
          onChange: uploadAttachments,
          class: 'appearance-none hidden',
        }"
        class="mt-4"
      >
        <label :for="fileInputId" class="inline-block my-2 cursor-pointer">
          <Icon name="mdi:image-plus-outline" size="36" />
        </label>
        <div v-viewer class="flex flex-wrap gap-2">
          <div v-for="attachment in form.attachments" :key="attachment.id">
            <div class="flex items-center gap-2">
              <SubmissionImg :src="attachment.url" :name="attachment.name" />
              <Icon name="mdi:delete" size="24" class="cursor-pointer text-gray-500" @click="removeAttachment(attachment)" />
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ attachment.name }}
            </div>
          </div>
          <div v-for="file in uploadingAttachments" :key="file.name">
            <div class="flex items-center gap-2">
              <SubmissionImg :src="getTmpURL(file)" :name="file.name" />
              <Spinner class="w-4 h-4 text-green-500 border-[3px]" />
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ file.name }}
            </div>
          </div>
        </div>
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
          v-if="allowUnlimited && !allowChangeMode && form.mode === CompetitionMode.REGULAR && submissionsMap[CompetitionMode.REGULAR] && !submissionsMap[CompetitionMode.UNLIMITED]"
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
