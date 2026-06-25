<script setup lang="ts">
const accessToken = useAccessToken()
const user = useUser()
const { t } = useI18n()
const colorMode = useColorMode()
const themeColor = computed(() => colorMode.value === 'dark' ? '#030712' : '#6366f1')
useSeoMeta({
  titleTemplate: `%s - ${t('title')}`,
})
async function checkAuth() {
  if (!accessToken.value)
    return

  const { data, error } = await useApi<User>('/auth/me')
  if (error.value || !data.value) {
    // user.signOut()
    // report error
    await useApiPost('/report', {
      body: {
        error: error.value,
        data: data.value,
      },
    })
  }
  else if (data.value !== null) {
    user.signIn(data.value)
  }
}
accessToken.$subscribe(async (_, token) => {
  if (!token.value)
    return

  checkAuth()
}, {
  immediate: true,
  deep: true,
})
useIntervalFn(checkAuth, 1000 * 60 * 5)
</script>

<template>
  <NuxtLoadingIndicator />
  <NuxtLayout>
    <Link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <Meta name="theme-color" :content="themeColor" />
    <NuxtPwaManifest />
    <NuxtPage />
  </NuxtLayout>
</template>
