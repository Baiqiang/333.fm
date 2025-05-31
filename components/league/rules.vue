<template>
  <div>
    <h2 class="font-bold my-2">
      {{ $t('weekly.rules.basic.title') }}
    </h2>
    <ol class="text-sm mb-2 list-decimal list-inside marker:text-blue-500">
      <I18nT tag="li" keypath="weekly.rules.basic.rules.0" scope="global">
        <template #notation>
          <Notation />
        </template>
      </I18nT>
      <li v-for="i in 4" :key="i">
        {{ $t(`league.rules.basic.${i}`) }}
      </li>
    </ol>
  </div>
</template>
