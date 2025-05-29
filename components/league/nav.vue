<script setup lang="ts">
const props = defineProps<{
  session: LeagueSession
}>()
const user = useUser()
const route = useRoute()
const { t } = useI18n()
const isMobileMenuOpen = ref(false)

const links = computed(() => {
  const ret = [
    {
      label: t('league.nav.summary'),
      to: `/league/${props.session.number}`,
      icon: 'mdi:home',
    },
    {
      label: t('league.nav.tiers'),
      to: `/league/${props.session.number}/tiers`,
      icon: 'mdi:account-group',
    },
    {
      label: t('league.nav.schedules'),
      to: `/league/${props.session.number}/schedules`,
      icon: 'mdi:calendar',
    },
    {
      label: t('league.nav.standings'),
      to: `/league/${props.session.number}/standings`,
      icon: 'mdi:trophy',
    },
  ]
  props.session.competitions.forEach((c) => {
    ret.push({
      label: t('league.nav.week', { week: leagueWeek(c) }),
      to: `/league/${props.session.number}/week/${leagueWeek(c)}`,
      icon: c.status === CompetitionStatus.ON_GOING ? 'mdi:calendar-clock' : 'mdi:calendar-week',
    })
  })
  if (user.isLeagueAdmin) {
    ret.push({
      label: 'Admin',
      to: '/league/admin',
      icon: 'mdi:shield-account',
    })
  }
  return ret
})

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}
</script>

<template>
  <button
    class="md:hidden fixed bottom-4 left-4 z-20 p-2 bg-indigo-500 text-white shadow-lg"
    @click.prevent="toggleMobileMenu"
  >
    <Icon
      :name="isMobileMenuOpen ? 'mdi:close' : 'mdi:menu'"
      size="24"
    />
  </button>
  <div class="relative">
    <nav
      class="fixed md:sticky top-0 left-0 h-screen w-full bg-gray-50 md:border-r-2 transform transition-transform duration-300 ease-in-out z-10"
      :class="{
        '-translate-x-full md:translate-x-0': !isMobileMenuOpen,
        'translate-x-0': isMobileMenuOpen,
      }"
    >
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-2 px-2 my-1 py-2 text-sm transition-colors"
        :class="{
          'bg-indigo-100 text-indigo-600': route.path === link.to,
          'text-gray-600 hover:bg-gray-100': route.path !== link.to,
        }"
        @click="isMobileMenuOpen = false"
      >
        <Icon :name="link.icon" size="20" />
        <span>{{ link.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>
