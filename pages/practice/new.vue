<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('practice.new.title'),
})
const user = useUser()
const router = useRouter()
const form = useNewPracticeForm()
const localForm = useLocalStorage('practice.new', form.$state)
onMounted(() => {
  form.$patch(localForm.value)
})
form.$subscribe((_, state) => {
  localForm.value = state
})
const loading = ref(false)
const formState = computed<boolean>(() => {
  // @todo check if user is eligible to create a new practice
  return true
})
async function submit() {
  loading.value = true
  try {
    const { data, error, refresh } = await useApiPost<Competition>('/practice', {
      body: {
        format: form.format,
      },
      immediate: false,
    })
    await refresh()
    if (error.value)
      throw error.value
    router.push({
      path: competitionPath(data.value!),
    })
  }
  catch (e: any) {
    const message = (e.data || e.response?.data)?.message || e.message
    alert(message)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold py-3">
      {{ $t('practice.new.title') }}
    </h1>
    <form class="relative" @submit="submit">
      <FormSignInRequired />
      <FormInput
        v-model="form.format"
        type="radio"
        :label="$t('common.format')"
        :state="null"
        :attrs="{ required: true }"
        :options="[
          { label: $t('common.bo1'), value: CompetitionFormat.BO1 },
          { label: $t('common.mo3'), value: CompetitionFormat.MO3 },
        ]"
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
      </div>
    </form>
  </div>
</template>
