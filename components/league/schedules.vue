<script setup lang="ts">
const props = defineProps<{
  tierSchedules: TierSchedule[]
}>()
const season = inject(SYMBOL_LEAGUE_SEASON)!
const user = useUser()
const currentTier = season.value.tiers.find(({ players }) => players.find(p => p.userId === user.id))
const activeIndex = ref(props.tierSchedules.findIndex(t => t.tier.id === currentTier?.id))
if (activeIndex.value === -1) {
  activeIndex.value = 0
}
</script>

<template>
  <Tabs v-model:active-index="activeIndex">
    <Tab
      v-for="{ tier, schedules } in tierSchedules"
      :key="tier.id"
      :hash="`tier-${tier.level}`"
      :name="tier.name"
    >
      <LeagueScheduleWrapper>
        <LeagueTierSchedules :tier="tier" :schedules="schedules" />
      </LeagueScheduleWrapper>
    </Tab>
  </Tabs>
</template>
