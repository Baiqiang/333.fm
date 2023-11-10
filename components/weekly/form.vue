<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'

const props = defineProps<{
  scramble: Scramble
  competition: Competition
  submission?: Submission
}>()
const emit = defineEmits<{
  submitted: []
}>()
const dayjs = useDayjs()
const week = computed(() => dayjs(props.competition.startTime).format('YYYY-ww'))
const form = reactive({
  solution: '',
  comment: '',
})
const localForm = useLocalStorage<Record<number, { solution: string; comment: string }>>(`form.weekly.${week.value}`, {})
onMounted(() => {
  const localValue = props.submission || localForm.value[props.scramble.number]
  if (localValue) {
    form.solution = localValue.solution
    form.comment = localValue.comment
  }
})
watch(form, (state) => {
  localForm.value = {
    ...localForm.value,
    [props.scramble.number]: {
      ...state,
    },
  }
})
const moves = computed<number>(() => {
  try {
    const cube = new Cube()
    const solutionAlg = new Algorithm(form.solution)
    cube.twist(new Algorithm(props.scramble.scramble))
    cube.twist(solutionAlg)
    if (cube.getCornerCycles() > 0
      || cube.getEdgeCycles() > 0
      || cube.getCenterCycles() > 0
      || cube.hasParity())
      return DNF
    return solutionAlg.twists.length + solutionAlg.inverseTwists.length
  }
  catch (e) {
    return DNF
  }
})
const solutionState = computed<boolean | null>(() => {
  if (form.solution.length === 0)
    return null

  try {
    const cube = new Cube()
    const solutionAlg = new Algorithm(form.solution)
    cube.twist(new Algorithm(props.scramble.scramble))
    cube.twist(solutionAlg)
    if (cube.getCornerCycles() > 0
      || cube.getEdgeCycles() > 0
      || cube.getCenterCycles() > 0
      || cube.hasParity())
      return false
    // total moves cannot be more than 80
    if (solutionAlg.twists.length + solutionAlg.inverseTwists.length > 80)
      return false
    return true
  }
  catch (e) {
    return false
  }
})
const formState = computed<boolean>(() => {
  return solutionState.value !== null
})
const { confirm, cancel, reveal, isRevealed } = useConfirmDialog()
const loading = ref(false)
async function submit() {
  loading.value = true
  try {
    if (props.submission) {
      const { data, refresh } = await useApiPost<Submission>(`/weekly/${week.value}/${props.submission.id}`, {
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
        const { isCanceled } = await reveal()
        if (isCanceled)
          return
      }
      const { data, refresh } = await useApiPost<Submission>(`/weekly/${week.value}`, {
        body: {
          scrambleId: props.scramble.id,
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
        v-model.trim="form.solution"
        type="textarea"
        :rows="4"
        :label="$t('weekly.solution.label') + (submission ? $t('weekly.submitted') : '')"
        :state="solutionState"
        :attrs="{ required: true, disabled: submission !== undefined }"
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
        v-model.trim="form.comment"
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
  <Teleport to="body">
    <Modal v-if="isRevealed" :cancel="cancel">
      <div class="mb-5 font-bold">
        {{ $t('weekly.confirmDNF') }}
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
