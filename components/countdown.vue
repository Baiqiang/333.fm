<script setup lang="ts">
const props = withDefaults(defineProps<{
  to: number | string | Date | null | undefined
  // Optional start time. When provided, a progress bar of elapsed time is shown.
  from?: number | string | Date | null
  // 'auto' hides the days unit when there are less than 1 day remaining.
  showDays?: boolean | 'auto'
  size?: 'sm' | 'md'
}>(), {
  showDays: 'auto',
  size: 'md',
})
const emit = defineEmits<{
  ended: []
}>()

const countdown = useCountdownTo(() => props.to)
const pad = (n: number) => String(n).padStart(2, '0')

const withDays = computed(() =>
  props.showDays === true || (props.showDays === 'auto' && countdown.value.days > 0),
)

const units = computed(() => {
  const { days, hours, minutes, seconds } = countdown.value
  const list = [
    { key: 'hours', value: pad(hours) },
    { key: 'minutes', value: pad(minutes) },
    { key: 'seconds', value: pad(seconds) },
  ]
  if (withDays.value)
    list.unshift({ key: 'days', value: pad(days) })
  return list
})

const progress = computed<number | null>(() => {
  if (props.from === null || props.from === undefined || props.to === null || props.to === undefined)
    return null
  const start = new Date(props.from).getTime()
  const end = new Date(props.to).getTime()
  const total = end - start
  if (total <= 0)
    return 100
  return Math.min(100, Math.max(0, (1 - countdown.value.total / total) * 100))
})

watch(() => countdown.value.ended, (ended) => {
  if (ended)
    emit('ended')
})
</script>

<template>
  <div class="inline-flex flex-col gap-1.5">
    <template v-if="!countdown.ended">
      <div
        class="flex items-start"
        :class="size === 'sm' ? 'gap-1' : 'gap-1.5'"
      >
        <template v-for="(unit, index) in units" :key="unit.key">
          <div
            v-if="index > 0"
            class="flex items-center justify-center"
            :class="size === 'sm' ? 'h-8' : 'h-14'"
          >
            <span
              class="font-poppins font-semibold text-indigo-300 dark:text-indigo-500 leading-none"
              :class="size === 'sm' ? 'text-base' : 'text-2xl'"
            >:</span>
          </div>
          <div class="flex flex-col items-center">
            <div
              class="relative overflow-hidden font-poppins font-bold tabular-nums text-white bg-gradient-to-b from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 shadow-md flex items-center justify-center"
              :class="size === 'sm'
                ? 'text-base w-7 h-8'
                : 'text-3xl w-12 h-14'"
            >
              <Transition name="flip">
                <span :key="unit.value" class="absolute inset-0 flex items-center justify-center">
                  {{ unit.value }}
                </span>
              </Transition>
            </div>
            <span
              class="mt-1 uppercase tracking-wide text-gray-400 dark:text-gray-500"
              :class="size === 'sm' ? 'text-[9px]' : 'text-[10px]'"
            >
              {{ $t(`countdown.${unit.key}`) }}
            </span>
          </div>
        </template>
      </div>
      <div
        v-if="progress !== null"
        class="h-1 w-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
      >
        <div
          class="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-[width] duration-1000 ease-linear"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </template>
    <span v-else class="text-gray-400">
      <slot name="ended">{{ $t('common.timeUp') }}</slot>
    </span>
  </div>
</template>

<style scoped>
.flip-enter-active,
.flip-leave-active {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
}
.flip-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}
.flip-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
