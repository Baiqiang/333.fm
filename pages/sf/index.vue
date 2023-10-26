<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('sf.title'),
  titleTemplate: `%s - ${t('title')}`,
})
const user = useUser()
const router = useRouter()
const form = useSFForm()
const localForm = useLocalStorage('form.sf', form.$state)
onMounted(() => {
  form.$patch(localForm.value)
})
form.$subscribe((_, state) => {
  localForm.value = state
})
const skeletonState = computed<boolean | null>(() => {
  if (form.skeleton.length === 0)
    return null

  try {
    const formatted = formatAlgorithmToArray(form.skeleton)
    return formatted.length <= 50
  }
  catch (e) {
    return false
  }
})
const formState = computed<boolean>(() => {
  return skeletonState.value === true
})
async function submit() {
  try {
    const { data, refresh } = await useApiPost<InsertionFinder>('/if', {
      body: {
        type: IFType.SLICEY_FINDER,
        name: form.name,
        skeleton: form.skeleton,
      },
      immediate: false,
    })
    await refresh()
    router.push({
      path: `/sf/${data.value!.hash}`,
    })
  }
  catch (e: any) {
    if (e.response && e.response.data && e.response.data.message)
      alert(e.response.data.message)

    else
      alert(e.message)
  }
}
function reset() {
  form.skeleton = ''
}
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold py-3">
      {{ $t('sf.title') }}
    </h1>
    <p class="mb-2" v-html="$t('sf.description')" />
    <form class="pb-20" @submit="submit" @reset="reset">
      <button class="px-2 py-1 text-white bg-gray-500 focus:outline-none" @click.prevent="reset">
        {{ $t('form.reset') }}
      </button>
      <FormInput
        v-if="user.signedIn"
        v-model.trim="form.name"
        type="text"
        :label="$t('if.name.label')"
        :state="null"
        class="mb-4"
      >
        <template #description>
          <p class="py-1" v-html="$t('if.name.description')" />
        </template>
      </FormInput>
      <FormInput
        v-model.trim="form.skeleton"
        type="text"
        :label="$t('if.skeleton.label')"
        :state="skeletonState"
        :error-message="$t('if.skeleton.invalid')"
        :attrs="{ required: true }"
      />
      <div class="mt-4">
        <button
          class="px-2 py-1 text-white bg-blue-500 focus:outline-none"
          :class="{ 'bg-opacity-50 cursor-not-allowed': !formState }"
          :disabled="!formState"
          @click.prevent="submit"
        >
          {{ $t('form.submit') }}
        </button>
        <button class="px-2 py-1 text-white bg-gray-500 focus:outline-none ml-2" @click.prevent="reset">
          {{ $t('form.reset') }}
        </button>
      </div>
    </form>
  </div>
</template>
