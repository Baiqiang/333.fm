export interface CaseItem {
  label: string
  setup: string
}

export const cornerCases: CaseItem[] = [
  { label: '0', setup: '' },
  { label: '1', setup: 'U2 R2 F2 R2 F2 U2 F2' },
  { label: '2RL', setup: 'U2 R2 F2 R2 F2 U2' },
  { label: '2FB', setup: 'U2 F2 R2 F2 R2 U2' },
]

export const edgeCases: CaseItem[] = [
  { label: '4-0', setup: 'U2 R2 F2 R2 F2 U2 F2 U2' },
  { label: '3-1', setup: 'U2 R2 U2 R2 F2 U2 F2 U2' },
  { label: '2-2o', setup: 'U2 R2 L2 U2' },
  { label: '2-2a', setup: 'U2 R2 F2 R2 F2 R2 F2 U2' },
]

export const algTable: { c: string, alg: string }[] = [
  { c: '4-0 / 1', alg: 'U2' },
  { c: '3-1 / 2FB', alg: 'R2 U2' },
  { c: '2-2a / 2FB', alg: 'F2 R2 U2' },
  { c: '2-2a / 2RL', alg: 'R2 F2 U2' },
  { c: '2-2o / 1', alg: 'R2 L2 U2' },
  { c: '3-1 / 1', alg: 'F2 R2 F2 U2' },
  { c: '4-0 / 2FB', alg: 'R2 F2 R2 F2 U2' },
  { c: '4-0 / 2RL', alg: 'F2 R2 F2 R2 U2' },
  { c: '2-2o / 2FB', alg: 'L2 F2 R2 F2 U2' },
  { c: '2-2o / 2RL', alg: 'F2 L2 F2 R2 U2' },
  { c: '3-1 / 2RL', alg: 'L2 F2 L2 F2 R2 U2' },
  { c: '2-2a / 1', alg: 'F2 L2 F2 L2 F2 R2 U2' },
]

export function algInverseSetup(alg: string): string {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .join(' ')
}

export interface TutorialCaseItem {
  label: string
  alg: string
  setup: string
  tier: 'simple' | 'hard' | 'special'
}

export const tutorialCases: TutorialCaseItem[] = [
  { label: '4-0 / 1', alg: 'U2', setup: algInverseSetup('U2'), tier: 'simple' },
  { label: '3-1 / 2FB', alg: 'R2 U2', setup: algInverseSetup('R2 U2'), tier: 'simple' },
  { label: '2-2a / 2FB', alg: 'F2 R2 U2', setup: algInverseSetup('F2 R2 U2'), tier: 'simple' },
  { label: '2-2a / 2RL', alg: 'R2 F2 U2', setup: algInverseSetup('R2 F2 U2'), tier: 'simple' },
  { label: '2-2o / 1', alg: 'R2 L2 U2', setup: algInverseSetup('R2 L2 U2'), tier: 'simple' },
  { label: '3-1 / 1', alg: 'F2 R2 F2 U2', setup: algInverseSetup('F2 R2 F2 U2'), tier: 'hard' },
  { label: '4-0 / 2FB', alg: 'R2 F2 R2 F2 U2', setup: algInverseSetup('R2 F2 R2 F2 U2'), tier: 'hard' },
  { label: '4-0 / 2RL', alg: 'F2 R2 F2 R2 U2', setup: algInverseSetup('F2 R2 F2 R2 U2'), tier: 'hard' },
  { label: '2-2o / 2FB', alg: 'L2 F2 R2 F2 U2', setup: algInverseSetup('L2 F2 R2 F2 U2'), tier: 'hard' },
  { label: '2-2o / 2RL', alg: 'F2 L2 F2 R2 U2', setup: algInverseSetup('F2 L2 F2 R2 U2'), tier: 'hard' },
  { label: '3-1 / 2RL', alg: 'L2 F2 L2 F2 R2 U2', setup: algInverseSetup('L2 F2 L2 F2 R2 U2'), tier: 'hard' },
  { label: '2-2a / 1', alg: 'F2 L2 F2 L2 F2 R2 U2', setup: algInverseSetup('F2 L2 F2 L2 F2 R2 U2'), tier: 'hard' },
]

export const TUTORIAL_SPECIAL_40_0: TutorialCaseItem = {
  label: '4-0 / 0',
  alg: 'U2',
  setup: edgeCases.find(c => c.label === '4-0')!.setup,
  tier: 'special',
}

export const FR_LIMITED_SCRAMBLE = 'R2 L2 F2 B2'
export const FR_TRIGGER_SETUP = algInverseSetup('R2 U2')
export const FALSE_FR_SETUP = 'F R2 F2 R2 F2 R2 F'
export const PARITY_INSERT_SETUP = edgeCases.find(c => c.label === '2-2a')!.setup
export const FR_TUTORIAL_URL = 'https://www.bilibili.com/opus/1009758579532496920'
