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
        <ButtonPrimary :to="competitionPath(endless)" icon="ic:round-keyboard-double-arrow-right">
          {{ endless.name }}
        </ButtonPrimary>
      </div>
      <div class="border-t my-2 pt-2">
        {{ $t('endless.ended') }}
      </div>
      <div v-for="endless in endedEndlesses" :key="endless.id">
        <div class="mb-2">
          {{ $t(`endless.type.${endless.subType}`) }}
        </div>
        <ButtonPrimary :to="competitionPath(endless)" icon="ic:round-keyboard-double-arrow-right">
          {{ endless.name }}
        </ButtonPrimary>
      </div>
    </div>
  </div>
</template>
