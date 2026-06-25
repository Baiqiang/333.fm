<script setup lang="ts">
const props = defineProps<{
  condition: ConditionInfo
}>()
const { t } = useI18n()
const star = '✱'

const label = computed(() => {
  if (!props.condition.revealed)
    return ''
  const { type, params, autoRevealed } = props.condition
  const masked = autoRevealed || !params

  switch (type) {
    case ConditionType.MOVES_EQUAL:
      if (masked) return t('endlessChallenge.conditionType.movesEqual', { moves: star })
      return params.count > 1
        ? t('endlessChallenge.conditionType.movesEqualMulti', { moves: formatResult(params.moves), count: params.count })
        : t('endlessChallenge.conditionType.movesEqual', { moves: formatResult(params.moves) })
    case ConditionType.MOVES_LE:
      if (masked) return t('endlessChallenge.conditionType.movesLe', { moves: star })
      return params.count > 1
        ? t('endlessChallenge.conditionType.movesLeMulti', { moves: formatResult(params.moves), count: params.count })
        : t('endlessChallenge.conditionType.movesLe', { moves: formatResult(params.moves) })
    case ConditionType.MOVES_GE:
      if (masked) return t('endlessChallenge.conditionType.movesGe', { moves: star })
      return params.count > 1
        ? t('endlessChallenge.conditionType.movesGeMulti', { moves: formatResult(params.moves), count: params.count })
        : t('endlessChallenge.conditionType.movesGe', { moves: formatResult(params.moves) })
    case ConditionType.MOVES_PARITY:
      if (masked) return t('endlessChallenge.conditionType.movesParity', { parity: star })
      return t('endlessChallenge.conditionType.movesParity', { parity: t(`endlessChallenge.parity.${params.parity}`) })
    case ConditionType.SAME_SOLUTION:
      if (masked) return t('endlessChallenge.conditionType.sameSolution', { count: star })
      return t('endlessChallenge.conditionType.sameSolution', { count: params.count })
    case ConditionType.SAME_MOVES:
      if (masked) return t('endlessChallenge.conditionType.sameMoves', { count: star })
      return t('endlessChallenge.conditionType.sameMoves', { count: params.count })
    case ConditionType.ALL_DIFFERENT_MOVES:
      if (masked) return t('endlessChallenge.conditionType.allDifferentMoves', { min: star })
      return t('endlessChallenge.conditionType.allDifferentMoves', { min: params.minSubmissions })
    case ConditionType.TOTAL_SUBMISSIONS:
      if (masked) return t('endlessChallenge.conditionType.totalSubmissions', { count: star })
      return t('endlessChallenge.conditionType.totalSubmissions', { count: params.count })
    case ConditionType.CONSECUTIVE_MOVES:
      if (masked) return t('endlessChallenge.conditionType.consecutiveMoves', { count: star, diff: star })
      return t('endlessChallenge.conditionType.consecutiveMoves', { count: params.count, diff: formatResult(params.diff) })
    default:
      return ''
  }
})
</script>

<template>
  <span>{{ label }}</span>
</template>
