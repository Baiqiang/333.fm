<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: t('tutorial.htrDiagram.title'),
})
</script>

<template>
  <div>
    <Heading1>
      {{ $t('tutorial.htrDiagram.title') }}
    </Heading1>
    <I18nT keypath="tutorial.htrDiagram.description" tag="p">
      <template #author>
        <a href="https://space.bilibili.com/266974547" target="_blank" class="text-blue-500">{{ $t('tutorial.htrDiagram.author.peng') }}</a>
      </template>
      <template #picture>
        {{ $t('tutorial.htrDiagram.picture.routine') }}
      </template>
    </I18nT>
    <a :class="{ hidden: $i18n.locale === 'zh-CN' }" href="/images/htr-diagram/en.jpg" target="_blank">
      <img src="/images/htr-diagram/en.jpg" class="w-full">
    </a>
    <a :class="{ hidden: $i18n.locale === 'en' }" href="/images/htr-diagram/zh-CN.jpg" target="_blank">
      <img src="/images/htr-diagram/zh-CN.jpg" class="w-full">
    </a>
    <I18nT keypath="tutorial.htrDiagram.description" tag="p" class="mt-4">
      <template #author>
        <a href="https://space.bilibili.com/8095785" target="_blank" class="text-blue-500">{{ $t('tutorial.htrDiagram.author.jian') }}</a>
      </template>
      <template #picture>
        {{ $t('tutorial.htrDiagram.picture.maze') }}
      </template>
    </I18nT>
    <a href="/images/htr-diagram/maze.jpg" target="_blank">
      <img src="/images/htr-diagram/maze.jpg" class="w-full">
    </a>
  </div>
</template>
