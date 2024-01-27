<script setup lang="ts">
const { params } = useRoute()
const { data, error } = await useApi<Endless>(`/endless/${params.season}`)
if (!data.value || error.value) {
  throw createError({
    statusCode: 404,
  })
}
const endless = ref<Endless>(data.value)
const myProgress = ref<UserProgress>()
async function updateMyProgress() {
  const { data } = await useApi<UserProgress>(`/endless/${endless.value.alias}/progress`)
  myProgress.value = data.value!
}
async function updateEndless() {
  const { data, error } = await useApi<Endless>(`/endless/${endless.value.alias}`)
  if (!error.value)
    endless.value = data.value!
}
await updateMyProgress()
provide<Ref<Endless>>(SYMBOL_ENDLESS, endless)
provide<Ref<UserProgress | undefined>>(SYMBOL_ENDLESS_PROGRESS, myProgress)
provide<() => void>(SYMBOL_ENDLESS_UPDATE_PROGRESS, updateMyProgress)
provide<() => void>(SYMBOL_ENDLESS_UPDATE, updateEndless)
</script>

<template>
  <div>
    <h1 class="font-bold text-lg md:text-3xl my-2">
      {{ endless.name }} - {{ $t('endless.title') }}
    </h1>
    <NuxtPage />
  </div>
</template>
