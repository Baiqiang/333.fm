<script setup lang="ts">
const user = useUser()
const session = inject(SYMBOL_LEAGUE_SESSION)!
useSeoMeta({
  title: session.value.title,
})
</script>

<template>
  <div>
    <LeagueSummary :session="session" />
  </div>
</template>
