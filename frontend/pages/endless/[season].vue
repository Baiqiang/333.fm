<script setup lang="ts">
const { params } = useRoute()
const { data, error, refresh: refreshEndless } = await useApi<Endless>(`/endless/${params.season}`)
if (!data.value || error.value) {
  throw createError({
    statusCode: 404,
  })
}
const endless = ref<Endless>(data.value)
const myProgress = ref<UserProgress>()
const { data: progressData, refresh: refreshProgress } = await useApi<UserProgress>(`/endless/${endless.value.alias}/progress`, {
  immediate: false,
})
async function updateMyProgress() {
  await refreshProgress()
  if (progressData.value)
    myProgress.value = progressData.value
}
async function updateEndless() {
  await refreshEndless()
  if (!error.value && data.value)
    endless.value = data.value
}
await updateMyProgress()
provide<Ref<Endless>>(SYMBOL_ENDLESS, endless)
provide<Ref<UserProgress | undefined>>(SYMBOL_ENDLESS_PROGRESS, myProgress)
provide<() => void>(SYMBOL_ENDLESS_UPDATE_PROGRESS, updateMyProgress)
provide<() => void>(SYMBOL_ENDLESS_UPDATE, updateEndless)
</script>

<template>
  <div>
    <Heading1>
      {{ endless.name }} - {{ $t('endless.title') }}
    </Heading1>
    <NuxtPage />
  </div>
</template>
