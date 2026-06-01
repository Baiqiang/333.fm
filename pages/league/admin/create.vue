<script setup lang="ts">
const { t } = useI18n()
const dayjs = useDayjs()
const router = useRouter()
const form = ref({
  number: '',
  startTime: '',
  weeks: 9,
  numTiers: 5,
})
// The datetime-local value is interpreted in the admin's local timezone.
const start = computed(() =>
  form.value.startTime ? dayjs(form.value.startTime) : null,
)
const end = computed(() =>
  start.value ? start.value.add(form.value.weeks * 7, 'day') : null,
)
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
    const { data, error, refresh } = await useApiPost<LeagueSeason>('/league/admin/season', {
      body: {
        ...form.value,
        startTime: new Date(form.value.startTime).toISOString(),
      },
      immediate: false,
    })
    await refresh()
    if (error.value || !data.value)
      throw error.value
    router.push({
      path: `/league/admin/season/${data.value.number}`,
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
    <Heading1>
      Create League Season
    </Heading1>
    <FormWrapper class="clear-both" @submit="submit">
      <FormInput
        v-model="form.number"
        type="number"
        label="Season Number"
        :state="null"
      />
      <FormInput
        v-model="form.startTime"
        type="datetime-local"
        label="Start Time"
        :state="null"
      >
        <template #description>
          <p class="text-gray-500">
            The time in your local timezone. The UTC equivalent is shown below for reference.
          </p>
          <div v-if="start" class="mt-2 text-sm bg-gray-50 dark:bg-gray-800 border-l-2 md:border-l-4 border-blue-500 p-2">
            <table class="border-separate border-spacing-x-3">
              <tbody>
                <tr>
                  <td class="text-gray-400" />
                  <td class="text-gray-400 text-xs">Local</td>
                  <td class="text-gray-400 text-xs">UTC</td>
                </tr>
                <tr>
                  <td class="text-gray-400">Start</td>
                  <td>{{ start.format('YYYY-MM-DD HH:mm') }}</td>
                  <td>{{ start.utc().format('YYYY-MM-DD HH:mm') }}</td>
                </tr>
                <tr>
                  <td class="text-gray-400">End</td>
                  <td>{{ end!.format('YYYY-MM-DD HH:mm') }}</td>
                  <td>{{ end!.utc().format('YYYY-MM-DD HH:mm') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
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
          class="px-2 py-1 text-white bg-blue-500 focus:outline-hidden"
          :class="{ 'opacity-50 cursor-not-allowed': !formState }"
          :disabled="!formState"
          @click.prevent="submit"
        >
          {{ $t('form.submit') }}
        </button>
      </div>
    </FormWrapper>
  </div>
</template>
