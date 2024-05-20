<script setup lang="ts">
const endless = inject<Ref<Endless>>(SYMBOL_ENDLESS)!
const myProgress = inject<Ref<UserProgress>>(SYMBOL_ENDLESS_PROGRESS)!
const { t } = useI18n()
useSeoMeta({
  title: `${t('endless.title')} ${endless.value.name}`,
})
const maxCompetitors = computed(() => Math.max(...endless.value.levels.map(l => l.competitors)) || 1)

const myLevel = computed(() => myProgress.value?.next?.level ?? 1)
const highestLevel = computed(() => Math.max(...endless.value.levels.map(l => l.level)))
const expanded = ref(false)
const levels = computed(() => {
  if (expanded.value)
    return endless.value.levels
  return endless.value.levels.filter(l =>
    l.level <= Math.min(10, myLevel.value)
    || l.level === highestLevel.value
    || l.level === myLevel.value,
  )
})
</script>

<template>
  <div>
    <p class="mb-2">
      {{ $t('endless.description') }}<br>
      {{ $t(`endless.type.${endless.subType}`) }}
    </p>
    <WeeklyStatus :competition="endless" />
    <h2 class="font-bold my-2">
      {{ $t('common.basicRules') }}
    </h2>
    <ol class="text-sm mb-2 list-decimal list-inside marker:text-blue-500">
      <I18nT tag="li" keypath="weekly.rules.basic.rules.0" scope="global">
        <template #notation>
          <Notation />
        </template>
      </I18nT>
      <li v-for="m, i in $tm('endless.rules')" :key="i">
        {{ m }}
        <template v-if="Number(i) === 2">
          <EndlessChallenges :challenges="endless.challenges" />
        </template>
      </li>
    </ol>
    <div class="mt-4">
      <template v-if="myProgress">
        <NuxtLink v-if="myProgress.next && myProgress.next.scramble" :to="`/endless/${endless.alias}/${myProgress.next.scramble.number}`" class="bg-indigo-500 text-white px-3 py-2 text-lg">
          {{ $t('endless.continue') }}
        </NuxtLink>
        <NuxtLink v-else-if="myProgress.current" :to="`/endless/${endless.alias}/${myProgress.current.scramble.number}`" class="bg-indigo-500 text-white px-3 py-2 text-lg">
          {{ $t('endless.continue') }}
        </NuxtLink>
        <NuxtLink v-else :to="`/endless/${endless.alias}/1`" class="bg-indigo-500 text-white px-3 py-2 text-lg">
          {{ $t('weekly.join') }}
        </NuxtLink>
      </template>
      <NuxtLink v-else to="/sign-in" class="bg-indigo-500 text-white px-3 py-2 text-lg">
        {{ $t('common.signingToJoin') }}
      </NuxtLink>
    </div>
    <h2 class="font-bold my-2 md:text-lg">
      {{ $t('endless.progress.title') }}
    </h2>
    <div class="grid grid-cols-auto md:grid-cols-[max-content_max-content_max-content_1fr] gap-x-2 gap-y-1 md:gap-y-2 mb-2">
      <div class="font-bold">
        Level
      </div>
      <div class="font-bold">
        {{ $t('endless.kickedBy') }}
      </div>
      <div class="font-bold">
        {{ $t('result.best') }}
      </div>
      <div class="col-span-3 md:col-span-1" />
      <template v-for="{ level, competitors, bestSubmissions, kickedOffs } in levels" :key="level">
        <div v-if="myLevel < level" class="flex items-center">
          {{ $t('endless.level', { level }) }}
        </div>
        <NuxtLink v-else :to="`/endless/${endless.alias}/${level}`" class="text-indigo-500 flex items-center">
          {{ $t('endless.level', { level }) }}
        </NuxtLink>
        <div class="flex items-center flex-wrap">
          <Icon v-if="myLevel <= level" name="material-symbols:lock-outline-sharp" />
          <UserAvatarName v-else-if="kickedOffs.length === 1" :user="kickedOffs[0].user">
            ({{ formatResult(kickedOffs[0].submission.moves) }})
          </UserAvatarName>
          <template v-else-if="kickedOffs.length > 1">
            <div v-for="{ user, submission } in kickedOffs" :key="user.id" class="flex">
              <UserAvatar :user="user" /> ({{ formatResult(submission.moves) }})
            </div>
          </template>
        </div>
        <div class="text-indigo-500 font-semibold flex items-center">
          <Icon v-if="myLevel <= level" name="material-symbols:lock-outline-sharp" class="text-black" />
          <template v-else-if="bestSubmissions.length > 0">
            <div class="mr-1">
              {{ formatResult(bestSubmissions[0].moves) }}
            </div>
            <div class="flex flex-wrap">
              <UserAvatar v-for="b in bestSubmissions" :key="b.id" :user="b.user" />
            </div>
          </template>
        </div>
        <div class="col-span-3 md:col-span-1">
          <div class="whitespace-nowrap border px-1 relative">
            <div class="bg-indigo-500 absolute -z-10 inset-0" :style="{ width: `${competitors / maxCompetitors * 100}%` }" />
            {{ $t('endless.progress.competitors', { competitors }) }}
          </div>
        </div>
        <template v-if="!expanded && level === highestLevel">
          <div class="col-span-4">
            <button class="text-indigo-500 flex items-center gap-2" @click="expanded = true">
              <Icon name="mdi:arrow-expand-vertical" />
              {{ $t('endless.showAll') }}
            </button>
          </div>
        </template>
      </template>
    </div>
    <EndlessStats :endless="endless" />
  </div>
</template>
