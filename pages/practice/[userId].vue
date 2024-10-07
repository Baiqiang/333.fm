<script setup lang="ts">
const route = useRoute()
const { t, locale } = useI18n()
const { data, error } = await useApi<User>(`/profile/${route.params.userId}`)
if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
  })
}
const user = ref<User>(data.value)
provide(SYMBOL_USER, user)
useSeoMeta({
  title: computed(() => t('practice.user.title', {
    name: localeName(user.value.name, locale.value),
  })),
})
</script>

<template>
  <div>
    <h1 class="font-bold text-lg md:text-3xl my-2">
      {{ $t('practice.user.title', {
        name: localeName(user.name, $i18n.locale),
      }) }}
    </h1>
    <NuxtPage />
  </div>
</template>
