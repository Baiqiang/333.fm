import type { AxisKey } from '~/utils/fr/types'

const LS_KEY = 'tool.frTrainer.history'
const MAX_RECORDS = 100

export type FrAxisMode = 'pick' | 'random'

export interface FrPracticeRecord {
  id: string
  createdAt: number
  scramble: string
  axisKey: AxisKey
  axisMode: FrAxisMode
  userSolution: string
  correct: boolean
  caseLabel: string
  referenceSolution: string[] | null
  userMoveCount: number
  referenceMoveCount: number | null
}

interface StorageDataV1 {
  version: 1
  records: FrPracticeRecord[]
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
  catch {
    // quota / private browsing
  }
}

export function getFrPracticeHistory(): FrPracticeRecord[] {
  return readStorage().records
}

export function appendFrPracticeRecord(
  record: Omit<FrPracticeRecord, 'id' | 'createdAt'>,
): FrPracticeRecord {
  const full: FrPracticeRecord = {
    ...record,
    id: generateId(),
    createdAt: Date.now(),
  }
  const data = readStorage()
  data.records = [full, ...data.records].slice(0, MAX_RECORDS)
  writeStorage(data)
  return full
}

export function clearFrPracticeHistory(): void {
  writeStorage({ version: 1, records: [] })
}
