<script setup lang="ts">
defineProps<{
  competition: PastCompetition
}>()
</script>

<template>
  <div>
    <NuxtLink :to="`/weekly/${competition.alias}`" class="text-blue-500 flex items-center">
      <h3 class="font-bold text-lg my-2">
        {{ competition.name }}
      </h3>
      <Icon name="solar:double-alt-arrow-right-linear" size="16" />
    </NuxtLink>
    <div v-for="winner in competition.winners" :key="winner.id" class="mb-1">
      <UserAvatarName :user="winner.user" class="gap-1">
        {{ formatResult(winner.average, 2) }} ({{ winner.values.map(v => formatResult(v)).join(', ') }})
      </UserAvatarName>
    </div>
  </div>
</template>
