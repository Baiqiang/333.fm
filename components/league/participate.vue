<script setup lang="ts">
const props = defineProps<{
  season: LeagueSeason
}>()
const user = useUser()
const { data: participated } = await useApi<boolean>(`/league/season/${props.season.number}/participated`)
async function participate() {
  const { data, error } = await useApiPost<boolean>(`/league/season/${props.season.number}/participate`)
  if (error.value)
    throw error.value
  if (data.value)
    participated.value = true
}
async function unparticipate() {
  const { data, error } = await useApiPost<boolean>(`/league/season/${props.season.number}/unparticipate`)
  if (error.value)
    throw error.value
  if (data.value)
    participated.value = false
}
</script>

<template>
  <div class="flex flex-col items-center justify-center bg-white shadow-md p-6 my-6">
    <h3 class="text-2xl font-extrabold my-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-md tracking-wide uppercase">
      {{ $t('league.participate.signUp', { number: season.number + 1 }) }}
    </h3>
    <Button
      v-if="!participated"
      class="px-6 py-2 text-lg font-semibold bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow hover:from-blue-500 hover:to-blue-700 transition"
      @click="participate"
    >
      {{ $t('league.participate.label') }}
    </Button>
    <Button
      v-else
      class="px-6 py-2 text-lg font-semibold bg-gradient-to-r from-red-400 to-red-600 text-white shadow hover:from-red-500 hover:to-red-700 transition"
      @click="unparticipate"
    >
      {{ $t('league.participate.unparticipate') }}
    </Button>
    <p class="text-gray-700 text-center text-base leading-relaxed w-full md:px-12 mt-2">
      {{ $t('league.participate.description') }}
    </p>
  </div>
</template>
