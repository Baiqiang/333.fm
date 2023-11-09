<script setup lang=ts>
const { t } = useI18n()
const router = useRouter()
const user = useUser()
const { oauth } = useAppConfig()
useSeoMeta({
  title: t('header.signIn'),
})
if (user.signedIn)
  router.push('/')
onMounted(() => {
  if (!user.signedIn) {
    setTimeout(() => {
      const params = {
        client_id: oauth.wca.clientId,
        redirect_uri: `${window.location.origin}/auth/callback`,
        response_type: 'code',
        scope: 'public email',
      }
      window.location.href = `${oauth.wca.authorizationUrl}?${new URLSearchParams(params)}`
    }, 300)
  }
})
definePageMeta({
  middleware: [
    function (_, from) {
      if (from.path !== '/sign-in') {
        const previousUrl = useLocalStorage('previousUrl', '/')
        previousUrl.value = from.fullPath
      }
    },
  ],
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
