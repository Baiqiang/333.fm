<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const form = ref({
  number: '',
  startTime: '',
  weeks: 9,
  numTiers: 5,
})
const loading = ref(false)
const formState = computed<boolean>(() => {
  if (form.value.number === '')
    return false
  if (form.value.startTime === '')
    return false
  if (form.value.weeks === 0)
    return false
  if (form.value.numTiers === 0)
    return false
  return true
})
async function submit() {
  if (!formState.value)
    return
  loading.value = true
  try {
    const { data, error, refresh } = await useApiPost<LeagueSession>('/league/admin/session', {
      body: form.value,
      immediate: false,
    })
    await refresh()
    if (error.value || !data.value)
      throw error.value
    router.push({
      path: `/league/admin/session/${data.value.number}`,
    })
  }
  catch (e: any) {
    const message = (e.data || e.response?.data)?.message || e.message
    alert(message)
  }
  finally {
    loading.value = false
  }
  loading.value = false
}
</script>

<template>
  <div>
    <h1 class="text-xl font-bold my-3">
      Create League Session
    </h1>
    <FormWrapper class="clear-both" @submit="submit">
      <FormInput
        v-model="form.number"
        type="number"
        label="Session Number"
        :state="null"
      />
      <FormInput
        v-model="form.startTime"
        type="datetime-local"
        label="Start Time"
        :state="null"
      >
        <template v-if="form.startTime" #description>
          <p>End at {{ $dayjs(form.startTime).add(form.weeks * 7, 'day').format('YYYY-MM-DD HH:mm:ss') }}</p>
        </template>
      </FormInput>
      <FormInput
        v-model="form.weeks"
        type="number"
        label="Weeks"
        :state="null"
      />
      <FormInput
        v-model="form.numTiers"
        type="number"
        label="Number of Tiers"
        :state="null"
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
      </div>
    </FormWrapper>
  </div>
</template>
