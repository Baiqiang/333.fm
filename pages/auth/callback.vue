<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { code } = route.query
const accessToken = useAccessToken()
const user = useUser()
const runtimeConfig = useRuntimeConfig()
useSeoMeta({
  title: t('header.signIn'),
})
if (!code) {
  throw createError({
    statusCode: 400,
    message: t('error.400'),
  })
}

const { data } = await useApi<{ accessToken: string, user: User }>('/auth/callback', {
  params: {
    code,
    mode: runtimeConfig.public.mode,
  },
})
if (!data.value) {
  throw createError({
    statusCode: 400,
    message: t('error.400'),
  })
}
accessToken.value = data.value.accessToken
user.signIn(data.value.user)
const previousUrl = useLocalStorage('previousUrl', '')
router.push(previousUrl.value || '/')
onMounted(() => {
  const value = accessToken.value
  accessToken.value = ''
  accessToken.value = value
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen fixed inset-0 -z-10">
    <div class="flex">
      <Spinner class="w-6 h-6 mr-1 text-if border-[3px]" />
      {{ $t('common.signingIn') }}
    </div>
    <img src="https://www.worldcubeassociation.org/files/WCAlogo_notext.svg" class="w-20 mt-4">
  </div>
</template>
