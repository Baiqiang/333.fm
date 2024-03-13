<script setup lang="ts">
import { Algorithm } from 'insertionfinder'

const props = defineProps<{
  scramble: Scramble
  tree: Submission | null
}>()
const { t } = useI18n()
enum SkeletonMode {
  NORMAL,
  INVERSE,
}
const inverse = defineModel<boolean>('inverse', {
  default: false,
})
const insertions = defineModel<ChainInsertion[]>({
  required: true,
})
const flatSkeleton = computed(() => flattenSkeleton(props.tree))
const skeletonModes = computed(() => {
  const modes: { value: SkeletonMode, label: string }[] = []
  const alg = new Algorithm(flatSkeleton.value)
  if (alg.twists.length > 0)
    modes.push({ value: SkeletonMode.NORMAL, label: t('common.insertions.mode.normal') })
  if (alg.inverseTwists.length > 0)
    modes.push({ value: SkeletonMode.INVERSE, label: t('common.insertions.mode.inverse') })
  return modes
})
const currentSkeleton = computed(() => insertions.value.length > 0
  ? getNextSkeleton(insertions.value[insertions.value.length - 1], true)
  : formatSkeleton(flatSkeleton.value))
const form = reactive({
  mode: skeletonModes.value[0].value,
  insertion: '',
  insertPlace: 0,
})
const insertionValid = computed(() => {
  try {
    const alg = new Algorithm(form.insertion)
    return alg.inverseTwists.length === 0 && alg.length > 0
  }
  catch (e) {
    return false
  }
})
watch(() => form.mode, (mode) => {
  inverse.value = mode === SkeletonMode.INVERSE
  insertions.value = []
})
function addInsertion() {
  insertions.value.push({
    skeleton: currentSkeleton.value,
    insertion: form.insertion,
    insertPlace: form.insertPlace,
  })
  form.insertPlace = 0
  form.insertion = ''
}
function removeInsertion() {
  const insertion = insertions.value.pop()
  if (insertion) {
    form.insertPlace = insertion.insertPlace
    form.insertion = insertion.insertion
  }
}
function formatSkeleton(skeleton: string) {
  skeleton = formatAlgorithm(skeleton)
  if (form.mode === SkeletonMode.INVERSE)
    return reverseTwists(skeleton)
  return skeleton
}
</script>

<template>
  <FormLabel :label="$t('if.solutions.insertions')">
    <div v-if="skeletonModes.length > 1" class="flex flex-wrap gap-2 md:mt-3 mb-2 px-2">
      <label v-for="{ value, label } in skeletonModes" :key="value" class="flex items-center gap-2 cursor-pointer">
        <input
          v-model="form.mode"
          type="radio"
          :value="value"
        >
        {{ label }}
      </label>
    </div>
    <SubmissionInsertions :insertions="insertions" :scramble="scramble" :inverse="form.mode === SkeletonMode.INVERSE" />
    <div>
      <div class="font-bold">
        {{ $t('if.skeleton.label') }}
      </div>
      <ChainSkeleton v-model="form.insertPlace" :skeleton="currentSkeleton" :inverse="form.mode === SkeletonMode.INVERSE" />
      <div class="font-bold">
        {{ $t('if.solutions.insertion') }}
      </div>
      <div class="flex items-center">
        <input
          v-model="form.insertion"
          type="text"
          class="w-full focus:ring-0"
          :class="{ 'border-red-500 focus:border-red-500': !insertionValid && form.insertion.trim() !== '' }"
        >
        <div class="flex gap-2 items-center w-12">
          <button v-if="insertionValid" class="mr-auto" @click.prevent="addInsertion">
            <Icon name="mdi:add" class="text-green-500 text-lg" />
          </button>
          <button v-if="insertions.length > 0" class="ml-auto" @click.prevent="removeInsertion">
            <Icon name="mdi:minus" class="text-red-500 text-lg" />
          </button>
        </div>
      </div>
    </div>
    <slot />
  </FormLabel>
</template>
