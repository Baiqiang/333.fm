<script setup lang="ts">
const { data } = await useApi<Endless[]>('/endless/on-going')
if (!data.value) {
  throw createError({
    statusCode: 500,
  })
}
const endlesses = ref<Endless[]>(data.value)
const { t } = useI18n()
useSeoMeta({
  title: t('endless.title'),
})
</script>

<template>
  <div>
    <h1 class="font-bold text-lg md:text-3xl my-2">
      {{ $t('endless.title') }}
    </h1>
    <p class="mb-2">
      {{ $t('endless.description') }}
    </p>
    <div class="flex flex-col gap-3">
      <div v-for="endless in endlesses" :key="endless.id">
        <div class="mb-2">
          {{ $t(`endless.type.${endless.subType}`) }}
        </div>
        <NuxtLink :to="competitionPath(endless)" class="bg-indigo-500 text-white px-3 py-2">
          {{ endless.name }} <Icon name="ic:round-keyboard-double-arrow-right" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
