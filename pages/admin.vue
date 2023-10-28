<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
const user = useUser()
if (!user.isAdmin)
  throw createError({ statusCode: 403 })
</script>

<template>
  <NuxtPage />
</template>
