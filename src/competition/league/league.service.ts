import { BadRequestException, forwardRef, Inject, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindOneOptions, In, Repository } from 'typeorm'

import { LeaguePlayerDto } from '@/dtos/league-player.dto'
import { SubmitSolutionDto } from '@/dtos/submit-solution.dto'
import {
  CompetitionFormat,
  CompetitionMode,
  Competitions,
  CompetitionStatus,
  CompetitionType,
} from '@/entities/competitions.entity'
import { LeagueDuels } from '@/entities/league-duels.entity'
import { LeagueEloHistories } from '@/entities/league-elo-histories.entity'
import { LeagueElos } from '@/entities/league-elos.entity'
import { LeagueParticipants } from '@/entities/league-participants.entity'
import { LeaguePlayers } from '@/entities/league-players.entity'
import { LeagueResults } from '@/entities/league-results.entity'
import { LeagueSeasons, LeagueSeasonStatus } from '@/entities/league-seasons.entity'
import { LeagueStandings } from '@/entities/league-standings.entity'
import { LeagueTiers } from '@/entities/league-tiers.entity'
import { DNF, DNS } from '@/entities/results.entity'
import { Results } from '@/entities/results.entity'
import { Scrambles } from '@/entities/scrambles.entity'
import { Submissions } from '@/entities/submissions.entity'
import { Users } from '@/entities/users.entity'
import { UserService } from '@/user/user.service'
import { betterThan, calculateMoves } from '@/utils'
import { calculateScores, DEFAULT_ELO, updateElo } from '@/utils/elo-calculator'
import { generateScrambles } from '@/utils/scramble'

import { CompetitionService } from '../competition.service'

export interface LeagueJob {
  competitionId: number
  userId: number
  scrambleId: number
  scrambleNumber: number
  submissionId: number
  moves: number
}
export const ONE_WEEK = 7 * 24 * 60 * 60 * 1000

@Injectable()
export class LeagueService {
  constructor(
    @InjectRepository(LeagueSeasons)
    private readonly leagueSeasonsRepository: Repository<LeagueSeasons>,
    @InjectRepository(LeagueTiers)
    private readonly leagueTiersRepository: Repository<LeagueTiers>,
    @InjectRepository(LeaguePlayers)
    private readonly leaguePlayersRepository: Repository<LeaguePlayers>,
    @InjectRepository(LeagueDuels)
    private readonly leagueDuelsRepository: Repository<LeagueDuels>,
    @InjectRepository(LeagueStandings)
    private readonly leagueStandingsRepository: Repository<LeagueStandings>,
    @InjectRepository(LeagueResults)
    private readonly leagueResultsRepository: Repository<LeagueResults>,
    @InjectRepository(LeagueElos)
    private readonly leagueElosRepository: Repository<LeagueElos>,
    @InjectRepository(LeagueEloHistories)
    private readonly leagueEloHistoriesRepository: Repository<LeagueEloHistories>,
    @InjectRepository(LeagueParticipants)
    private readonly leagueParticipantsRepository: Repository<LeagueParticipants>,
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    @Inject(forwardRef(() => CompetitionService))
    private readonly competitionService: CompetitionService,
    private readonly userService: UserService,
  ) {}

  async getSeasons() {
    return this.leagueSeasonsRepository.find({
      order: {
        startTime: 'DESC',
      },
    })
  }

  async getSeason(number: number) {
    return this.findSeason({
      where: {
        number,
      },
    })
  }

  async getOnGoing() {
    return this.findSeason({
      where: {
        status: LeagueSeasonStatus.ON_GOING,
      },
    })
  }

  async getNext() {
    return this.findSeason({
      where: {
        status: In([LeagueSeasonStatus.NOT_STARTED, LeagueSeasonStatus.ON_GOING]),
      },
      order: {
        number: 'DESC',
      },
    })
  }

  async getPastSeasons() {
    return this.leagueSeasonsRepository.find({
      where: {
        status: LeagueSeasonStatus.ENDED,
      },
      order: {
        number: 'DESC',
      },
    })
  }

  async findSeason(options: FindOneOptions<LeagueSeasons>) {
    const season = await this.leagueSeasonsRepository.findOne({
      ...options,
    })
    if (season) {
      // load relations manually
      const [tiers, competitions, standings, eloHistories] = await Promise.all([
        this.leagueTiersRepository.find({
          where: {
            seasonId: season.id,
          },
          relations: {
            players: {
              user: true,
            },
          },
        }),
        this.competitionsRepository.find({
          where: {
            leagueSeasonId: season.id,
          },
          relations: {
            scrambles: true,
          },
        }),
        this.leagueStandingsRepository.find({
          where: {
            seasonId: season.id,
          },
        }),
        this.leagueEloHistoriesRepository.find({
          where: {
            seasonId: season.id,
          },
        }),
      ])
      // Build elos from the latest history entry per user
      const eloWeekMap: Record<number, number> = {}
      const elos: Record<number, number> = {}
      for (const h of eloHistories) {
        if (!eloWeekMap[h.userId] || h.week > eloWeekMap[h.userId]) {
          eloWeekMap[h.userId] = h.week
          elos[h.userId] = h.points
        }
      }

      season.tiers = tiers
      season.competitions = competitions
      season.standings = standings
      season.eloHistories = eloHistories
      season.elos = elos
      season.competitions.forEach((competition, i) => {
        competition.prevCompetition = season.competitions[i - 1]
          ? Object.assign(new Competitions(), season.competitions[i - 1])
          : null
        competition.nextCompetition = season.competitions[i + 1]
          ? Object.assign(new Competitions(), season.competitions[i + 1])
          : null
      })
    }
    return season
  }

