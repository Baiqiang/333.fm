<script setup lang="ts">
const timezonePreference = useTimezonePreference()
const { t } = useI18n()
const dayjs = useDayjs()
const open = ref(false)
const el = ref()
onClickOutside(el, () => {
  open.value = false
})

function offsetLabel(minutes: number) {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

const options = computed(() => [
  { value: 'auto', label: `${t('timezone.auto')} (${offsetLabel(dayjs().utcOffset())})` },
  { value: COMPETITION_TIMEZONE, label: offsetLabel(dayjs().tz(COMPETITION_TIMEZONE).utcOffset()) },
  { value: 'UTC', label: 'UTC' },
])
const currentLabel = computed(
  () => options.value.find(o => o.value === timezonePreference.value)?.label ?? options.value[0].label,
)
function select(value: string) {
  timezonePreference.value = value
  open.value = false
}
</script>

<template>
  <div ref="el" class="relative">
    <button
      class="flex items-center gap-1 transition-colors duration-200 hover:text-yellow-300"
      :aria-label="t('timezone.title')"
      @click="open = !open"
    >
      <Icon name="mdi:clock-outline" class="w-4 h-4 inline-block" />
      <span>{{ currentLabel }}</span>
      <Icon name="mdi:chevron-down" class="w-3 h-3" :class="{ 'rotate-180': open }" />
    </button>
    <TransitionSlide :offset="[0, 4]">
      <div
        v-if="open"
        class="absolute bottom-full right-0 mb-2 min-w-max bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg p-1 text-sm z-50"
      >
        <button
          v-for="o in options"
          :key="o.value"
          class="block w-full text-left whitespace-nowrap px-3 py-1.5 transition-colors hover:bg-indigo-50 dark:hover:bg-gray-700"
          :class="{ 'text-indigo-600 dark:text-indigo-400 font-medium': timezonePreference.value === o.value }"
          @click="select(o.value)"
        >
          {{ o.label }}
        </button>
      </div>
    </TransitionSlide>
  </div>
</template>
