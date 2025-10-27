export const useWCACompetitionsCache = defineStore('wca.competitions', {
  state: () => ({
    competitions: {} as Record<string, WCACompetition>,
  }),
  actions: {
    setCompetitions(competitions: WCACompetition[]) {
      this.competitions = competitions.reduce((acc, competition) => {
        acc[competition.id] = competition
        return acc
      }, this.competitions)
    },
    setCompetition(competition: WCACompetition) {
      this.competitions[competition.id] = competition
    },
  },
})
