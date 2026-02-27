export function useWcaReconstruction(wcaCompetitionId: Ref<string> | string) {
  const compId = isRef(wcaCompetitionId) ? wcaCompetitionId : ref(wcaCompetitionId)
  const reconData = ref<WcaReconstructionCompetitionData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      reconData.value = await useClientApi<WcaReconstructionCompetitionData>(`wca/reconstruction/${compId.value}`)
    }
    catch (e: any) {
      error.value = e?.message || 'Failed to load reconstruction data'
      reconData.value = null
    }
    finally {
      loading.value = false
    }
  }

  async function submitSolution(params: {
    roundNumber: number
    scrambleNumber: number
    scramble?: string
    solution: string
    comment?: string
  }) {
    return useClientApi('wca/reconstruction/submit', {
      method: 'POST',
      body: {
        wcaCompetitionId: compId.value,
        ...params,
      },
    })
  }

  async function updateDescription(description: string) {
    return useClientApi(`wca/reconstruction/${compId.value}/description`, {
      method: 'PUT',
      body: { description },
    })
  }

  return {
    reconData,
    loading,
    error,
    load,
    submitSolution,
    updateDescription,
  }
}
