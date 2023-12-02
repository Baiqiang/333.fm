<script setup lang="ts">
const { data } = await useApi<Endless>('/endless/latest')
if (!data.value) {
  throw createError({
    statusCode: 500,
  })
}
const endless = ref<Endless>(data.value)
const { t } = useI18n()
const me = useUser()
useSeoMeta({
  title: t('endless.title'),
})
const maxCompetitors = computed(() => Math.max(...endless.value.levels.map(l => l.competitors)) || 1)
const myProgress = ref<UserProgress | null>()
if (me.signedIn) {
  const { data } = await useApi<UserProgress>(`/endless/${endless.value.alias}/progress`)
  myProgress.value = data.value
}
const myLevel = computed(() => myProgress.value?.next?.level ?? 1)
</script>

<template>
  <div>
    <h1 class="font-bold text-lg md:text-3xl my-2">
      {{ $t('endless.title') }}
      <span class="testsm md:text-base">({{ endless.name }})</span>
    </h1>
    <p class="mb-2">
      {{ $t('endless.description') }}
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
        <template v-if="(typeof m) === 'string'">
          {{ m }}
        </template>
        <template v-else>
          {{ $rt((m as any).rule) }}
          <ol class="list-disc list-inside marker:text-indigo-500 pl-4 text-gray-800">
            <li v-for="n in (m as any).rules" :key="n">
              {{ n }}
            </li>
          </ol>
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
    <div class="grid grid-cols-[max-content_1fr_max-content] md:grid-cols-[max-content_max-content_max-content_1fr] gap-x-2 gap-y-1 md:gap-y-2 mb-2">
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
      <template v-for="{ level, competitors, bestSubmissions, kickedOffs } in endless.levels" :key="level">
        <div v-if="myLevel < level">
          {{ $t('endless.level', { level }) }}
        </div>
        <NuxtLink v-else :to="`/endless/${endless.alias}/${level}`" class="text-indigo-500">
          {{ $t('endless.level', { level }) }}
        </NuxtLink>
        <div class="flex items-center">
          <UserAvatarName v-if="kickedOffs.length === 1" :user="kickedOffs[0].user">
            ({{ formatResult(kickedOffs[0].submission.moves) }})
          </UserAvatarName>
          <template v-if="kickedOffs.length > 1">
            <div v-for="{ user, submission } in kickedOffs" :key="user.id" class="flex">
              <UserAvatar :user="user" /> ({{ formatResult(submission.moves) }})
            </div>
          </template>
        </div>
        <div class="text-indigo-500 font-semibold flex items-center">
          <template v-if="bestSubmissions.length > 0">
            <div class="mr-1">
              {{ formatResult(bestSubmissions[0].moves) }}
            </div>
            <UserAvatar v-for="b in bestSubmissions" :key="b.id" :user="b.user" />
          </template>
        </div>
        <div class="col-span-3 md:col-span-1">
          <div class="whitespace-nowrap border px-1 relative">
            <div class="bg-indigo-500 absolute -z-10 inset-0" :style="{ width: `${competitors / maxCompetitors * 100}%` }" />
            {{ $t('endless.progress.competitors', { competitors }) }}
          </div>
        </div>
      </template>
    </div>
    <EndlessStats :endless="endless" />
  </div>
</template>