  async createSeason(number: number, startTimeStr: string, weeks: number) {
    const startTime = new Date(startTimeStr)
    const season = new LeagueSeasons()
    season.number = number
    season.startTime = startTime
    season.endTime = new Date(startTime.getTime() + ONE_WEEK * weeks)
    season.status = LeagueSeasonStatus.NOT_STARTED
    return this.leagueSeasonsRepository.save(season)
  }

  async deleteSeason(season: LeagueSeasons) {
    await this.leagueSeasonsRepository.delete(season.id)
  }

  async updateSeason(season: LeagueSeasons, attributes: Partial<LeagueSeasons>) {
    Object.assign(season, attributes)
    return this.leagueSeasonsRepository.save(season)
  }

  async createCompetitions(season: LeagueSeasons, user: Users, weeks: number, firstStartTime: string) {
    const competitions: Competitions[] = []
    let startTime = new Date(firstStartTime)
    for (let i = 0; i < weeks; i++) {
      const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000)
      const competition = await this.createCompetition(season, user, i + 1, startTime.toString(), endTime.toString())
      competitions.push(competition)
      startTime = endTime
    }
    return competitions
  }

  async createCompetition(season: LeagueSeasons, user: Users, week: number, startTime: string, endTime: string) {
    const competition = new Competitions()
    competition.name = `League S${season.number} Week ${week}`
    competition.alias = `league-${season.number}-${week}`
    competition.leagueSeasonId = season.id
    competition.type = CompetitionType.LEAGUE
    competition.format = CompetitionFormat.MO3
    competition.userId = user.id
    competition.status = CompetitionStatus.NOT_STARTED
    competition.startTime = new Date(startTime)
    competition.endTime = new Date(endTime)
    return this.competitionsRepository.save(competition)
  }

  async calculateCompetitionStatus(competition: Competitions) {
    // check if all scrambles are generated
    const scrambles = await this.scramblesRepository.find({
      where: {
        competitionId: competition.id,
      },
    })
    if (scrambles.length === 3) {
      return CompetitionStatus.ON_GOING
    }
    return CompetitionStatus.NOT_STARTED
  }

  async startSeason(season: LeagueSeasons) {
    season.status = LeagueSeasonStatus.ON_GOING
    await this.leagueSeasonsRepository.save(season)
  }

  async startCompetition(competition: Competitions) {
    competition.status = CompetitionStatus.ON_GOING
    competition.endTime = new Date(competition.startTime.getTime() + ONE_WEEK)
    await this.competitionsRepository.save(competition)
  }

  async endCompetition(competition: Competitions) {
    competition.endTime = new Date()
    await this.competitionsRepository.save(competition)
  }

  async removeScrambles(competition: Competitions) {
    await this.scramblesRepository.delete({
      competitionId: competition.id,
    })
  }

  async generateScrambles(competition: Competitions) {
    await this.removeScrambles(competition)
    const scrambles: Scrambles[] = generateScrambles(3).map((str, number) => {
      const scramble = new Scrambles()
      scramble.number = number + 1
      scramble.scramble = str
      scramble.competitionId = competition.id
      return scramble
    })
    return this.scramblesRepository.save(scrambles)
  }

  async updateScrambles(competition: Competitions, scrambleStrings: string[]) {
    await this.removeScrambles(competition)
    const scrambles: Scrambles[] = scrambleStrings.map((str, number) => {
      const scramble = new Scrambles()
      scramble.number = number + 1
      scramble.scramble = str
      scramble.competitionId = competition.id
      return scramble
    })
    return this.scramblesRepository.save(scrambles)
  }

  async createTiers(season: LeagueSeasons, num: number) {
    const tiers = []
    for (let i = 0; i < num; i++) {
      const tier = new LeagueTiers()
      tier.seasonId = season.id
      tier.level = i + 1
      tiers.push(tier)
    }
    return this.leagueTiersRepository.save(tiers)
  }

  async updateTier(tier: LeagueTiers, attributes: Partial<LeagueTiers>) {
    Object.assign(tier, attributes)
    return this.leagueTiersRepository.save(tier)
  }

  async pickPlayers(tier: LeagueTiers, playerInfos: LeaguePlayerDto[]) {
    const players = []
    // remove current players
    await this.leaguePlayersRepository.delete({
      seasonId: tier.seasonId,
      tierId: tier.id,
    })
    for (const { wcaId, name, avatarThumb } of playerInfos) {
      // find user by wcaId
      let user = await this.userService.findOne(wcaId)
      if (user === null) {
        // create dummy user if not found
        user = await this.userService.createDummyUser(wcaId, name, avatarThumb)
      }
      let player = await this.leaguePlayersRepository.findOne({
        where: {
          seasonId: tier.seasonId,
          userId: user.id,
        },
      })
      // create new player if not found
      if (player === null) {
        player = new LeaguePlayers()
        player.userId = user.id
        player.seasonId = tier.seasonId
        player.user = user
      }
      // update tier for existing player
      player.tierId = tier.id
      await this.leaguePlayersRepository.save(player)
      players.push(player)
    }
    return players
  }

  async movePlayer(player: LeaguePlayers, toTier: LeagueTiers) {
    player.tierId = toTier.id
    await this.leaguePlayersRepository.save(player)
  }

  async clearSchedules(season: LeagueSeasons) {
    await this.leagueDuelsRepository.delete({
      competitionId: In(season.competitions.map(c => c.id)),
    })
  }

  async generateSchedules(season: LeagueSeasons) {
    // remove all duels
    await this.clearSchedules(season)
    const tierPlayers = await this.getTierPlayers(season)
    const competitions = await this.competitionsRepository.find({
      where: {
        leagueSeasonId: season.id,
      },
    })
    // A round robin with N slots produces N - 1 rounds, so to span every
    // competition week we need (weeks + 1) slots. Smaller tiers are padded with
    // byes (null) up to this size; a player paired against a bye is "轮空" that week.
    const slots = competitions.length + 1
    for (const { tier, players } of tierPlayers) {
      const schedules: LeagueDuels[] = []
      // round robin: pad with byes (null) up to the full tier size
      while (players.length < slots) {
        players.push(null)
      }
      // ensure an even number of slots for the round robin
      if (players.length % 2 === 1) {
        players.push(null)
      }
      // shuffle players
      players.sort(() => Math.random() - 0.5)
      const count = players.length
      // never schedule more rounds than there are weeks
      const rounds = Math.min(count - 1, competitions.length)
      for (let i = 0; i < rounds; i++) {
        const competition = competitions[i]
        for (let j = 0; j < count / 2; j++) {
          const player = players[j]?.user ?? null
          const opponent = players[count - 1 - j]?.user ?? null
          // skip bye vs bye: no real players involved
          if (!player && !opponent) {
            continue
          }
          const isHome = false //j === 0 && i % 2 === 1
          const duel = new LeagueDuels()
          duel.user1 = isHome ? player : opponent
          duel.user2 = isHome ? opponent : player
          duel.seasonId = season.id
          duel.tierId = tier.id
          duel.competitionId = competition.id
          duel.user1Id = duel.user1?.id
          duel.user2Id = duel.user2?.id
          schedules.push(duel)
        }
        players.splice(1, 0, players.pop()) // rotate players
      }
      await this.leagueDuelsRepository.save(schedules)
    }
  }

  async getSeasonCompetition(season: LeagueSeasons, week: number) {
    return this.competitionService.findOne({
      where: {
        alias: `league-${season.number}-${week}`,
      },
      relations: {
        scrambles: true,
      },
    })
  }

  async getSeasonCompetitionByAlias(season: LeagueSeasons, alias: string) {
    return this.competitionService.findOne({
      where: {
        leagueSeasonId: season.id,
        alias,
      },
      relations: {
        scrambles: true,
      },
    })
  }

  hideScrambles(season?: LeagueSeasons) {
    if (!season || !season.competitions) {
      return
    }
    season.competitions.map(competition => {
      this.hideCompetitionScrambles(competition)
    })
  }

  // hide competition scrambles recursively
  hideCompetitionScrambles(competition: Competitions) {
    if (!competition.hasStarted) {
      competition.scrambles = []
    }
    if (competition.prevCompetition) {
      this.hideCompetitionScrambles(competition.prevCompetition)
    }
    if (competition.nextCompetition) {
      this.hideCompetitionScrambles(competition.nextCompetition)
    }
  }

  async getTier(season: LeagueSeasons, id: number) {
    return this.leagueTiersRepository.findOne({
      where: {
        id,
        seasonId: season.id,
      },
    })
  }

  async getTiers(season: LeagueSeasons) {
    return this.leagueTiersRepository.find({
      where: {
        seasonId: season.id,
      },
      relations: {
        players: {
          user: true,
        },
      },
    })
  }

  async getTierPlayers(season: LeagueSeasons) {
    const players = await this.leaguePlayersRepository.find({
      where: {
        seasonId: season.id,
      },
      relations: {
        tier: true,
        user: true,
      },
    })
    const tmp: Record<
      number,
      {
        tier: LeagueTiers
        players: LeaguePlayers[]
      }
    > = {}
    for (const player of players) {
      if (!tmp[player.tierId]) {
        tmp[player.tierId] = {
          tier: player.tier,
          players: [],
        }
      }
      tmp[player.tierId].players.push(player)
    }
    return Object.values(tmp).sort((a, b) => a.tier.level - b.tier.level)
  }

  async getParticipant(season: LeagueSeasons, user: Users) {
    return this.leagueParticipantsRepository.findOne({
      where: {
        userId: user.id,
        seasonId: season.id,
      },
    })
  }

  async getParticipants(season: LeagueSeasons) {
    return this.leagueParticipantsRepository.find({
      where: {
        seasonId: season.id,
      },
      relations: {
        user: true,
      },
    })
  }

  async participate(season: LeagueSeasons, user: Users) {
    const participant = new LeagueParticipants()
    participant.userId = user.id
    participant.seasonId = season.id
    return this.leagueParticipantsRepository.save(participant)
  }

  async unparticipate(season: LeagueSeasons, user: Users) {
    await this.leagueParticipantsRepository.delete({
      userId: user.id,
      seasonId: season.id,
    })
  }

  async getPlayer(season: LeagueSeasons, user: Users) {
    return this.leaguePlayersRepository.findOne({
      where: {
        userId: user.id,
        seasonId: season.id,
      },
    })
  }

  async getStandings(season: LeagueSeasons) {
    return this.leagueStandingsRepository.find({
      where: {
        seasonId: season.id,
      },
      relations: {
        user: true,
        tier: true,
      },
      order: {
        points: 'DESC',
        wins: 'DESC',
        draws: 'DESC',
        losses: 'ASC',
      },
    })
  }

  async getOrCreateStandings(season: LeagueSeasons) {
    const standings = await this.getStandings(season)
    if (standings.length === 0) {
      // all players have a standing
      const tierPlayers = await this.getTierPlayers(season)
      for (const { players } of tierPlayers) {
        for (const player of players) {
          const standing = new LeagueStandings()
          standing.seasonId = season.id
          standing.userId = player.userId
          standing.tierId = player.tierId
          standings.push(standing)
        }
      }
      await this.leagueStandingsRepository.save(standings)
    }
    return standings
  }

  async getMappedStandings(season: LeagueSeasons) {
    const standings = await this.getStandings(season)
    return Object.fromEntries(standings.map(s => [s.userId, s]))
  }

  async getElos() {
    return this.leagueElosRepository.find({})
  }

  async getSeasonElos(season: LeagueSeasons) {
    const eloHistories = await this.leagueEloHistoriesRepository.find({ where: { seasonId: season.id } })
    const tmp: Record<number, Record<number, LeagueEloHistories>> = {}
    for (const eloHistory of eloHistories) {
      tmp[eloHistory.userId] = tmp[eloHistory.userId] || {}
      tmp[eloHistory.userId][eloHistory.week] = eloHistory
    }
    return Object.values(tmp)
      .map(e => Object.values(e))
      .sort((a, b) => b[b.length - 1].points - a[a.length - 1].points)
  }

  async getResults(season: LeagueSeasons) {
    return this.leagueResultsRepository.find({
      where: {
        seasonId: season.id,
      },
    })
  }

  async getSolves(season: LeagueSeasons) {
    const competitions = await this.competitionsRepository.find({
      where: {
        leagueSeasonId: season.id,
        status: CompetitionStatus.ENDED,
      },
    })
    return this.resultsRepository.find({
      where: {
        competitionId: In(competitions.map(c => c.id)),
      },
      relations: {
        user: true,
      },
    })
  }

  async getSchedules(season: LeagueSeasons, user?: Users) {
    const tiers = await this.getTiers(season)
    const schedules: { tier: LeagueTiers; schedules: LeagueDuels[] }[] = []
    for (const tier of tiers) {
      const tierSchedules = await this.getTierSchedules(tier)
      schedules.push({ tier, schedules: tierSchedules })
    }
    await this.loadDuelsResults(schedules, user)
    return schedules
  }

  async getTierSchedules(tier: LeagueTiers) {
    const duels = await this.leagueDuelsRepository.find({
      where: {
        tierId: tier.id,
      },
      relations: {
        user1: true,
        user2: true,
        competition: true,
      },
    })
    return duels
  }

  async getWeekSchedules(season: LeagueSeasons, competition: Competitions, user?: Users) {
    const schedules = await this.getSchedules(season, user)
    schedules.forEach(s => {
      s.schedules = s.schedules.filter(s => s.competitionId === competition.id)
    })
    return schedules
  }

  async loadDuelsResults(schedules: { tier: LeagueTiers; schedules: LeagueDuels[] }[], user?: Users) {
    if (schedules.length === 0) {
      return
    }
    const results = await this.resultsRepository.find({
      where: {
        competitionId: In(schedules[0].schedules.map(d => d.competitionId)),
      },
    })
    const resultMap = results.reduce(
      (acc, result) => {
        acc[result.competitionId] = acc[result.competitionId] || {}
        acc[result.competitionId][result.userId] = result
        return acc
      },
      {} as Record<number, Record<number, Results>>,
    )
    const duels = schedules.flatMap(s => s.schedules)
    for (const duel of duels) {
      duel.user1Result = resultMap[duel.competitionId]?.[duel.user1Id]
      duel.user2Result = resultMap[duel.competitionId]?.[duel.user2Id]
      if (duel.competition.hasStarted && !duel.competition.hasEnded) {
        let count = 0
        let solvedAttempts: Record<number, boolean> = {}
        if (user) {
          // fetch user results first
          const userResult = resultMap[duel.competitionId]?.[user.id]
          count = userResult?.values.filter(v => v > 0).length || 0
          solvedAttempts =
            userResult?.values.reduce(
              (acc, v, i) => {
                acc[i] = v > 0
                return acc
              },
              {} as Record<number, boolean>,
            ) || {}
        }
        if (count > 0) {
          // hide results if not all solves are submitted
          if (count < 3) {
            if (duel.user1Id === user.id) {
              duel.user2Result = null
            }
            if (duel.user2Id === user.id) {
              duel.user1Result = null
            }
            if (duel.user1Result) {
              duel.user1Result.values = duel.user1Result.values.map((v, i) => (solvedAttempts[i] ? v : 0))
            }
            if (duel.user2Result) {
              duel.user2Result.values = duel.user2Result.values.map((v, i) => (solvedAttempts[i] ? v : 0))
            }
          }
          // calculate partial points and sets
          if (duel.user1Result && duel.user2Result) {
            let user1Points = 0
            let user2Points = 0
            for (let i = 0; i < count; i++) {
              if (duel.user1Result.values[i] === 0 || duel.user2Result.values[i] === 0) {
                continue
              }
              if (betterThan(duel.user1Result.values[i], duel.user2Result.values[i])) {
                user1Points++
              } else if (betterThan(duel.user2Result.values[i], duel.user1Result.values[i])) {
                user2Points++
              } else {
                user1Points += 0.5
                user2Points += 0.5
              }
            }
            duel.user1Points = user1Points
            duel.user2Points = user2Points
          }
        } else {
          duel.user1Result = null
          duel.user2Result = null
        }
      }
    }
    return duels
  }

  async getMappedDuels(competition: Competitions) {
    const duels = await this.getWeekDuels(competition)
    const ret: Record<number, LeagueDuels> = {}
    for (const duel of duels) {
      ret[duel.user1Id] = ret[duel.user2Id] = duel
    }
    return ret
  }

  async getWeekDuels(competition: Competitions) {
    return this.leagueDuelsRepository.find({
      where: {
        competitionId: competition.id,
      },
      relations: {
        user1: true,
        user2: true,
      },
    })
  }

  async getWeekDuel(competition: Competitions, user: Users) {
    return this.leagueDuelsRepository.findOne({
      where: [
        {
          competitionId: competition.id,
          user1Id: user.id,
        },
        {
          competitionId: competition.id,
          user2Id: user.id,
        },
      ],
      relations: {
        user1: true,
        user2: true,
      },
    })
  }

  async getStatistics(season: LeagueSeasons) {
    return this.leagueStandingsRepository.find({
      where: {
        seasonId: season.id,
      },
    })
  }

  async submitSolution(competition: Competitions, user: Users, solution: SubmitSolutionDto) {
    if (competition.hasEnded) {
      throw new BadRequestException('Competition has ended')
    }
    const player = await this.leaguePlayersRepository.findOne({
      where: {
        userId: user.id,
        seasonId: competition.leagueSeasonId,
      },
    })
    return await this.submissionsRepository.manager.transaction(async manager => {
      const scramble = await manager.findOne(Scrambles, {
        where: {
          id: solution.scrambleId,
          competitionId: competition.id,
        },
        lock: { mode: 'pessimistic_write' },
      })
      if (scramble === null) {
        throw new BadRequestException('Invalid scramble')
      }
      const preSubmission = await manager.findOne(Submissions, {
        where: {
          scrambleId: scramble.id,
          userId: user.id,
        },
      })
      if (preSubmission !== null) {
        throw new BadRequestException('You have already submitted a solution')
      }
      solution.mode = player ? CompetitionMode.REGULAR : CompetitionMode.UNLIMITED
      const submission = await this.competitionService.createSubmission(competition, scramble, user, solution)
      let result = await manager.findOne(Results, {
        where: {
          competitionId: competition.id,
          userId: user.id,
        },
      })
      if (result === null) {
        result = new Results()
        result.mode = solution.mode
        result.competition = competition
        result.user = user
        result.values = competition.scrambles.map(() => 0)
        result.best = 0
        result.average = 0
        await manager.save(result)
      }
      submission.result = result
      await manager.save(submission)
      result.values[scramble.number - 1] = submission.moves
      const nonZeroValues = result.values.filter(value => value > 0)
      result.best = Math.min(...nonZeroValues)
      result.average = Math.round(nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length)
      if (result.values.some(v => v === DNF || v === DNS)) {
        result.average = DNF
      }
      await manager.save(result)
      return submission
    })
  }

  async adminAddSubmission(scrambleId: number, userId: number, solution: string, comment: string) {
    const scramble = await this.scramblesRepository.findOne({
      where: { id: scrambleId },
      relations: { competition: { scrambles: true } },
    })
    if (!scramble?.competition?.leagueSeasonId) {
      throw new BadRequestException('Invalid scramble or not a league competition')
    }
    // only allowed for ended competitions
    if (!scramble?.competition?.hasEnded) {
      throw new BadRequestException('Competition has not ended')
    }
    const user = await this.userService.findOne(userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }
    const existing = await this.submissionsRepository.findOne({
      where: { scrambleId, userId },
    })
    // only allowed to add or change DNF submissions
    if (existing && existing.moves !== DNF) {
      throw new BadRequestException('User already has a solution for this scramble')
    }
    const competition = scramble.competition
    const season = await this.leagueSeasonsRepository.findOne({
      where: { id: competition.leagueSeasonId },
    })
    if (!season) {
      throw new BadRequestException('Season not found')
    }
    // remove previous submission
    if (existing) {
      await this.submissionsRepository.remove(existing)
    }
    const player = await this.getPlayer(season, user)
    const mode = player ? CompetitionMode.REGULAR : CompetitionMode.UNLIMITED
    const moves = calculateMoves(scramble.scramble, solution)
    const solutionDto: SubmitSolutionDto = {
      scrambleId,
      mode,
      solution,
      comment: comment ?? '',
    }
    const submission = await this.competitionService.createSubmission(competition, scramble, user, solutionDto, {
      moves,
    })
    let result = await this.resultsRepository.findOne({
      where: { competitionId: competition.id, userId: user.id },
    })
    if (!result) {
      result = new Results()
      result.mode = mode
      result.competition = competition
      result.user = user
      result.values = competition.scrambles.map(() => 0)
      result.best = 0
      result.average = 0
      await this.resultsRepository.save(result)
    }
    submission.result = result
    await this.submissionsRepository.save(submission)
    result.values[scramble.number - 1] = submission.moves
    const nonZeroValues = result.values.filter(value => value > 0)
    result.best = nonZeroValues.length ? Math.min(...nonZeroValues) : 0
    result.average =
      nonZeroValues.length > 0 ? Math.round(nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length) : 0
    if (result.values.some(v => v === DNF || v === DNS)) {
      result.average = DNF
    }
    await this.resultsRepository.save(result)
    if (mode === CompetitionMode.REGULAR) {
      // update other results (unlimited mode)
      let unlimitedResult = await this.resultsRepository.findOne({
        where: { competitionId: competition.id, userId: user.id, mode: CompetitionMode.UNLIMITED },
      })
      if (!unlimitedResult) {
        unlimitedResult = new Results()
        unlimitedResult.mode = CompetitionMode.UNLIMITED
        unlimitedResult.competitionId = competition.id
        unlimitedResult.userId = user.id
        unlimitedResult.user = user
        unlimitedResult.values = [...result.values]
        unlimitedResult.best = result.best
        unlimitedResult.average = result.average
      } else {
        unlimitedResult.values = [...result.values]
        unlimitedResult.best = result.best
        unlimitedResult.average = result.average
      }
      await this.resultsRepository.save(unlimitedResult)
      // only recalculate points for participants (regular mode)
      await this.recalculatePointsForCompetition(competition, user.id)
    }
    return submission
  }

  async recalculatePointsForCompetition(competition: Competitions, userId: number) {
    const season = await this.leagueSeasonsRepository.findOne({
      where: { id: competition.leagueSeasonId },
    })
    if (!season) {
      return
    }
    const duel = await this.leagueDuelsRepository.findOne({
      where: [
        { competitionId: competition.id, user1Id: userId },
        { competitionId: competition.id, user2Id: userId },
      ],
      relations: { user1: true, user2: true, competition: true },
    })
    if (!duel) {
      return
    }
    // bye player: no opponent, no points to calculate (ELO is handled separately)
    if (!duel.user1 || !duel.user2) {
      return
    }
    const standings = await this.getStandings(season)
    const mappedStandings = Object.fromEntries(standings.map(s => [s.userId, s]))
    const affectedUserIds = [duel.user1Id, duel.user2Id]
    const existingLeagueResults = await this.leagueResultsRepository.find({
      where: { competitionId: competition.id, userId: In(affectedUserIds) },
    })
    const resultsByUser = Object.fromEntries(existingLeagueResults.map(r => [r.userId, r]))
    const r1 = resultsByUser[duel.user1Id]
    const r2 = resultsByUser[duel.user2Id]
    const s1 = mappedStandings[duel.user1Id]
    const s2 = mappedStandings[duel.user2Id]
    if (s1 && r1) {
      s1.points -= r1.points
      if (r1.points === 2) s1.wins--
      else if (r1.points === 1) s1.draws--
      if (r2?.points === 2) s1.losses--
    }
    if (s2 && r2) {
      s2.points -= r2.points
      if (r2.points === 2) s2.wins--
      else if (r2.points === 1) s2.draws--
      if (r1?.points === 2) s2.losses--
    }
    await this.leagueResultsRepository.delete({
      competitionId: competition.id,
      userId: In(affectedUserIds),
    })
    duel.user1Points = 0
    duel.user2Points = 0
    const competitionResults = await this.resultsRepository.find({
      where: {
        competitionId: competition.id,
        userId: In(affectedUserIds),
        mode: CompetitionMode.REGULAR,
      },
    })
    const playerResults = Object.fromEntries(competitionResults.map(r => [r.userId, r]))
    duel.user1Result = playerResults[duel.user1Id]
    duel.user2Result = playerResults[duel.user2Id]
    const leagueResults: LeagueResults[] = []
    this.calculateDuelPoints(duel, mappedStandings, leagueResults)
    console.log('duel', duel)
    console.log('leagueResults', leagueResults)
    // set competition status to ongoing so the cronjob will calculate the rankings
    competition.status = CompetitionStatus.ON_GOING
    await this.leagueDuelsRepository.manager.transaction(async em => {
      await em.save(duel)
      await em.save(standings)
      await em.save(leagueResults)
      await em.save(competition)
    })
    await this.updateAllStandingsRanksings(season)
  }

  async update(
    competition: Competitions,
    user: Users,
    id: number,
    solution: Pick<SubmitSolutionDto, 'comment' | 'attachments'>,
  ) {
    return await this.competitionService.updateUserSubmission(competition, user, id, solution, [
      'comment',
      'attachments',
    ])
  }

  async calculatePoints(competition: Competitions) {
    const season = await this.leagueSeasonsRepository.findOne({
      where: {
        id: competition.leagueSeasonId,
      },
    })
    const duels = await this.leagueDuelsRepository.find({
      where: {
        seasonId: season.id,
      },
      relations: {
        user1: true,
        user2: true,
        competition: true,
      },
    })
    const competitionResults = await this.resultsRepository.find({
      where: {
        competitionId: competition.id,
      },
    })
    const playerResults = Object.fromEntries(competitionResults.map(r => [r.userId, r]))
    const standings = await this.getStandings(season)
    const mappedStandings = Object.fromEntries(standings.map(s => [s.userId, s]))
    const leagueResults: LeagueResults[] = []
    for (const duel of duels) {
      if (!duel.competition.hasEnded) {
        continue
      }
      // bye player: no points are awarded (ELO is still calculated in calculateElos)
      if (duel.user1 === null || duel.user2 === null) {
        continue
      }
      // if points are already set, skip
      if (duel.ended) {
        continue
      }
      duel.user1Result = playerResults[duel.user1Id]
      duel.user2Result = playerResults[duel.user2Id]
      this.calculateDuelPoints(duel, mappedStandings, leagueResults)
    }

    const tierMappedStandings: Record<number, LeagueStandings[]> = {}
    for (const standing of standings) {
      tierMappedStandings[standing.tierId] = tierMappedStandings[standing.tierId] || []
      tierMappedStandings[standing.tierId].push(standing)
    }
    for (const standings of Object.values(tierMappedStandings)) {
      this.updateStandingRanks(standings, duels)
    }

    // start a transaction
    await this.leagueDuelsRepository.manager.transaction(async transactionalEntityManager => {
      await transactionalEntityManager.save(duels)
      await transactionalEntityManager.save(standings)
      await transactionalEntityManager.save(leagueResults)
    })
  }

  async updateAllStandingsRanksings(season: LeagueSeasons) {
    const standings = await this.getStandings(season)
    const tierMappedStandings: Record<number, LeagueStandings[]> = {}
    for (const standing of standings) {
      tierMappedStandings[standing.tierId] = tierMappedStandings[standing.tierId] || []
      tierMappedStandings[standing.tierId].push(standing)
    }
    for (const standings of Object.values(tierMappedStandings)) {
      const duels = await this.getTierSchedules(standings[0].tier)
      this.updateStandingRanks(standings, duels)
      await this.leagueStandingsRepository.save(standings)
    }
    return standings
  }

  updateStandingRanks(standings: LeagueStandings[], duels: LeagueDuels[]) {
    standings.sort((a, b) => b.points - a.points)
    // find small tables
    const pointsMappedStandings: Record<number, LeagueStandings[]> = {}
    for (const [i, standing] of standings.entries()) {
      // set initial rank
      standing.position = i + 1
      pointsMappedStandings[standing.points] = pointsMappedStandings[standing.points] || []
      pointsMappedStandings[standing.points].push(standing)
    }
    for (const smallTables of Object.values(pointsMappedStandings)) {
      const count = smallTables.length
      if (count === 1) {
        continue
      }
      const smallTablePoints = Object.fromEntries(smallTables.map(s => [s.userId, 0]))
      const minPosition = smallTables[0].position
      // check all head to head
      for (let i = 0; i < count - 1; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = smallTables[i]
          const b = smallTables[j]
          // find duel between a and b
          const duel = duels.find(
            d =>
              // a vs b
              (d.user1Id === a.userId && d.user2Id === b.userId) ||
              // or b vs a
              (d.user1Id === b.userId && d.user2Id === a.userId),
          )
          if (!duel) {
            continue
          }
          const aPoints = duel.getUserPoints(a.user)
          const bPoints = duel.getUserPoints(duel.getOpponent(a.user))
          if (aPoints > bPoints) {
            smallTablePoints[a.userId] += 2
          } else if (aPoints < bPoints) {
            smallTablePoints[b.userId] += 2
          } else {
            smallTablePoints[a.userId] += 1
            smallTablePoints[b.userId] += 1
          }
        }
      }
      // sort in small tables
      smallTables.sort((a, b) => {
        if (smallTablePoints[a.userId] !== smallTablePoints[b.userId]) {
          return smallTablePoints[b.userId] - smallTablePoints[a.userId]
        }
        if (a.wins != b.wins) {
          return b.wins - a.wins
        }
        if (a.bestMo3 != b.bestMo3) {
          if (a.bestMo3 === 0) {
            return 1
          }
          if (b.bestMo3 === 0) {
            return -1
          }
          return a.bestMo3 - b.bestMo3
        }
      })
      smallTables.forEach((s, i) => (s.position = minPosition + i))
    }
  }

  calculateDuelPoints(
    duel: LeagueDuels,
    mappedStandings: Record<number, LeagueStandings>,
    leagueResults: LeagueResults[],
  ) {
    const result1 = duel.user1Result?.values || [DNS, DNS, DNS]
    const result2 = duel.user2Result?.values || [DNS, DNS, DNS]
    let user1Points = 0
    let user2Points = 0
    for (let i = 0; i < 3; i++) {
      if (betterThan(result1[i], result2[i])) {
        user1Points++
      } else if (betterThan(result2[i], result1[i])) {
        user2Points++
      } else {
        user1Points += 0.5
        user2Points += 0.5
      }
    }
    duel.user1Points = user1Points
    duel.user2Points = user2Points
    const user1Standing = mappedStandings[duel.user1Id]
    const user2Standing = mappedStandings[duel.user2Id]
    const week = parseInt(duel.competition.alias.split('-').pop() || '0', 10)
    const user1Result = new LeagueResults()
    user1Result.userId = duel.user1Id
    user1Result.seasonId = duel.seasonId
    user1Result.competitionId = duel.competitionId
    user1Result.week = week
    const user2Result = new LeagueResults()
    user2Result.userId = duel.user2Id
    user2Result.seasonId = duel.seasonId
    user2Result.competitionId = duel.competitionId
    user2Result.week = week
    // win 2 points, draw 1 point, loss 0 point
    if (user1Points > user2Points) {
      user1Standing.points += 2
      user1Standing.wins++
      user2Standing.losses++
      user1Result.points = 2
    } else if (user1Points < user2Points) {
      user2Standing.points += 2
      user2Standing.wins++
      user1Standing.losses++
      user2Result.points = 2
    } else {
      user1Standing.points++
      user2Standing.points++
      user1Standing.draws++
      user2Standing.draws++
      user1Result.points = 1
      user2Result.points = 1
    }
    if (
      duel.user1Result?.average > 0 &&
      (duel.user1Result?.average < user1Standing.bestMo3 || user1Standing.bestMo3 === 0)
    ) {
      user1Standing.bestMo3 = duel.user1Result.average
    }
    if (
      duel.user2Result?.average > 0 &&
      (duel.user2Result?.average < user2Standing.bestMo3 || user2Standing.bestMo3 === 0)
    ) {
      user2Standing.bestMo3 = duel.user2Result.average
    }
    leagueResults.push(user1Result, user2Result)
  }

  async calculateElos(competition: Competitions) {
    const season = await this.leagueSeasonsRepository.findOne({
      where: { id: competition.leagueSeasonId },
    })
    if (!season) return

    const week = parseInt(competition.alias.split('-').pop() || '0', 10)

    // Revert any existing ELO changes for this competition (idempotent)
    const existingHistories = await this.leagueEloHistoriesRepository.find({
      where: { competitionId: competition.id },
    })
    if (existingHistories.length > 0) {
      const affectedUserIds = existingHistories.map(h => h.userId)
      const affectedElos = await this.leagueElosRepository.find({
        where: { userId: In(affectedUserIds) },
      })
      for (const elo of affectedElos) {
        const history = existingHistories.find(h => h.userId === elo.userId)
        if (history) {
          elo.points -= history.delta
        }
      }
      await this.leagueElosRepository.save(affectedElos)
      await this.leagueEloHistoriesRepository.delete({ competitionId: competition.id })
    }

    // Get all league players for this season
    const leaguePlayers = await this.leaguePlayersRepository.find({
      where: { seasonId: season.id },
    })
    const leaguePlayerUserIds = leaguePlayers.map(p => p.userId)

    if (leaguePlayerUserIds.length < 2) return

    // Get results for this competition
    const results = await this.resultsRepository.find({
      where: { competitionId: competition.id },
    })
    const resultMap = Object.fromEntries(
      results.filter(r => leaguePlayerUserIds.includes(r.userId)).map(r => [r.userId, r]),
    )

    // Get current ELOs for all league players
    const currentElos = await this.leagueElosRepository.find({
      where: { userId: In(leaguePlayerUserIds) },
    })
    const eloMap = Object.fromEntries(currentElos.map(e => [e.userId, e]))

    // Build parallel arrays — include ALL league players, DNS for missing
    const playerUserIds: number[] = []
    const eloList: number[] = []
    const solvesList: number[][] = []

    for (const userId of leaguePlayerUserIds) {
      const result = resultMap[userId]
      const values = result ? result.values.map(v => (v === 0 ? DNS : v)) : [DNS, DNS, DNS]
      playerUserIds.push(userId)
      eloList.push(eloMap[userId]?.points ?? DEFAULT_ELO)
      solvesList.push(values)
    }

    // Calculate virtual round-robin scores and new ELOs
    const scoreList = calculateScores(solvesList)
    const newEloList = updateElo(eloList, scoreList)

    // Prepare entities
    const eloEntities: LeagueElos[] = []
    const historyEntities: LeagueEloHistories[] = []

    for (let i = 0; i < playerUserIds.length; i++) {
      const userId = playerUserIds[i]
      const oldElo = eloList[i]
      const newElo = newEloList[i]

      let elo = eloMap[userId]
      if (!elo) {
        elo = new LeagueElos()
        elo.userId = userId
      }
      elo.points = newElo
      eloEntities.push(elo)

      const history = new LeagueEloHistories()
      history.seasonId = season.id
      history.competitionId = competition.id
      history.week = week
      history.userId = userId
      history.points = newElo
      history.delta = newElo - oldElo
      historyEntities.push(history)
    }

    await this.leagueElosRepository.manager.transaction(async em => {
      await em.save(eloEntities)
      await em.save(historyEntities)
    })
  }
}
