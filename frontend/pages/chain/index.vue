<script setup lang="ts">
const { data } = await useApi<Competition>('/chain')
if (!data.value) {
  throw createError({
    statusCode: 500,
  })
}
const chain = ref<Competition>(data.value)
const { t } = useI18n()
useSeoMeta({
  title: t('chain.title'),
})
</script>

<template>
  <div>
    <Heading1>
      {{ $t('chain.title') }}
    </Heading1>
    <p class="mb-2">
      {{ $t('chain.description') }}
    </p>
    <div class="flex flex-col gap-3">
      <div v-for="scramble in chain.scrambles" :key="scramble.id" class="mt-2">
        <Sequence :sequence="scramble.scramble" :prefix="`No.${scramble.number} `" />
        <CubeExpanded :moves="scramble.scramble" />
        <NuxtLink :to="`/chain/${scramble.number}`" class="bg-indigo-500 text-white px-3 py-2">
          Go <Icon name="ic:round-keyboard-double-arrow-right" />
        </NuxtLink>
        <ChainStats :scramble="scramble" />
      </div>
    </div>
  </div>
</template>
