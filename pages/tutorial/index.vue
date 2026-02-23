<script setup lang="ts">
interface Tutorial {
  id: number
  title: string
  url: string
  category: string
  language: 'en' | 'zh-CN' | 'bilingual'
}

const { t, locale } = useI18n()
const user = useUser()
useSeoMeta({
  title: t('tutorial.title'),
})

const { data: tutorials } = await useApi<Tutorial[]>('/tutorial')

const categories = computed(() => {
  if (!tutorials.value)
    return []
  const set = new Set<string>()
  for (const t of tutorials.value)
    set.add(t.category)
  return Array.from(set)
})

function tutorialsByCategory(category: string) {
  if (!tutorials.value)
    return []
  return tutorials.value.filter(t => t.category === category)
}

function isInternal(url: string) {
  try {
    const u = new URL(url, window.location.origin)
    return u.origin === window.location.origin
  }
  catch {
    return url.startsWith('/')
  }
}

function languageTag(lang: string) {
  if (lang === 'bilingual' || lang === locale.value)
    return null
  if (lang === 'zh-CN')
    return '中文'
  return 'EN'
}
</script>

<template>
  <div>
    <Heading1>
      {{ $t('tutorial.title') }}
    </Heading1>
    <NuxtLink v-if="user.isTutorialAdmin" to="/tutorial/admin" class="text-sm my-2 text-blue-500 block">
      {{ $t('admin.tutorial.title') }}
    </NuxtLink>
    <p class="text-gray-500 mb-4">
      {{ $t('tutorial.resources.description') }}
    </p>

    <div v-if="tutorials && tutorials.length > 0" class="space-y-6">
      <div v-for="category in categories" :key="category">
        <h2 class="font-bold text-lg border-b-2 border-indigo-500 pb-1 mb-3">
          {{ category }}
        </h2>
        <div class="space-y-2">
          <div
            v-for="item in tutorialsByCategory(category)"
            :key="item.id"
            class="flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors duration-200 border-l-2 border-transparent hover:border-blue-500"
          >
            <span
              v-if="languageTag(item.language)"
              class="text-xs px-1.5 py-0.5 font-medium shrink-0"
              :class="item.language === 'zh-CN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
            >
              {{ languageTag(item.language) }}
            </span>
            <NuxtLink
              v-if="isInternal(item.url)"
              :to="item.url"
              class="text-blue-500 hover:text-blue-700 hover:underline truncate"
            >
              {{ item.title }}
            </NuxtLink>
            <a
              v-else
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-500 hover:text-blue-700 hover:underline truncate"
            >
              {{ item.title }}
            </a>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-gray-400 text-center py-12">
      {{ $t('tutorial.resources.empty') }}
    </div>
  </div>
</template>
