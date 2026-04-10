<script setup lang="ts">
defineProps<{
  leaderboard: LeaderboardEntry[]
  formatTime: (ms: number) => string
  quizDay: string
  activeUserId?: number
}>()
</script>

<template>
  <div>
    <h2 class="text-xl font-bold font-poppins mb-4">
      {{ $t('quiz.leaderboard.title') }}
    </h2>
    <div class="bg-white shadow-md grid grid-cols-[2rem_1fr_auto_4rem] gap-x-3 text-sm">
      <NuxtLink
        v-for="entry in leaderboard"
        :key="entry.rank"
        :to="`/quiz/${quizDay}/${userId(entry.user)}`"
        class="col-span-4 grid grid-cols-subgrid items-center px-4 py-2 border-b border-gray-100 last:border-b-0 transition-colors duration-150 cursor-pointer"
        :class="activeUserId === entry.user.id
          ? 'bg-indigo-50 border-l-2 border-l-indigo-500 pl-3.5'
          : 'hover:bg-gray-50'"
      >
        <span class="text-gray-400 text-right">{{ entry.rank }}</span>
        <UserAvatarName :user="entry.user" :link="false" />
        <span class="font-mono font-bold text-indigo-600 text-right">{{ entry.correctCount }}/{{ entry.totalQuestions }}</span>
        <span class="text-xs text-green-600 text-right">
          {{ entry.remainingTime > 0 ? formatTime(entry.remainingTime) : '' }}
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
