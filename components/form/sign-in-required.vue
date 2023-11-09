<script setup lang="ts">
const user = useUser()
</script>

<template>
  <div v-if="!user.signedIn" class="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
    <NuxtLink to="/sign-in" class="bg-indigo-500 text-white shadow-lg p-4">
      {{ $t('common.signingInRequired') }}
    </NuxtLink>
  </div>
</template>
