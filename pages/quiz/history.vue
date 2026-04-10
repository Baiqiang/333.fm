<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: t('quiz.history.title'),
})

const page = ref(1)
const { data, refresh } = await useApi<HistoryResponse>(() => `/quiz/history?page=${page.value}`)

async function changePage(p: number) {
  page.value = p
  await refresh()
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-3xl">
    <div class="flex items-center gap-2 mb-4">
      <NuxtLink to="/quiz" class="text-indigo-500 hover:text-indigo-600 transition-colors">
        <Icon name="mdi:arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold font-poppins">
        {{ $t('quiz.history.title') }}
      </h1>
    </div>

    <div v-if="data && data.items.length > 0" class="space-y-2">
      <NuxtLink
        v-for="item in data.items"
        :key="item.id"
        :to="`/quiz/${item.day}`"
        class="block bg-white shadow-md p-4 hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-center justify-between">
          <span class="font-bold text-indigo-600">{{ item.day }}</span>
          <span class="text-sm text-gray-400">{{ item.questionCount }} Q</span>
        </div>
      </NuxtLink>

      <div v-if="data.total > data.limit" class="flex items-center justify-center gap-2 mt-4">
        <button
          v-if="page > 1"
          class="text-indigo-500 hover:underline text-sm"
          @click="changePage(page - 1)"
        >
          &larr;
        </button>
        <span class="text-sm text-gray-400">{{ page }} / {{ Math.ceil(data.total / data.limit) }}</span>
        <button
          v-if="page * data.limit < data.total"
          class="text-indigo-500 hover:underline text-sm"
          @click="changePage(page + 1)"
        >
          &rarr;
        </button>
      </div>
    </div>
    <div v-else class="text-gray-400 text-sm">
      {{ $t('quiz.noQuiz') }}
    </div>
  </div>
</template>
