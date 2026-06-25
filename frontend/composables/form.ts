import type { CompetitionFormat } from '@/utils/competition'

export const useIFForm = defineStore('form.if', {
  state: () => ({
    name: '',
    scramble: '',
    skeleton: '',
    algs: [] as string[],
    greedy: 2,
  }),
})

export const useSFForm = defineStore('form.sf', {
  state: () => ({
    name: '',
    skeleton: '',
  }),
})

export const useWeeklyForm = defineStore('form.weekly', {
  state: () => ({
    solution: '',
    comment: '',
  }),
})

export const useNewPracticeForm = defineStore('form.practice.new', {
  state: () => ({
    format: 0 as CompetitionFormat,
  }),
})
