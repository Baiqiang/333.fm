<script setup lang="ts">
const { data } = await useApi<Competition>('/chain')
if (!data.value) {
  throw createError({
    statusCode: 500,
  })
}
const chain = ref<Competition>(data.value)
const top10 = ref<Submission[]>([])
async function fetchTop10(number: number) {
  const { data, refresh } = await useApi<Submission[]>(`/chain/${number}/top10`, {
    immediate: false,
  })
  await refresh()
  if (data.value)
    top10.value = data.value
}
await fetchTop10(chain.value.scrambles[0].number)
const { t } = useI18n()
useSeoMeta({
  title: t('chain.title'),
})
</script>

<template>
  <div>
    <h1 class="font-bold text-lg md:text-3xl my-2">
      {{ $t('chain.title') }}
    </h1>
    <p class="mb-2">
      {{ $t('chain.description') }}
    </p>
    <div class="flex flex-col gap-3">
      <div v-for="{ id, number, scramble } in chain.scrambles" :key="id" class="mt-2">
        <Sequence :sequence="scramble" :prefix="`No.${number} `" />
        <CubeExpanded :moves="scramble" />
        <NuxtLink :to="`/chain/${number}`" class="bg-indigo-500 text-white px-3 py-2">
          Go <Icon name="ic:round-keyboard-double-arrow-right" />
        </NuxtLink>
      </div>
      <ChainTop :submissions="top10" :scramble="chain.scrambles[0]" />
    </div>
  </div>
</template>
