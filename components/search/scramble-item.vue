<script setup lang="ts">
defineProps<{
  scramble: Scramble & { competition: Competition }
}>()
</script>

<template>
  <NuxtLink
    :to="competitionPath(scramble.competition, scramble)"
    class="block p-3 bg-white shadow-sm hover:shadow-md transition-all duration-200"
  >
    <div class="font-mono text-sm break-all">
      {{ scramble.scramble }}
    </div>
    <div class="text-sm text-gray-500 mt-1">
      {{ scramble.competition.name }}
    </div>
  </NuxtLink>
</template>
