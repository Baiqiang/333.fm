import type { DsSecondSlice, SliceGoal } from '@333fm/utils'
import type { AxisKey } from '~/utils/pensuke/types'

const LS_KEY = 'tool.pensukeTrainer.history'
const MAX_RECORDS = 100

export type PensukeAxisMode = 'pick' | 'random'
export type PensukePracticeMode = SliceGoal['mode']

export interface PensukePracticeRecord {
  id: string
  createdAt: number
  scramble: string
  lsAxis: AxisKey
  frAxis: AxisKey
  axisMode: PensukeAxisMode
  practiceMode?: PensukePracticeMode
  secondSlice?: DsSecondSlice
  maxOptimalMoves?: number | null
  userSolution: string
  correct: boolean
  userMoveCount: number
  referenceMoveCount: number | null
}

interface StorageDataV1 {
  version: 1
  records: PensukePracticeRecord[]
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function readStorage(): StorageDataV1 {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw)
      return { version: 1, records: [] }
    const parsed = JSON.parse(raw) as StorageDataV1
    if (parsed.version !== 1 || !Array.isArray(parsed.records))
      return { version: 1, records: [] }
    return parsed
  }
  catch {
    return { version: 1, records: [] }
  }
}

function writeStorage(data: StorageDataV1): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  }
  catch {}
}

export function getPensukePracticeHistory(mode: PensukePracticeMode = 'ls'): PensukePracticeRecord[] {
  return readStorage().records.filter(record => (record.practiceMode ?? 'ls') === mode)
}

export function appendPensukePracticeRecord(
  record: Omit<PensukePracticeRecord, 'id' | 'createdAt'>,
): PensukePracticeRecord {
  const full: PensukePracticeRecord = {
    ...record,
    id: generateId(),
    createdAt: Date.now(),
  }
  const data = readStorage()
  const counts = { ls: 0, ds: 0 }
  data.records = [full, ...data.records].filter(record => ++counts[record.practiceMode ?? 'ls'] <= MAX_RECORDS)
  writeStorage(data)
  return full
}

export function clearPensukePracticeHistory(mode: PensukePracticeMode = 'ls'): void {
  const data = readStorage()
  data.records = data.records.filter(record => (record.practiceMode ?? 'ls') !== mode)
  writeStorage(data)
}
