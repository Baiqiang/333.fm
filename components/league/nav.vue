<script setup lang="ts">
const props = defineProps<{
  session: LeagueSession
}>()
const route = useRoute()
const links = computed(() => {
  const ret = [
    {
      label: 'Schedules',
      to: `/league/${props.session.number}/schedules`,
    },
    {
      label: 'Standings',
      to: `/league/${props.session.number}/standings`,
    },
  ]
  props.session.competitions.forEach((c) => {
    ret.push({
      label: `Week ${leagueWeek(c)}`,
      to: `/league/${props.session.number}/week/${leagueWeek(c)}`,
    })
  })
  return ret
})
</script>

<template>
  <div class="flex flex-wrap overflow-x-auto">
    <NuxtLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="py-1 px-2 text-sm"
      :class="{
        'text-blue-500 border-b border-gray-500': !route.path.includes(link.to),
        'border border-b-0 border-gray-500': route.path.includes(link.to),
      }"
    >
      {{ link.label }}
    </NuxtLink>
    <div class="flex-1 border-b border-gray-500" />
  </div>
</template>
