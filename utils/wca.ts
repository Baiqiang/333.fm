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

export interface WCACompetition {
  id: string
  name: string
  venue: string
  registration_open: string
  registration_close: string
  start_date: string
  end_date: string
  competitor_limit: number
  main_event_id?: string
  short_display_name: string
  city: string
  country_iso2: string
  event_ids: string[]
  latitude_degrees: number
  longitude_degrees: number
  announced_at: string
  championship_types: string[]
}
export interface WCACompetitionsQuery {
  q?: string
  sort?: string
  start?: Date
  end?: Date
  page?: number
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

export interface WCALiveRecord {
  id: string
  tag: string
  type: string
  attemptResult: number
  result: {
    id: string
    person: WCALivePerson
    round: WCALiveRound & {
      competitionEvent: Omit<WCALiveCompetitionEvent, 'rounds'> & {
        competition: {
          id: string
        }
      }
    }
  }
}

export interface WCALivePerson {
  id: string
  name: string
  country: WCALiveCountry
}

export interface WCALiveEvent {
  id: string
  name: string
}

export interface WCALiveCompetitionEvent {
  id: string
  event: WCALiveEvent
  rounds: WCALiveRound[]
}

export interface WCALiveRound {
  id: string
  name: string
}
export interface WCALiveResult {
  id: string
  tag: string
  type: string
  attemptResult: number
  person: WCALivePerson
  round: WCALiveRound
}

export interface WCALiveCountry {
  iso2: string
  name: string
}

export interface WCALiveCompetition {
  id: string
  name: string
  wcaId: string
  competitionEvents: WCALiveCompetitionEvent[]
  competitionRecords: WCALiveRecord[]
}

export interface WCALiveRoundResult {
  id: string
  ranking: number
  advancing: boolean
  advancingQuestionable: boolean
  attempts: {
    result: number
  }[]
  best: number
  average: number
  person: WCALivePerson
  singleRecordTag: string
  averageRecordTag: string
}

export interface WCALiveRound {
  id: string
  name: string
  finished: boolean
  active: boolean
  competitionEvent: Omit<WCALiveCompetitionEvent, 'rounds'>
  format: {
    id: string
    numberOfAttempts: number
    sortBy: string
  }
  advancementCondition: {
    level: number
    type: string
  }
  results: WCALiveRoundResult[]
}

export const SYMBOL_WCA_LIVE_COMPETITION: InjectionKey<Ref<WCALiveCompetition | undefined>> = Symbol('wcaLiveCompetition')

export const WCA_LIVE_RECORD_LIST_RECORD_FRAGMENT = gql`
  fragment records on Record {
    id
    tag
    type
    attemptResult
    result {
      id
      person {
        id
        name
        country {
          iso2
          name
        }
      }
      round {
        id
        competitionEvent {
          id
          event {
            id
            name
          }
          competition {
            id
          }
        }
      }
    }
  }
`
export const WCA_LIVE_COMPETITIONS_QUERY = gql`
  query Competitions($filter: String!) {
    competitions(filter: $filter, limit: 10) {
      id
      name
    }
  }
`

export const WCA_LIVE_COMPETITION_QUERY = gql`
  query Competition($id: ID!) {
    competition(id: $id) {
      id
      wcaId
      name
      competitionRecords {
        ...records
      }
      competitionEvents {
        id
        event {
          id
          name
        }
        rounds {
          id
          name
          active
          open
          number
        }
      }
      venues {
        id
        name
        country {
          iso2
          name
        }
        rooms {
          id
          name
          color
          activities {
            id
            activityCode
            name
            startTime
            endTime
          }
        }
      }
    }
  }
  ${WCA_LIVE_RECORD_LIST_RECORD_FRAGMENT}
`

export const WCA_LIVE_ROUND_RESULT_FRAGMENT = gql`
  fragment roundResult on Result {
    ranking
    advancing
    advancingQuestionable
    attempts {
      result
    }
    best
    average
    person {
      id
      name
      country {
        iso2
        name
      }
    }
    singleRecordTag
    averageRecordTag
  }
`

export const WCA_LIVE_ROUND_QUERY = gql`
  query Round($id: ID!) {
    round(id: $id) {
      id
      name
      finished
      active
      competitionEvent {
        id
        event {
          id
          name
        }
      }
      format {
        id
        numberOfAttempts
        sortBy
      }
      advancementCondition {
        level
        type
      }
      results {
        id
        ...roundResult
      }
    }
  }
  ${WCA_LIVE_ROUND_RESULT_FRAGMENT}
`
