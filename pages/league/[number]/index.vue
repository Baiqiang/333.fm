<script setup lang="ts">
const session = inject(SYMBOL_LEAGUE_SESSION)!
useSeoMeta({
  title: session.value.title,
})
</script>

<template>
  <div class="px-2">
    <LeagueSummary :session="session" />
  </div>
</template>
