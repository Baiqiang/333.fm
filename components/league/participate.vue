<script setup lang="ts">
const props = defineProps<{
  session: LeagueSession
}>()
const user = useUser()
const { data: participated } = await useApi<boolean>(`/league/session/${props.session.number}/participated`)
async function participate() {
  const { data, error } = await useApiPost<boolean>(`/league/session/${props.session.number}/participate`)
  if (error.value)
    throw error.value
  if (data.value)
    participated.value = true
}
async function unparticipate() {
  const { data, error } = await useApiPost<boolean>(`/league/session/${props.session.number}/unparticipate`)
  if (error.value)
    throw error.value
  if (data.value)
    participated.value = false
}
</script>

<template>
  <div class="flex flex-col items-center justify-center bg-white shadow-md p-6 my-6">
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
    <p class="text-gray-700 text-center text-base leading-relaxed w-full md:px-12">
      {{ $t('league.participate.description') }}
    </p>
  </div>
</template>
