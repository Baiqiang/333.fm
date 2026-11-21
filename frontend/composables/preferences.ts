export function usePreference<K extends keyof UserPreferences>(key: K, defaultValue: NonNullable<UserPreferences[K]>) {
  const user = useUser()
  const guestPreferences = useCookie<UserPreferences>('preferences', {
    default: () => ({}),
    maxAge: 365 * 24 * 60 * 60,
  })
  return computed({
    get: () => (user.signedIn ? user.preferences[key] : guestPreferences.value[key]) ?? defaultValue,
    set: (value: NonNullable<UserPreferences[K]>) => {
      if (user.signedIn) {
        user.preferences = { ...user.preferences, [key]: value }
        useClientApi('/user/preferences', { method: 'PATCH', body: { [key]: value } })
      }
      else {
        guestPreferences.value = { ...guestPreferences.value, [key]: value }
      }
    },
  })
}
