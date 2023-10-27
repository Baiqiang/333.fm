export const useAccessToken = defineStore('accessToken', {
  state: () => ({
    value: '',
  }),
  persist: {
    storage: persistedState.cookies,
  },
})

export const useUser = defineStore('user', {
  state: () => ({
    wcaId: '',
    name: '',
    email: '',
    avatar: '',
    avatarThumb: '',
    roles: [] as Role[],
  }),
  getters: {
    localName(): string {
      const matches = this.name.match(/\((.+)\)/)
      return matches ? matches[1] : this.name
    },
    englishName(): string {
      return this.name.split(' (')[0]
    },
    isAdmin(): boolean {
      return this.roles.some(role => role.name === 'admin')
    },
    signedIn(): boolean {
      return useAccessToken().value !== ''
    },
  },
  actions: {
    signIn(user: User) {
      this.wcaId = user.wcaId
      this.name = user.name
      this.email = user.email
      this.avatar = user.avatar
      this.avatarThumb = user.avatarThumb
      this.roles = user.roles
    },
    signOut() {
      useAccessToken().value = ''
    },
  },
})
