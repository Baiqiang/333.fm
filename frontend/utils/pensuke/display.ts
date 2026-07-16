import type { AxisKey } from '~/utils/fr/types'

import { relabelSolution, SETUP_ROTATION } from '~/utils/fr/display'

export { AXIS_TAB_LABEL, AXIS_TABS } from '~/utils/fr/display'

export function buildCubeMoves(
  scramble: string,
  lsAxis: AxisKey,
  previewMoves?: string[] | null,
): string {
  const rot = SETUP_ROTATION[lsAxis]
  const previewStr = previewMoves?.length ? relabelSolution(previewMoves, lsAxis) : ''
  return [scramble || '', rot, previewStr].filter(Boolean).join(' ')
}

export const PENSUKE_TUTORIAL_URL = 'https://drive.google.com/file/d/1UUkcw2FuWK2NZjgeQ99VRua1CwAUtJmd/view?usp=sharing'
