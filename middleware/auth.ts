export default defineNuxtRouteMiddleware(() => {
  const user = useUser()
  if (!user.signedIn)
    return navigateTo('/sign-in', { replace: true })
})
