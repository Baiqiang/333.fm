<script setup lang="ts">
const user = useUser()
const { t } = useI18n()
useSeoMeta({
  title: t('league.title'),
})
</script>

<template>
  <NuxtPage v-if="user.isLeagueAdmin" />
  <div v-else>
    You are not authorized to access this page.
  </div>
</template>
