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
user.signIn(data.value.user)
const previousUrl = useLocalStorage('previousUrl', '')
router.push(previousUrl.value || '/')
onMounted(() => {
  accessToken.value = data.value?.accessToken ?? ''
})
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen fixed inset-0 -z-10">
    <div class="flex">
      <Spinner class="w-6 h-6 mr-1 text-if border-[3px]" />
      {{ $t('common.signingIn') }}
    </div>
    <WcaLogo class="w-20 mt-4" />
  </div>
</template>
