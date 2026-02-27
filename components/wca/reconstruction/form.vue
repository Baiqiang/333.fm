<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'

const props = defineProps<{
  wcaCompetitionId: string
  roundNumber: number
  scrambleNumber: number
  existingScramble?: string
  scrambleDisabled?: boolean
  existingSolution?: Submission
  userAttemptMoves?: number | null
}>()

const emit = defineEmits<{
  submitted: []
}>()

const { t } = useI18n()

const officialDNF = computed(() => props.userAttemptMoves != null && props.userAttemptMoves < 0)

const scramble = ref(props.existingScramble ?? '')
const solution = ref(props.existingSolution?.solution ?? '')
const comment = ref(props.existingSolution?.comment ?? '')
const attachments = ref<Attachment[]>(props.existingSolution?.attachments ?? [])
const uploadingPromise = ref<Promise<any>>()
const submitting = ref(false)
const error = ref('')
const { confirm, cancel, reveal, isRevealed } = useConfirmDialog()

const clientValidation = computed(() => {
  if (!scramble.value.trim() || !solution.value.trim()) {
    return { valid: false, moves: 0, message: '' }
  }
  try {
    const cube = new Cube()
    cube.twist(new Algorithm(scramble.value.trim()))
    const solutionStr = replaceQuote(solution.value.trim())
    const solutionAlg = new Algorithm(solutionStr)
    cube.twist(solutionAlg)
    const bestCube = cube.getBestPlacement()
    if (bestCube.isSolved()) {
      const moves = solutionAlg.length
      if (moves > 80) {
        return { valid: false, moves, message: '> 80' }
      }
      return { valid: true, moves, message: '' }
    }
    return { valid: false, moves: 0, message: t('weekly.solution.invalid') }
  }
  catch {
    return { valid: false, moves: 0, message: t('weekly.solution.invalid') }
  }
})

const isDNF = computed(() => !clientValidation.value.valid)

const canSubmit = computed(() => {
  if (submitting.value)
    return false
  return true
})

const solutionState = computed<boolean | null>(() => {
  if (!solution.value.trim())
    return null
  return clientValidation.value.valid
})

const movesMatch = computed(() => {
  if (!clientValidation.value.valid)
    return null
  const reconMoves = clientValidation.value.moves
  if (props.userAttemptMoves != null && props.userAttemptMoves > 0) {
    return reconMoves === props.userAttemptMoves
  }
  if (props.existingSolution?.wcaMoves != null && props.existingSolution.wcaMoves < DNF) {
    return reconMoves * 100 === props.existingSolution.wcaMoves
  }
  return null
})

async function submit() {
  if (!scramble.value.trim() && !props.scrambleDisabled) {
    error.value = `${t('wca.recon.scramble')} *`
    return
  }
  if (isDNF.value && !officialDNF.value) {
    const { isCanceled } = await reveal()
    if (isCanceled)
      return
  }
  error.value = ''
  submitting.value = true
  await uploadingPromise.value
  try {
    await useClientApi('wca/reconstruction/submit', {
      method: 'POST',
      body: {
        wcaCompetitionId: props.wcaCompetitionId,
        roundNumber: props.roundNumber,
        scrambleNumber: props.scrambleNumber,
        scramble: props.scrambleDisabled ? undefined : scramble.value.trim(),
        solution: solution.value.trim() || undefined,
        comment: comment.value.trim(),
        attachments: attachments.value.map(a => a.id),
      },
    })
    emit('submitted')
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.message || t('weekly.solution.invalid')
  }
  finally {
    submitting.value = false
  }
}

function reset() {
  if (!props.existingSolution)
    solution.value = ''
  comment.value = ''
  attachments.value = []
  error.value = ''
}
</script>

<template>
  <div class="mt-6">
    <FormWrapper class="relative" @submit="submit" @reset="reset">
      <FormSignInRequired />

      <FormInput
        v-if="!scrambleDisabled"
        v-model="scramble"
        type="text"
        :label="t('wca.recon.scramble')"
        :state="null"
        :attrs="{ disabled: scrambleDisabled }"
      />

      <FormInput
        v-model="solution"
        type="textarea"
        :rows="4"
        :label="$t('weekly.solution.label') + (existingSolution ? $t('weekly.submitted') : '')"
        :state="solutionState"
      >
        <template v-if="solution.trim()" #description>
          <template v-if="clientValidation.valid">
            <span class="text-green-500">
              {{ $t('common.moves', { moves: clientValidation.moves }) }}
            </span>
            <template v-if="movesMatch !== null">
              <span v-if="movesMatch" class="text-green-600 flex items-center gap-0.5">
                <Icon name="heroicons:check-badge-16-solid" />
                {{ t('wca.recon.movesMatchOfficial') }}
              </span>
              <span v-else class="text-yellow-600 flex items-center gap-0.5">
                <Icon name="heroicons:exclamation-triangle-16-solid" />
                {{ t('wca.recon.movesMismatch') }}
                <span v-if="userAttemptMoves && userAttemptMoves > 0" class="font-mono">(WCA: {{ userAttemptMoves }})</span>
              </span>
            </template>
          </template>
          <span v-else class="text-red-500">
            DNF
          </span>
        </template>
      </FormInput>

      <FormInput
        v-model="comment"
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

      <FormAttachments
        v-model="attachments"
        v-model:uploading="uploadingPromise"
      />

      <div v-if="error" class="col-span-full text-red-600 text-sm">
        {{ error }}
      </div>

      <div class="col-span-full mt-4">
        <button
          class="px-2 py-1 text-white bg-blue-500 focus:outline-none"
          :class="{ 'bg-opacity-50 cursor-not-allowed': !canSubmit }"
          :disabled="!canSubmit"
          @click.prevent="submit"
        >
          <Spinner v-if="submitting" class="w-4 h-4 text-white border-[3px]" />
          <template v-else>
            {{ $t('form.submit') }}
          </template>
        </button>
        <button class="px-2 py-1 text-white bg-gray-500 focus:outline-none ml-2" @click.prevent="reset">
          {{ $t('form.reset') }}
        </button>
      </div>
    </FormWrapper>

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
  </div>
</template>
