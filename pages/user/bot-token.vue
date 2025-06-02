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
    <Heading1>
      {{ $t('user.token') }}
    </Heading1>
    <p>
      {{ $t('bot.token.description') }}
    </p>
    <Sequence :sequence="token!" :source="token!" class="mt-4" />
  </div>
</template>
