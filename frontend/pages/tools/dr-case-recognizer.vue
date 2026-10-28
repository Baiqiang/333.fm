<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('tools.drCaseRecognizer.title'),
})
const form = reactive({
  scramble: '',
  skeleton: '',
})
const localForm = useLocalStorage('tool.drCaseRecognizer', form)
onMounted(() => {
  Object.assign(form, localForm.value)
})
watch(form, (newVal) => {
  localForm.value = newVal
})
const scrambleState = computed<boolean | null>(() => {
  if (form.scramble.length === 0)
    return null

  try {
    formatAlgorithmToArray(removeComment(form.scramble))
    return true
  }
  catch (e) {
    return false
  }
})
const skeletonState = computed<boolean | null>(() => {
  if (form.skeleton.length === 0)
    return null

  try {
    formatAlgorithmToArray(removeComment(form.skeleton))
    return true
  }
  catch {
    return false
  }
})
const drCase = computed(() => {
  return getDRDescription(`${form.scramble} ${removeComment(form.skeleton)}`)
})
const htrSubset = computed(() => {
  if (!drCase.value.dr || drCase.value.htr)
    return null
  const info = getDRCosetInfo(`${form.scramble} ${removeComment(form.skeleton)}`)
  if (!info)
    return null
  const { subset, edge } = getHTRSubsetOf(info)
  return {
    subset: subset.name,
    name: `${subset.name} ${edge.edges}`,
    share: `${(drWeightToProbability(edge.weight) * 100).toFixed(3)}%`,
    solution: info.solution.join(' '),
    moves: info.solution.length,
  }
})
function reset() {
  form.scramble = ''
  form.skeleton = ''
}
</script>

<template>
  <div>
    <Heading1>
      {{ $t('tools.drCaseRecognizer.title') }}
    </Heading1>
    <p class="mb-2" v-html="$t('tools.drCaseRecognizer.description')" />
    <FormWrapper class="pb-20" @reset="reset">
      <FormInput
        v-model="form.scramble"
        type="text"
        :label="$t('if.scramble.label')"
        :state="scrambleState"
        :error-message="$t('if.scramble.invalid')"
        :attrs="{ required: true }"
      >
        <CubeExpanded v-if="scrambleState" class="my-2" :moves="form.scramble" />
        <template v-if="scrambleState !== false" #description>
          <I18nT keypath="if.scramble.description" tag="p" scope="global">
            <template #notation>
              <Notation />
            </template>
          </I18nT>
        </template>
      </FormInput>
      <FormInput
        v-model="form.skeleton"
        type="textarea"
        :rows="4"
        :label="$t('if.skeleton.label')"
        :state="skeletonState"
        :error-message="$t('if.skeleton.invalid')"
        :attrs="{ required: true }"
        class="mt-4"
      >
        <CubeExpanded v-if="scrambleState !== false && skeletonState" class="my-2" :moves="`${form.scramble}\n${form.skeleton}`" />
        <template #description>
          <div v-if="drCase" class="mt-4 text-gray-900">
            {{ drCase.state }}
          </div>
          <div v-if="htrSubset" class="mt-2 p-3 border-l-4 border-indigo-500 bg-gray-50 text-gray-900">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <span>{{ $t('tools.htrSubsetStats.recognized', { name: htrSubset.name, share: htrSubset.share }) }}</span>
              <NuxtLink :to="{ path: '/tools/htr-subset-stats', query: { subset: htrSubset.subset } }" class="text-sm text-indigo-500 hover:text-indigo-600">
                {{ $t('tools.htrSubsetStats.viewStats') }} →
              </NuxtLink>
            </div>
            <Spoiler :key="htrSubset.solution" class="mt-2" :spoiled="$t('tools.htrSubsetStats.optimalHTR', { n: htrSubset.moves })">
              <div class="text-xs text-gray-500">
                {{ $t('tools.htrSubsetStats.optimalHTR', { n: htrSubset.moves }) }}
              </div>
              <div class="font-mono py-1">
                {{ htrSubset.solution }}
              </div>
            </Spoiler>
          </div>
          <p class="py-1" v-html="$t('if.skeleton.description')" />
          <ol class="list-inside list-decimal">
            <I18nT keypath="if.skeleton.list.0" tag="li" scope="global">
              <template #notation>
                <Notation />
              </template>
            </I18nT>
            <li>{{ $t('if.skeleton.list.1') }}</li>
            <li>{{ $t('if.skeleton.list.2') }}</li>
          </ol>
        </template>
      </FormInput>
      <div class="mt-4 col-span-full">
        <button class="px-2 py-1 text-white bg-gray-500 focus:outline-hidden ml-2" @click.prevent="reset">
          {{ $t('form.reset') }}
        </button>
      </div>
    </FormWrapper>
  </div>
</template>
