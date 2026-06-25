<script setup lang="ts">
const season = inject(SYMBOL_LEAGUE_SEASON)!
useSeoMeta({
  title: season.value.title,
})
</script>

<template>
  <div class="px-2">
    <LeagueSummary :season="season" />
  </div>
</template>
