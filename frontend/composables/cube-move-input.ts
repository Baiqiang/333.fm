import type { Ref } from 'vue'

export function useCubeMoveInput(solution: Ref<string>) {
  function appendMove(move: string) {
    solution.value = solution.value ? `${solution.value} ${move}` : move
  }

  function deleteLastMove() {
    const parts = solution.value.trim().split(/\s+/)
    parts.pop()
    solution.value = parts.join(' ')
  }

  function clearSolution() {
    solution.value = ''
  }

  function handleSolutionKeydown(
    e: KeyboardEvent,
    canSubmit: boolean,
    onSubmit: () => void,
  ) {
    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }

  return { appendMove, deleteLastMove, clearSolution, handleSolutionKeydown }
}
