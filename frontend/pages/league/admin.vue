<script setup lang="ts">
const user = useUser()
const { t } = useI18n()
useSeoMeta({
  title: t('league.title'),
})
</script>

<template>
  <NuxtLink v-if="user.isLeagueAdmin" to="/league/admin" class="text-sm my-2 text-blue-500">
    Admin Panel
  </NuxtLink>
  <NuxtPage v-if="user.isLeagueAdmin" />
  <div v-else>
    You are not authorized to access this page.
  </div>
</template>
