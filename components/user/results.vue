<script setup lang="ts">
const props = defineProps<{
  results: Result[]
}>()
const includesUnlimited = ref(true)
const filteredResults = computed(() => {
  if (includesUnlimited.value)
    return props.results
  return props.results.filter(result => result.mode === CompetitionMode.REGULAR)
})
const sortedResults = computed(() => filteredResults.value.slice().sort((a, b) => {
  let tmp = b.competition.id - a.competition.id
  if (tmp === 0)
    tmp = a.mode - b.mode
  return tmp
}))
</script>

<template>
  <div>
    <div class="mb-4">
      <label
        class="py-2 px-4 text-white cursor-pointer transition-colors duration-500 inline-flex items-center gap-1"
        :class="{
          'bg-indigo-500': includesUnlimited, 'bg-gray-500': !includesUnlimited }"
      >
        <input v-model="includesUnlimited" type="checkbox" class="appearance-none hidden">
        <Icon v-if="includesUnlimited" name="mdi:checkbox-marked" class="w-6 h-6" />
        <Icon v-else name="mdi:checkbox-blank-outline" class="w-6 h-6" />
        {{ $t('weekly.unlimited.label') }}
      </label>
    </div>
    <div class="grid grid-cols-[max-content_4rem_2rem_2rem_2rem_2rem_1fr] gap-2">
      <div class="grid grid-cols-subgrid col-span-full font-bold pb-2 border-b border-gray-300">
        <div class="pl-4">
          {{ $t('result.week') }}
        </div>
        <div class="text-right">
          {{ $t('result.rank') }}
        </div>
        <div class="text-right">
          {{ $t('result.mean') }}
        </div>
        <div class="text-right">
          {{ $t('result.single') }}
        </div>
        <div class="col-span-3">
          {{ $t('result.solves') }}
        </div>
      </div>
      <UserResult v-for="result in sortedResults" :key="result.id" :result="result">
        <template #competition>
          <NuxtLink
            :to="competitionPath(result.competition)"
            :class="{
              'text-blue-500': result.mode === CompetitionMode.REGULAR,
              'text-orange-500': result.mode === CompetitionMode.UNLIMITED,
            }"
          >
            {{ result.competition.alias }}
          </NuxtLink>
        </template>
      </UserResult>
    </div>
  </div>
</template>
