<script setup lang="ts">
const user = inject(SYMBOL_USER)!
const { data } = await useApi<Result[]>(`/profile/${user.value.id}/weekly`)
const results = ref<Result[]>(data.value || [])
</script>

<template>
  <div class="mt-4">
    <UserResults :results="results" />
  </div>
</template>
