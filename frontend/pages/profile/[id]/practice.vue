<script setup lang="ts">
const currentUser = useUser()
const user = inject(SYMBOL_USER)!
const { data } = await useApi<Result[]>(`/profile/${user.value.id}/practice`)
const results = ref<Result[]>(data.value || [])
</script>

<template>
  <Spoiler class="mt-4" :spoiled="$t('weekly.results')" :show="currentUser?.id === user.id">
    <UserPracticeResults :results="results" />
  </Spoiler>
</template>
