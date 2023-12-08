<script setup lang="ts">
const accessToken = useAccessToken()
const user = useUser()
const { t } = useI18n()
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
onMounted(() => {
  setInterval(checkAuth, 1000 * 60 * 5)
})
</script>

<template>
  <NuxtLayout>
    <Link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <Meta name="theme-color" content="#6366f1" />
    <NuxtPwaManifest />
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
body {
  @apply font-inter bg-gray-50;
}
h1, h2, h3, h4, h5, h6 {
  @apply font-poppins;
}
</style>
