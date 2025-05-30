<script setup lang="ts">
import { type ChainInsertion, SolutionMode } from '#imports'

const props = defineProps<{
  scramble: Scramble
  tree: Submission | null
  submissions: Submission[]
}>()
const emit = defineEmits<{
  submitted: [Submission]
}>()
const bus = useEventBus('submission')
const form = reactive({
  mode: SolutionMode.REGULAR,
  solution: '',
  comment: '',
  inverse: false,
  insertions: [] as ChainInsertion[],
})
const localForm = useLocalStorage<{
  mode: SolutionMode
  solution: string
  comment: string
  inverse: boolean
  insertions: ChainInsertion[]
}>(
  `form.chain.${props.scramble.number}.${props.tree?.id}`,
  {
    mode: SolutionMode.REGULAR,
    solution: '',
    comment: '',
    inverse: false,
    insertions: [],
  },
)
const { phase, moves, cumulativeMoves, cancelMoves, cube, status, solutionAlg } = useComputedPhases(props, form)
const loading = ref(false)
const canInsert = computed(() => props.tree && [SubmissionPhase.FINISHED, SubmissionPhase.SKELETON].includes(props.tree.phase))
const solutionState = computed<boolean | null>(() => {
  if (form.solution.length === 0 && form.insertions.length === 0)
    return null
  if (moves.value === 0)
    return false
  switch (phase.value) {
    case SubmissionPhase.SCRAMBLED:
      return false
    case SubmissionPhase.EO:
    case SubmissionPhase.DR:
    case SubmissionPhase.HTR:
    case SubmissionPhase.SKELETON:
      if (props.tree
        && (phase.value <= props.tree.phase || props.tree.phase === SubmissionPhase.FINISHED)
        && !(phase.value === SubmissionPhase.HTR && props.tree.phase === SubmissionPhase.SKELETON)
      ) {
        return false
      }
      if (phase.value !== SubmissionPhase.SKELETON && !checkLastQuarterTurns(solutionAlg.value?.twists ?? [], solutionAlg.value?.inverseTwists ?? []))
        return false
      break
    case SubmissionPhase.FINISHED:
      break
  }
  return true
})
const duplicate = computed<boolean>(() => {
  if (form.solution.length === 0)
    return false
  return props.submissions.some(submission => submission.solution === solutionAlg.value?.toString())
})
const formState = computed<boolean>(() => {
  return solutionState.value === true && !duplicate.value && !loading.value
})
onMounted(() => {
  const localValue = localForm.value
  form.mode = localValue.mode
  form.solution = localValue.solution
  form.comment = localValue.comment
  form.inverse = localValue.inverse
  form.insertions = localValue.insertions
})
watch(form, (state) => {
  localForm.value = {
    mode: state.mode,
    solution: state.solution,
    comment: state.comment,
    inverse: state.inverse,
    insertions: state.insertions,
  }
})
async function submit() {
  loading.value = true
  try {
    const { data, refresh, error } = await useApiPost<Submission>(`/chain`, {
      body: {
        scrambleId: props.scramble.id,
        mode: form.mode,
        solution: form.solution,
        comment: form.comment,
        parentId: props.tree?.id,
        inverse: form.inverse,
        insertions: form.insertions.slice(),
      },
      immediate: false,
    })
    await refresh()
    if (error.value)
      alert(error.value.data?.message || error.value.message)
    if (data.value) {
      form.solution = ''
      form.comment = ''
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
  form.solution = ''
  form.comment = ''
}
async function decline() {
  if (!props.tree)
    return

  loading.value = true
  try {
    const { data, error } = await useApiPost<{ like: boolean, favorite: boolean }>('/user/act', {
      body: {
        id: props.tree.id,
        decline: !props.tree.declined,
      },
    })
    if (error.value || !data.value)
      return

    bus.emit()
  }
  catch (e) {

  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mt-6">
    <FormWrapper class="relative" @submit.prevent="submit" @reset="reset">
      <FormSignInRequired />
      <FormInput
        v-if="canInsert"
        v-model="form.mode"
        type="radio"
        :label="$t('weekly.mode.label')"
        :state="null"
        :attrs="{ required: true }"
        :options="[
          { label: $t('weekly.regular.label'), value: 0 },
          { label: $t('if.solutions.insertion'), value: 1 },
        ]"
      />
      <FormInput
        v-if="form.mode === SolutionMode.REGULAR"
        v-model="form.solution"
        type="textarea"
        :rows="4"
        :label="$t('weekly.solution.label')"
        :state="solutionState"
        :attrs="{ required: true }"
      >
        <template #description>
          <div v-if="!solutionAlg" class="text-red-500">
            {{ $t('if.skeleton.invalid') }}
          </div>
          <div v-else-if="duplicate" class="text-yellow-500">
            {{ $t('chain.duplicate') }}
          </div>
          <ChainPhase
            v-else
            class="text-bold"
            :class="{
              'text-green-500': solutionState,
              'text-red-500': !solutionState,
            }"
            :phase="phase"
            :status="status"
            :moves="moves"
            :cumulative-moves="cumulativeMoves"
            :cancel-moves="cancelMoves"
          />
          <CubeExpanded :cubie-cube="getCubieCube(cube)" />
          <I18nT keypath="if.scramble.description" tag="p" scope="global">
            <template #notation>
              <Notation />
            </template>
          </I18nT>
        </template>
      </FormInput>
      <ChainInsertions
        v-else
        v-model="form.insertions"
        v-model:inverse="form.inverse"
        :scramble="props.scramble"
        :tree="props.tree"
      />
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
      <div class="mt-4 flex gap-2">
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
        <button class="px-2 py-1 text-white bg-gray-500 focus:outline-none" @click.prevent="reset">
          {{ $t('form.reset') }}
        </button>
        <button
          v-if="tree"
          class="px-2 py-1 text-white bg-yellow-500 focus:outline-none"
          @click.prevent="decline"
        >
          <Spinner v-if="loading" class="w-4 h-4 text-white border-[3px]" />
          <template v-else>
            {{ tree.declined ? $t('form.incline') : $t('form.decline') }}
          </template>
        </button>
      </div>
    </FormWrapper>
  </div>
</template>
