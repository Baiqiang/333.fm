import { useNow } from '@vueuse/core'

// The canonical timezone competitions are scheduled in.
// Keep this in sync with the server (COMPETITION_TIMEZONE in server/src/utils).
export const COMPETITION_TIMEZONE = 'Asia/Shanghai'

export type DateIntent = 'datetime' | 'date' | 'time' | 'relative' | 'weekRange'

// User timezone preference: 'auto' follows the browser, otherwise an IANA name.
export const useTimezonePreference = defineStore('preference.timezone', {
  state: () => ({
    value: 'auto' as string,
  }),
  getters: {
    isAuto(): boolean {
      return this.value === 'auto'
    },
  },
  persist: true,
})

export function useDateTime() {
  const dayjs = useDayjs()
  const { locale } = useI18n()
  const preference = useTimezonePreference()

  // Resolve the effective IANA timezone. 'auto' falls back to the browser guess.
  const timezone = computed(() => {
    if (preference.value !== 'auto')
      return preference.value
    try {
      return dayjs.tz.guess()
    }
    catch {
      return COMPETITION_TIMEZONE
    }
  })

  function localized(value: string | number | Date) {
    return dayjs(value).tz(timezone.value).locale(locale.value)
  }

  function format(value: string | number | Date | null | undefined, intent: DateIntent = 'datetime'): string {
    if (value === null || value === undefined || value === '')
      return ''
    const d = localized(value)
    switch (intent) {
      // Date-only values (e.g. WCA competition days) have no meaningful time/zone.
      case 'date':
        return dayjs(value).locale(locale.value).format('LL')
      case 'time':
        return d.format('LT z')
      case 'relative':
        return d.fromNow()
      case 'datetime':
      default:
        return d.format('LLL z')
    }
  }

  // ISO string for the machine-readable <time datetime> attribute.
  function iso(value: string | number | Date | null | undefined): string {
    if (value === null || value === undefined || value === '')
      return ''
    return dayjs(value).toISOString()
  }

  // Short timezone label (e.g. "GMT+8") for the current preference.
  const timezoneLabel = computed(() => dayjs().tz(timezone.value).format('z'))

  return { format, iso, timezone, timezoneLabel }
}

export interface CountdownParts {
  total: number
  days: number
  hours: number
  minutes: number
  seconds: number
  ended: boolean
}

// Reactive countdown to a target time, ticking once per second.
export function useCountdownTo(to: MaybeRefOrGetter<string | number | Date | null | undefined>) {
  const now = useNow({ interval: 1000 })
  return computed<CountdownParts>(() => {
    const target = toValue(to)
    if (target === null || target === undefined || target === '')
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ended: true }
    const total = Math.max(0, new Date(target).getTime() - now.value.getTime())
    return {
      total,
      days: Math.floor(total / 86400000),
      hours: Math.floor((total % 86400000) / 3600000),
      minutes: Math.floor((total % 3600000) / 60000),
      seconds: Math.floor((total % 60000) / 1000),
      ended: total <= 0,
    }
  })
}
