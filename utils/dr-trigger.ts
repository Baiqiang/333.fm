export interface DRTriggerSolution {
  length: number
  eoBreaking: boolean
  trigger: number
  solution: string
}

export function formatArm(arm: string): string {
  if (arm.length === 2)
    return `ARM-${arm[0]}c${arm[1]}e`
  return arm
}
