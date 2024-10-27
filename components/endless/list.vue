<script setup lang="ts">
const { data } = await useApi<Endless[]>('/endless/on-going')
const { data: data2 } = await useApi<Endless[]>('/endless/ended')
const endlesses = ref<Endless[]>(data.value || [])
const endedEndlesses = ref<Endless[]>(data2.value || [])
</script>

<template>
  <div>
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
      <div class="border-t my-2 pt-2">
        {{ $t('endless.ended') }}
      </div>
      <div v-for="endless in endedEndlesses" :key="endless.id">
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
