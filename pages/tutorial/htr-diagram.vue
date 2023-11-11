<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('tutorial.htrDiagram.title'),
})
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold py-3">
      {{ $t('tutorial.htrDiagram.title') }}
    </h1>
    <I18nT keypath="tutorial.htrDiagram.description" tag="p">
      <template #author>
        <a href="https://space.bilibili.com/266974547" target="_blank" class="text-blue-500">{{ $t('tutorial.htrDiagram.author') }}</a>
      </template>
    </I18nT>
    <a :class="{ hidden: $i18n.locale === 'zh-CN' }" href="/images/htr-diagram/en.jpg" target="_blank">
      <img src="/images/htr-diagram/en.jpg" class="w-full">
    </a>
    <a :class="{ hidden: $i18n.locale === 'en' }" href="/images/htr-diagram/zh-CN.jpg" target="_blank">
      <img src="/images/htr-diagram/zh-CN.jpg" class="w-full">
    </a>
  </div>
</template>
