<script setup lang="ts">
defineProps<{
  result: Result
}>()
</script>

<template>
  <div class="col-start-1">
    No.{{ result.rank }}
  </div>
  <WeeklyUser :user="result.user" class="col-start-2" />
  <div class="col-start-3">
    {{ formatResult(result.average) }}
  </div>
  <div class="col-start-4">
    {{ result.values.map(formatResult).join(', ') }}
  </div>
</template>
