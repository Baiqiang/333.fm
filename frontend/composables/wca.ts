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

/**
 * Fetch a single WCA competition, reusing the store cache and de-duplicating
 * requests by key so repeated navigations don't hammer the rate-limited WCA API.
 * Throws a properly typed `createError` (using `message`, not `statusMessage`,
 * so h3 won't sanitize localized text) that distinguishes rate limiting and
 * upstream failures from a genuine "not found".
 */
export async function useWCACompetition(id: MaybeRefOrGetter<string>) {
  const config = useRuntimeConfig().public
  const cache = useWCACompetitionsCache()
  const { t } = useI18n()
  const wcaId = toValue(id)

  const cached = cache.competitions[wcaId]
  if (cached)
    return cached

  // Use a plain fetch (not `useApi`) so we don't leak our access token to WCA.
  const { data, error } = await useFetch<WCACompetition>(
    `${config.wca.apiBaseURL}/competitions/${wcaId}`,
    { key: `wca-competition-${wcaId}` },
  )

  if (error.value || !data.value) {
    const statusCode = error.value?.statusCode
    if (statusCode === 429) {
      throw createError({
        statusCode: 429,
        message: t('error.wca.rateLimited'),
      })
    }
    if (statusCode && statusCode >= 500) {
      throw createError({
        statusCode: 502,
        message: t('error.wca.fetchFailed'),
      })
    }
    throw createError({
      statusCode: 404,
      message: t('error.wca.competitionNotFound'),
    })
  }

  cache.setCompetition(data.value)
  return data.value
}
