<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
useSeoMeta({
  title: t('user.token'),
})
definePageMeta({
  middleware: 'auth',
})
const { data: token, error } = await useApi<string>('user/bot-token')
if (error.value)
  throw createError(error.value)
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold py-3">
      {{ $t('user.token') }}
    </h1>
    <p>
      {{ $t('bot.token.description') }}
    </p>
    <Sequence :sequence="token!" :source="token!" class="mt-4" />
  </div>
</template>
