<script setup lang="ts">
const { t } = useI18n()
const season = inject(SYMBOL_LEAGUE_SEASON)!
useSeoMeta({
  title: `${t('league.nav.rules')} - ${season.value.title}`,
})
</script>

<template>
  <div class="px-2">
    <Heading1>
      {{ $t('league.nav.rules') }}
    </Heading1>

    <ol class="space-y-2 mb-4 list-decimal list-inside marker:text-blue-500">
      <li class="text-gray-700 leading-relaxed">
        {{ $t('league.rules.format') }}
      </li>
      <li class="text-gray-700 leading-relaxed">
        {{ $t('league.rules.sets') }}
      </li>
      <li class="text-gray-700 leading-relaxed">
        {{ $t('league.rules.winner') }}
      </li>
      <li class="text-gray-700 leading-relaxed">
        {{ $t('league.rules.ranking') }}
      </li>
    </ol>

    <h3 class="text-xl font-semibold text-gray-800 mb-4">
      {{ $t('league.rules.criteria') }}
    </h3>

    <ol class="space-y-2 list-decimal list-inside marker:text-blue-400">
      <li
        v-for="i in 5"
        :key="i"
        class="text-gray-700 leading-relaxed"
      >
        {{ $t(`league.rules.tierBreakers.${i - 1}`) }}
      </li>
    </ol>
  </div>
</template>
