<script setup lang="ts">
import { CompetitionMode } from '~/utils/competition'

const props = defineProps<{
  scramble: Scramble
  competition: Endless
  submission?: Submission
  level: number
}>()
const emit = defineEmits<{
  submitted: [Submission]
}>()
const form = reactive({
  mode: CompetitionMode.REGULAR,
  solution: '',
  comment: '',
})
const localForm = useLocalStorage<{ solution: string, comment: string, mode: CompetitionMode }>(
  `form.endless.${props.competition.alias}.${props.level}`,
  {
    mode: CompetitionMode.REGULAR,
    solution: '',
    comment: '',
  },
)
onMounted(() => {
  const localValue = props.submission || localForm.value
  form.mode = localValue.mode
  form.solution = localValue.solution
  form.comment = localValue.comment
})
watch(form, (state) => {
  localForm.value = {
    mode: state.mode,
    solution: state.solution,
    comment: state.comment,
  }
})
const { moves, isSolved } = useComputedState(props, form)
const solutionState = computed<boolean | null>(() => {
  if (form.solution.length === 0)
    return null
  if (!isSolved.value)
    return false
  return moves.value !== DNF
})
const solutionDisabled = computed<boolean>(() => {
  if (!props.submission)
    return false
  return true
})
const formState = computed<boolean>(() => {
  return solutionState.value !== null
})
const loading = ref(false)
async function submit() {
  loading.value = true
  try {
    if (props.submission) {
      const { data, refresh } = await useApiPost<Submission>(`/endless/${props.competition.alias}/${props.submission.id}`, {
        body: {
          mode: form.mode,
          comment: form.comment,
        },
        immediate: false,
      })
      await refresh()
      if (data.value)
        emit('submitted', data.value)
    }
    else {
      const { data, refresh } = await useApiPost<Submission>(`/endless/${props.competition.alias}`, {
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
function reset() {
  if (!props.submission)
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
          { label: $t('weekly.unlimited.label'), description: $t('endless.unlimited.description'), value: CompetitionMode.UNLIMITED },
        ]"
        class="mb-4"
      >
        <template #description>
          {{ $t('endless.mode.description') }}
        </template>
      </FormInput>
      <FormInput
        v-model="form.solution"
        type="textarea"
        :rows="4"
        :label="$t('weekly.solution.label') + (submission ? $t('weekly.submitted') : '')"
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
      </div>
    </form>
  </div>
</template>
