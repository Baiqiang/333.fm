export interface WCAResult {
  id: number
  pos: number
  best: number
  average: number
  name: string
  country_iso2: string
  competition_id: string
  event_id: string
  round_type_id: string
  format_id: string
  wca_id: string
  attempts: number[]
  best_index: number
  worst_index: number
  regional_single_record: WCARecord
  regional_average_record: WCARecord
}

export type WCARecord = 'WR' | 'CR' | 'NR' | null

export const WCA_DNF = -1
export const WCA_DNS = -2

export function formatWCAResult(result: number, precision = 0, scale = 1) {
  if (Number.isNaN(result))
    return 'N/A'

  if (!result)
    return ''
  if (result === WCA_DNF)
    return 'DNF'
  if (result === WCA_DNS)
    return 'DNS'
  return (result / scale).toFixed(precision)
}
