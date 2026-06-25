<script setup lang="ts">
defineProps<{
  results: Result[]
  type: string | number
}>()
</script>

<template>
  <div>
    <h4 class="font-bold mb-2">
      {{ $t(`endless.stats.${type}`) }}
    </h4>
    <div class="grid grid-cols-[1.5rem_max-content_1fr] gap-2">
      <template v-for="r, k in results" :key="k">
        <div class="font-mono text-right">
          {{ r.rank }}
        </div>
        <UserAvatarName :user="r.user" />
        <div class="font-mono">
          {{ formatResult(r.average, 2) }}
        </div>
      </template>
    </div>
  </div>
</template>
