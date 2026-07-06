export function useFrTrainerTutorialText() {
  const { tm } = useI18n()

  function cornerCase(label: string) {
    const map = tm('tools.frTrainer.tutorial.corners.cases') as Record<string, string>
    return map[label] ?? ''
  }

  function edgeCase(label: string) {
    const map = tm('tools.frTrainer.tutorial.edges.cases') as Record<string, string>
    return map[label] ?? ''
  }

  function tutorialCase(label: string) {
    const map = tm('tools.frTrainer.tutorial.tutorialCases') as Record<string, string>
    return map[label] ?? ''
  }

  return { cornerCase, edgeCase, tutorialCase }
}
