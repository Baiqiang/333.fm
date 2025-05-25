<script setup lang="ts">
const user = useUser()
</script>

<template>
  <div>
    <NuxtLink v-if="user.isLeagueAdmin" to="/league/admin" class="text-sm my-2 text-blue-500">
      Admin Panel
    </NuxtLink>
    <NuxtPage />
  </div>
</template>
