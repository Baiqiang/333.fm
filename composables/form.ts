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
