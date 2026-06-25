import { Competitions, CompetitionType } from '@/entities/competitions.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'

type CompetitionLike = Pick<Competitions, 'alias' | 'type'> & {
  user?: Pick<Users, 'id' | 'wcaId'> | null
  url?: string
}

type ScrambleLike = Pick<Scrambles, 'number' | 'roundNumber'>

type SubmissionLike = Pick<Submissions, 'id' | 'parentId'>

function competitionBaseUrl(competition: CompetitionLike): string {
  if (competition.url) return competition.url

  const { alias, type, user } = competition
  switch (type) {
    case CompetitionType.WEEKLY:
      return `/weekly/${alias}`
    case CompetitionType.DAILY:
      return `/daily/${alias}`
    case CompetitionType.ENDLESS:
      return `/endless/${alias}`
    case CompetitionType.FMC_CHAIN:
      return '/chain'
    case CompetitionType.PERSONAL_PRACTICE:
      if (!user) return '/practice'
      return `/practice/${user.wcaId || user.id}/${alias.split('-').pop()}`
    case CompetitionType.LEAGUE: {
      const matches = alias.match(/^league-(\d+)-(\d+)$/)
      if (matches) return `/league/${matches[1]}/week/${matches[2]}`
      return '/league'
    }
    case CompetitionType.WCA_RECONSTRUCTION:
      return `/wca/reconstruction/${alias}`
    default:
      return ''
  }
}

export function competitionPath(
  competition: CompetitionLike,
  scramble?: ScrambleLike,
  submission?: SubmissionLike,
): string {
  const { alias, type, user } = competition
  switch (type) {
    case CompetitionType.WEEKLY:
      if (scramble) return `/weekly/${alias}#scramble-${scramble.number}`
      return `/weekly/${alias}`
    case CompetitionType.DAILY:
      if (scramble) return `/daily/${alias}#scramble-${scramble.number}`
      return `/daily/${alias}`
    case CompetitionType.ENDLESS:
      if (scramble) return `/endless/${alias}/${scramble.number}`
      return `/endless/${alias}`
    case CompetitionType.FMC_CHAIN:
      if (!scramble) return '/chain'
      if (!submission) return `/chain/${scramble.number}`
      return `/chain/${scramble.number}/${submission.parentId}`
    case CompetitionType.PERSONAL_PRACTICE:
      if (!user) return '/practice'
      if (scramble)
        return `/practice/${user.wcaId || user.id}/${alias.split('-').pop()}#scramble-${scramble.number}`
      return `/practice/${user.wcaId || user.id}/${alias.split('-').pop()}`
    case CompetitionType.LEAGUE:
      if (scramble) return `${competitionBaseUrl(competition)}#scramble-${scramble.number}`
      return competitionBaseUrl(competition)
    case CompetitionType.WCA_RECONSTRUCTION:
      if (scramble)
        return `${competitionBaseUrl(competition)}#r${scramble.roundNumber}-a${scramble.number}`
      return competitionBaseUrl(competition)
    default:
      return competitionBaseUrl(competition)
  }
}

export function submissionLink(
  competition: CompetitionLike,
  scramble?: ScrambleLike,
  submission?: SubmissionLike,
  baseUrl = '',
): string {
  const path = competitionPath(competition, scramble, submission)
  if (!submission) return `${baseUrl.replace(/\/$/, '')}${path}`

  const sid = `sid=${submission.id}`
  const hashIndex = path.indexOf('#')
  const fullPath =
    hashIndex >= 0 ? `${path.substring(0, hashIndex)}?${sid}${path.substring(hashIndex)}` : `${path}?${sid}`
  return `${baseUrl.replace(/\/$/, '')}${fullPath}`
}
