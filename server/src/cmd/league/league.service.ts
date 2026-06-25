import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, LessThan, Not, Repository } from 'typeorm'
import XLSX from 'xlsx'

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
import { betterThan, calculateMoves, setRanks } from '@/utils'
import { calculateScores, DEFAULT_ELO, updateElo } from '@/utils/elo-calculator'

const { encode_col: encodeCol } = XLSX.utils
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000
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
    @InjectRepository(Competitions)
    private readonly competitionsRepository: Repository<Competitions>,
    @InjectRepository(Scrambles)
    private readonly scramblesRepository: Repository<Scrambles>,
    @InjectRepository(Submissions)
    private readonly submissionsRepository: Repository<Submissions>,
    @InjectRepository(Results)
    private readonly resultsRepository: Repository<Results>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async import(filename: string, seasonNumber: number, startDate: string) {
    // read from xlsx file
    const xlsx = await XLSX.readFile(filename)
    const scrambleSheetName = xlsx.SheetNames.find(s => s.toLowerCase().includes('scramble'))
    const standingsSheetName = xlsx.SheetNames.find(s => s.toLowerCase().includes('standings'))
    const scrambleSheet = xlsx.Sheets[scrambleSheetName]
    const standingsSheet = xlsx.Sheets[standingsSheetName]
    if (!scrambleSheet || !standingsSheet) {
      console.log('Failed to find scrambles or standings')
      return
    }
    const queryRunner = this.leagueSeasonsRepository.manager.connection.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      let weeks = 9
      const season = new LeagueSeasons()
      season.number = Number(seasonNumber)
      season.status = LeagueSeasonStatus.ENDED
      season.startTime = new Date(`${startDate} 18:00:00`)
      // 9 weeks for default
      season.endTime = new Date(season.startTime.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)
      await queryRunner.manager.save(season)
      // get all players from standings sheet
      let row = 2
      const tiers: LeagueTiers[] = []
      const standings: Record<string, LeagueStandings> = {}
      const userMap: Record<string, Users> = {}
      // make users map from live sheet
      const liveSheetName = xlsx.SheetNames.find(s => s.toLowerCase().includes('live'))
      const liveSheet = xlsx.Sheets[liveSheetName]
      if (liveSheet) {
        while (true) {
          const cell = liveSheet[`A${row}`]
          if (!cell || !cell.v) {
            break
          }
          const wcaId = liveSheet[`B${row}`].v
          let user = await this.usersRepository.findOne({ where: { wcaId, source: Not('MERGED') } })
          if (!user) {
            console.warn('User not found for live', wcaId, cell.v)
            user = this.createUser(wcaId.toUpperCase(), cell.v)
            await queryRunner.manager.save(user)
          }
          userMap[wcaId] = user
          // names map
          userMap[cell.v.toLowerCase()] = user
          row++
        }
      }
      row = 1
      while (true) {
        const cell = standingsSheet[`B${row}`]
        if (!cell || !cell.v || cell.v.includes('Seed')) {
          break
        }
        const tier = new LeagueTiers()
        tier.level = parseInt(standingsSheet[`A${row}`].v.split(' ')[1])
        tier.seasonId = season.id
        await queryRunner.manager.save(tier)
        tiers.push(tier)
        tier.players = []
        let i = 1
        for (; ; i++) {
          const nameCell = standingsSheet[`B${row + i}`]
          if (!nameCell || !nameCell.v) {
            weeks = tier.players.length - 1
            // console.log(tier.id, tier.level, weeks)
            break
          }
          // const wcaId = standingsSheet[`C${row + i}`].v
          // const user = await this.usersRepository.findOne({ where: { wcaId, source: Not('MERGED') } })
          const user = userMap[nameCell.v.toLowerCase()]
          if (!user) {
            console.error('User not found for standings', nameCell.v, row + i)
            return
          }
          userMap[nameCell.v] = user
          userMap[user.wcaId] = user
          const standing = new LeagueStandings()
          standing.seasonId = season.id
          standing.tierId = tier.id
          standing.userId = user.id
          standing.user = user
          standing.position = i
          standing.points = standingsSheet[`D${row + i}`].v
          standing.wins = standingsSheet[`E${row + i}`].v
          standing.draws = standingsSheet[`F${row + i}`].v
          standing.losses = standingsSheet[`G${row + i}`].v
          let bestMo3 = standingsSheet[`H${row + i}`].v
          if (bestMo3 === 'DNF') {
            bestMo3 = DNF
          } else {
            bestMo3 = parseFloat(bestMo3) * 100
          }
          standing.bestMo3 = parseInt(bestMo3)
          await queryRunner.manager.save(standing)
          standings[user.wcaId] = standing
          const player = new LeaguePlayers()
          player.userId = user.id
          player.tierId = tier.id
          player.seasonId = season.id
          tier.players.push(player)
          await queryRunner.manager.save(player)
        }
        row += i + 1
      }
      // results of each week
      const competitions: Competitions[] = []
      const scrambles: Scrambles[] = []
      let startTime = new Date(startDate)
      let colOffset = 0
      for (let week = 1; week <= weeks; week++) {
        const competition = new Competitions()
        competition.name = `League S${season.number} Week ${week}`
        competition.alias = `league-${season.number}-${week}`
        competition.leagueSeasonId = season.id
        competition.type = CompetitionType.LEAGUE
        competition.format = CompetitionFormat.MO3
        competition.userId = 1
        competition.status = CompetitionStatus.ON_GOING
        competition.startTime = startTime
        competition.endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000)
        competitions.push(competition)
        let count = 0
        await queryRunner.manager.save(competition)
        startTime = competition.endTime
        const userResults: Record<number, Results> = {}
        for (let attempt = 1; attempt <= 3; attempt++) {
          const sheetName = xlsx.SheetNames.find(s => s.includes(`${week}.${attempt}`))
          if (!sheetName) {
            console.error('Failed to find sheet', week, attempt)
            continue
          }
          // console.log(week, attempt, sheetName)
          const scrambleStr = scrambleSheet[`B${(week - 1) * 3 + attempt + 1}`].v
          const scramble = new Scrambles()
          scramble.number = attempt
          scramble.scramble = scrambleStr
          scramble.competitionId = competition.id
          scrambles.push(scramble)
          await queryRunner.manager.save(scramble)
          const sheet = xlsx.Sheets[sheetName]
          let row = 2
          const cTitle = sheet['C1']?.v
          if (typeof cTitle === 'string' && cTitle.toLowerCase().includes('tier')) {
            colOffset = 1
          }
          if (typeof cTitle === 'number') {
            row = 1
          }
          while (true) {
            const nameCell = sheet[`A${row}`]
            if (!nameCell || !nameCell.v) {
              break
            }
            const wcaID = sheet[`B${row}`].v.toUpperCase()
            const moves = sheet[`${encodeCol(2 + colOffset)}${row}`].v
            const solution = sheet[`${encodeCol(3 + colOffset)}${row}`]?.v || ''
            const comment = sheet[`${encodeCol(4 + colOffset)}${row}`]?.v || ''
            const realMoves = calculateMoves(scrambleStr, solution)
            let valid = true
            if (realMoves / 100 !== moves && moves < 100) {
              valid = false
            }
            let movesCount = parseInt(moves) * 100
            if (!(movesCount < 8000)) {
              movesCount = DNF
            }
            if (moves === 'DNS') {
              movesCount = DNS
            }
            const submission = new Submissions()
            let user = userMap[wcaID]
            if (!user) {
              user = await this.usersRepository.findOne({ where: { wcaId: wcaID, source: Not('MERGED') } })
              if (!user) {
                console.warn('User not found', wcaID, nameCell.v, week, attempt, row)
                user = this.createUser(wcaID, nameCell.v)
                await queryRunner.manager.save(user)
                userMap[wcaID] = user
              }
            }
            submission.mode = CompetitionMode.REGULAR
            if (!userMap[user.wcaId]) {
              submission.mode = CompetitionMode.UNLIMITED
            }
            submission.competitionId = competition.id
            submission.scrambleId = scramble.id
            submission.userId = user.id
            submission.moves = movesCount
            // console.log(user.id, week, attempt, user.name, solution)
            submission.solution = solution
            submission.comment = comment
            submission.verified = valid
            // fake created at
            submission.createdAt = new Date(competition.startTime.getTime() + 3.5 * 86400 * 1000 + count * 1000)
            count++
            const result = userResults[user.id] || new Results()
            if (!userResults[user.id]) {
              result.mode = submission.mode
              result.competitionId = competition.id
              result.userId = user.id
              result.values = [0, 0, 0]
              result.best = 0
              result.average = 0
              userResults[user.id] = result
            }
            result.values[attempt - 1] = movesCount
            await queryRunner.manager.save(result)
            // link result to submission
            submission.resultId = result.id
            await queryRunner.manager.save(submission)
            row++
          }
        }
      }

      // schedules
      const scheduleSheetName = xlsx.SheetNames.find(s => s.toLowerCase().includes('schedule'))
      const scheduleSheet = xlsx.Sheets[scheduleSheetName]
      if (!scheduleSheet) {
        console.error('Failed to find schedule')
        return
      }
      const SCHEDULE_TIER_COL = 15
      const SCHEDULE_TIER_ROW = 3 + weeks + 1
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i]
        for (let week = 1; week <= weeks; week++) {
          for (let j = 0; j < weeks / 2; j++) {
            const row = (week - 1) * SCHEDULE_TIER_ROW + j + 1 + 3
            // console.log(
            //   row,
            //   `${XLSX.utils.encode_col(i * SCHEDULE_TIER_COL)}${row}`,
            //   `${XLSX.utils.encode_col(i * SCHEDULE_TIER_COL + SCHEDULE_TIER_COL - 1)}${row}`,
            // )
            const player1Cell = scheduleSheet[`${encodeCol(i * SCHEDULE_TIER_COL)}${row}`]
            const player2Cell = scheduleSheet[`${encodeCol(i * SCHEDULE_TIER_COL + 11)}${row}`]
            const player1 = userMap[player1Cell.v]
            const player2 = userMap[player2Cell.v]
            if (!player1 || !player2) {
              console.error('Player not found', player1Cell.v, player2Cell.v, !player1, !player2)
              continue
            }
            const duel = new LeagueDuels()
            duel.seasonId = season.id
            duel.competitionId = competitions[week - 1].id
            duel.tierId = tier.id
            duel.user1Id = player1.id
            duel.user2Id = player2.id
            duel.user1Points = scheduleSheet[`${encodeCol(i * SCHEDULE_TIER_COL + 4)}${row}`].v
            duel.user2Points = scheduleSheet[`${encodeCol(i * SCHEDULE_TIER_COL + 7)}${row}`].v
            await queryRunner.manager.save(duel)
            // user results
            const user1Result = new LeagueResults()
            user1Result.userId = player1.id
            user1Result.seasonId = season.id
            user1Result.competitionId = competitions[week - 1].id
            user1Result.week = week
            const user2Result = new LeagueResults()
            user2Result.userId = player2.id
            user2Result.seasonId = season.id
            user2Result.competitionId = competitions[week - 1].id
            user2Result.week = week
            if (duel.user1Points > duel.user2Points) {
              user1Result.points = 2
            } else if (duel.user1Points < duel.user2Points) {
              user2Result.points = 2
            } else {
              user1Result.points = 1
              user2Result.points = 1
            }
            await queryRunner.manager.save(user1Result)
            await queryRunner.manager.save(user2Result)
          }
        }
      }
      // elo
      const eloSheetName = xlsx.SheetNames.find(s => s.toLowerCase().includes('elo'))
      const eloSheet = xlsx.Sheets[eloSheetName]
      if (eloSheet) {
        row = 2
        while (true) {
          const wcaIdCell = eloSheet[`B${row}`]
          if (!wcaIdCell || !wcaIdCell.v) {
            break
          }
          const user = userMap[wcaIdCell.v]
          if (!user) {
            console.error('User not found', wcaIdCell.v)
            continue
          }
          let lastElo: LeagueEloHistories | null = null
          let userElo = await this.leagueElosRepository.findOne({ where: { userId: user.id } })
          if (!userElo) {
            userElo = new LeagueElos()
            userElo.userId = user.id
            userElo.points = 0
          }
          for (let i = 0; i < weeks; i++) {
            const eloCell = eloSheet[`${encodeCol(i + 2)}${row}`]
            const elo = eloCell.v
            const eloHistory = new LeagueEloHistories()
            eloHistory.seasonId = season.id
            eloHistory.competitionId = competitions[i].id
            eloHistory.week = i + 1
            eloHistory.userId = user.id
            eloHistory.points = elo
            eloHistory.delta = lastElo ? elo - lastElo.points : 0
            lastElo = eloHistory
            userElo.points = elo
            await queryRunner.manager.save(eloHistory)
          }
          await queryRunner.manager.save(userElo)
          row++
        }
      }
      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      console.error(error)
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  createUser(wcaId: string, name: string) {
    const user = new Users()
    user.wcaId = wcaId
    user.name = name
    user.email = `${wcaId}@333.fm`
    user.source = 'WCA'
    user.sourceId = wcaId
    user.avatar = ''
    user.avatarThumb = ''
    return user
  }

  async dnfResult(seasonNumber: number, week: number, userRef: string) {
    const season = await this.leagueSeasonsRepository.findOne({ where: { number: seasonNumber } })
    if (!season) {
      console.error(`Season S${seasonNumber} not found`)
      return
    }
    const competition = await this.competitionsRepository.findOne({
      where: { alias: `league-${season.number}-${week}` },
    })
    if (!competition) {
      console.error(`Competition for S${season.number} Week ${week} not found`)
      return
    }
    const user = await this.resolveUser(userRef)
    if (!user) {
      console.error(`User ${userRef} not found`)
      return
    }
    const results = await this.resultsRepository.find({
      where: {
        competitionId: competition.id,
        userId: user.id,
      },
    })
    if (results.length === 0) {
      console.error(`No result found for ${user.name} (${user.wcaId || user.id}) in S${season.number} Week ${week}`)
      return
    }
    const submissions = await this.submissionsRepository.find({
      where: {
        competitionId: competition.id,
        userId: user.id,
      },
    })
    for (const submission of submissions) {
      submission.moves = DNF
    }
    for (const result of results) {
      result.values = result.values.map(() => DNF)
      result.updateBestAndAverage()
    }
    await this.submissionsRepository.save(submissions)
    await this.resultsRepository.save(results)
    await this.recalculateCompetitionRanks(competition.id)
    await this.recalculateSeason(season.number)
    console.log(`DNFed ${user.name} (${user.wcaId || user.id}) in S${season.number} Week ${week}`)
  }

  async extendWeek(seasonNumber: number, week: number, extraWeeks = 1) {
    if (!Number.isInteger(extraWeeks) || extraWeeks <= 0) {
      console.error(`Invalid number of weeks to extend: ${extraWeeks}`)
      return
    }
    const season = await this.leagueSeasonsRepository.findOne({ where: { number: seasonNumber } })
    if (!season) {
      console.error(`Season S${seasonNumber} not found`)
      return
    }
    const competitions = await this.competitionsRepository.find({
      where: { leagueSeasonId: season.id },
      order: { startTime: 'ASC', id: 'ASC' },
    })
    const target = competitions.find(competition => competition.alias === `league-${season.number}-${week}`)
    if (!target) {
      console.error(`Competition for S${season.number} Week ${week} not found`)
      return
    }
    // Cannot extend a competition that has already ended
    if (target.hasEnded) {
      console.error(`S${season.number} Week ${week} has already ended, cannot extend`)
      return
    }
    const offset = extraWeeks * ONE_WEEK
    const targetIndex = competitions.indexOf(target)
    // Push the target week's end time back, then shift every subsequent week
    // by the same offset so the schedule stays sequential.
    const toUpdate: Competitions[] = []
    for (let i = targetIndex; i < competitions.length; i++) {
      const competition = competitions[i]
      if (i > targetIndex && competition.startTime) {
        competition.startTime = new Date(competition.startTime.getTime() + offset)
      }
      if (competition.endTime) {
        competition.endTime = new Date(competition.endTime.getTime() + offset)
      }
      toUpdate.push(competition)
    }
    // Extend the season end time as well
    if (season.endTime) {
      season.endTime = new Date(season.endTime.getTime() + offset)
    }
    await this.competitionsRepository.manager.transaction(async em => {
      await em.save(toUpdate)
      await em.save(season)
    })
    console.log(
      `Extended S${season.number} Week ${week} by ${extraWeeks} week(s); ` +
        `new end time: ${target.endTime?.toISOString()}. ` +
        `Shifted ${toUpdate.length - 1} subsequent week(s) and season end time to ${season.endTime?.toISOString()}.`,
    )
  }

  private async resolveUser(userRef: string) {
    if (/^\d+$/.test(userRef)) {
      return this.usersRepository.findOne({ where: { id: Number(userRef) } })
    }
    return this.usersRepository.findOne({ where: { wcaId: userRef.toUpperCase(), source: Not('MERGED') } })
  }

  private async recalculateCompetitionRanks(competitionId: number) {
    const results = await this.resultsRepository.find({
      where: { competitionId },
    })
    const regularResults = results.filter(result => result.mode === CompetitionMode.REGULAR)
    const unlimitedResults = results.filter(result => result.mode === CompetitionMode.UNLIMITED)
    setRanks(regularResults)
    setRanks(unlimitedResults)
    await this.resultsRepository.save(results)
  }

  async recalculateSeason(seasonNumber: number) {
    const season = await this.leagueSeasonsRepository.findOne({ where: { number: seasonNumber } })
    if (!season) {
      console.error(`Season S${seasonNumber} not found`)
      return
    }
    const competitions = await this.competitionsRepository.find({
      where: { leagueSeasonId: season.id },
      order: { startTime: 'ASC', id: 'ASC' },
    })
    let standings = await this.leagueStandingsRepository.find({
      where: { seasonId: season.id },
      relations: { user: true, tier: true },
    })
    if (standings.length === 0) {
      const players = await this.leaguePlayersRepository.find({
        where: { seasonId: season.id },
      })
      standings = await this.leagueStandingsRepository.save(
        players.map(player => {
          const standing = new LeagueStandings()
          standing.seasonId = season.id
          standing.tierId = player.tierId
          standing.userId = player.userId
          return standing
        }),
      )
      standings = await this.leagueStandingsRepository.find({
        where: { seasonId: season.id },
        relations: { user: true, tier: true },
      })
    }
    const duels = await this.leagueDuelsRepository.find({
      where: { seasonId: season.id },
      relations: {
        competition: true,
        user1: true,
        user2: true,
      },
      order: {
        competitionId: 'ASC',
        id: 'ASC',
      },
    })
    standings.forEach(standing => {
      standing.position = 0
      standing.points = 0
      standing.wins = 0
      standing.draws = 0
      standing.losses = 0
      standing.bestMo3 = 0
    })
    duels.forEach(duel => {
      duel.user1Points = 0
      duel.user2Points = 0
    })
    const standingsMap = Object.fromEntries(standings.map(standing => [standing.userId, standing]))
    const leagueResults: LeagueResults[] = []
    for (const competition of competitions) {
      const competitionResults = await this.resultsRepository.find({
        where: {
          competitionId: competition.id,
          mode: CompetitionMode.REGULAR,
        },
      })
      const resultMap = Object.fromEntries(competitionResults.map(result => [result.userId, result]))
      for (const duel of duels) {
        if (duel.competitionId !== competition.id || !duel.competition.hasEnded) {
          continue
        }
        duel.user1Result = resultMap[duel.user1Id]
        duel.user2Result = resultMap[duel.user2Id]
        this.calculateDuelPoints(duel, standingsMap, leagueResults)
      }
    }
    const standingsByTier: Record<number, LeagueStandings[]> = {}
    for (const standing of standings) {
      standingsByTier[standing.tierId] = standingsByTier[standing.tierId] || []
      standingsByTier[standing.tierId].push(standing)
    }
    for (const tierStandings of Object.values(standingsByTier)) {
      this.updateStandingRanks(
        tierStandings,
        duels.filter(duel => duel.tierId === tierStandings[0].tierId && duel.competition.hasEnded),
      )
    }
    await this.leagueStandingsRepository.manager.transaction(async em => {
      await em.save(standings)
      await em.save(duels)
      await em.delete(LeagueResults, { seasonId: season.id })
      await em.save(leagueResults)
    })
    await this.recalculateSeasonElo(
      season,
      competitions.filter(competition => competition.hasEnded),
    )
    console.log(`Recalculated league standings and ELO for S${season.number}`)
  }

  private async recalculateSeasonElo(season: LeagueSeasons, competitions: Competitions[]) {
    await this.leagueEloHistoriesRepository.delete({ seasonId: season.id })
    const players = await this.leaguePlayersRepository.find({ where: { seasonId: season.id } })
    const playerUserIds = [...new Set(players.map(player => player.userId))]
    const previousSeasonIds = (
      await this.leagueSeasonsRepository.find({
        where: { number: LessThan(season.number) },
      })
    ).map(previousSeason => previousSeason.id)
    const eloMap: Record<number, number> = {}
    for (const userId of playerUserIds) {
      if (previousSeasonIds.length > 0) {
        const lastHistory = await this.leagueEloHistoriesRepository.findOne({
          where: { userId, seasonId: In(previousSeasonIds) },
          order: { id: 'DESC' },
        })
        if (lastHistory) {
          eloMap[userId] = lastHistory.points
          continue
        }
      }
      eloMap[userId] = DEFAULT_ELO
    }
    for (const competition of competitions) {
      const week = parseInt(competition.alias.split('-').pop() || '0', 10)
      const results = await this.resultsRepository.find({
        where: { competitionId: competition.id },
      })
      const resultMap = Object.fromEntries(
        results.filter(result => playerUserIds.includes(result.userId)).map(result => [result.userId, result]),
      )
      const weekUserIds: number[] = []
      const weekElos: number[] = []
      const weekSolves: number[][] = []
      for (const userId of playerUserIds) {
        const result = resultMap[userId]
        const values = result ? result.values.map(value => (value === 0 ? DNS : value)) : [DNS, DNS, DNS]
        weekUserIds.push(userId)
        weekElos.push(eloMap[userId] ?? DEFAULT_ELO)
        weekSolves.push(values)
      }
      if (weekUserIds.length < 2) {
        continue
      }
      const scoreList = calculateScores(weekSolves)
      const newEloList = updateElo(weekElos, scoreList)
      const historyEntities: LeagueEloHistories[] = []
      for (let i = 0; i < weekUserIds.length; i++) {
        const userId = weekUserIds[i]
        const oldElo = weekElos[i]
        const newElo = newEloList[i]
        eloMap[userId] = newElo
        const history = new LeagueEloHistories()
        history.seasonId = season.id
        history.competitionId = competition.id
        history.week = week
        history.userId = userId
        history.points = newElo
        history.delta = newElo - oldElo
        historyEntities.push(history)
      }
      await this.leagueEloHistoriesRepository.save(historyEntities)
    }
    for (const userId of playerUserIds) {
      let elo = await this.leagueElosRepository.findOne({ where: { userId } })
      if (!elo) {
        elo = new LeagueElos()
        elo.userId = userId
      }
      elo.points = eloMap[userId] ?? DEFAULT_ELO
      await this.leagueElosRepository.save(elo)
    }
  }

  updateStandingRanks(standings: LeagueStandings[], duels: LeagueDuels[]) {
    standings.sort((a, b) => b.points - a.points)
    const pointsMappedStandings: Record<number, LeagueStandings[]> = {}
    for (const [i, standing] of standings.entries()) {
      standing.position = i + 1
      pointsMappedStandings[standing.points] = pointsMappedStandings[standing.points] || []
      pointsMappedStandings[standing.points].push(standing)
    }
    for (const smallTables of Object.values(pointsMappedStandings)) {
      const count = smallTables.length
      if (count === 1) {
        continue
      }
      const smallTablePoints = Object.fromEntries(smallTables.map(standing => [standing.userId, 0]))
      const minPosition = smallTables[0].position
      for (let i = 0; i < count - 1; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = smallTables[i]
          const b = smallTables[j]
          const duel = duels.find(
            d =>
              (d.user1Id === a.userId && d.user2Id === b.userId) || (d.user1Id === b.userId && d.user2Id === a.userId),
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
      smallTables.sort((a, b) => {
        if (smallTablePoints[a.userId] !== smallTablePoints[b.userId]) {
          return smallTablePoints[b.userId] - smallTablePoints[a.userId]
        }
        if (a.wins !== b.wins) {
          return b.wins - a.wins
        }
        if (a.bestMo3 !== b.bestMo3) {
          if (a.bestMo3 === 0) {
            return 1
          }
          if (b.bestMo3 === 0) {
            return -1
          }
          return a.bestMo3 - b.bestMo3
        }
        return 0
      })
      smallTables.forEach((standing, i) => {
        standing.position = minPosition + i
      })
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
      (duel.user1Result.average < user1Standing.bestMo3 || user1Standing.bestMo3 === 0)
    ) {
      user1Standing.bestMo3 = duel.user1Result.average
    }
    if (
      duel.user2Result?.average > 0 &&
      (duel.user2Result.average < user2Standing.bestMo3 || user2Standing.bestMo3 === 0)
    ) {
      user2Standing.bestMo3 = duel.user2Result.average
    }
    leagueResults.push(user1Result, user2Result)
  }

  async calcualteElo(seasonNumber: number) {
    const season = await this.leagueSeasonsRepository.findOne({ where: { number: seasonNumber } })
    if (!season) {
      console.error('Season not found')
      return
    }

    // Clear existing elo histories for this season
    await this.leagueEloHistoriesRepository.delete({ seasonId: season.id })

    // Get all league players for this season
    const players = await this.leaguePlayersRepository.find({ where: { seasonId: season.id } })
    const playerUserIds = new Set(players.map(p => p.userId))

    // Get starting ELOs from previous seasons only
    const previousSeasonIds = (
      await this.leagueSeasonsRepository.find({
        where: { number: LessThan(season.number) },
      })
    ).map(s => s.id)

    const eloMap: Record<number, number> = {}
    for (const userId of playerUserIds) {
      if (previousSeasonIds.length > 0) {
        const lastHistory = await this.leagueEloHistoriesRepository.findOne({
          where: { userId, seasonId: In(previousSeasonIds) },
          order: { id: 'DESC' },
        })
        if (lastHistory) {
          eloMap[userId] = lastHistory.points
          continue
        }
      }
      eloMap[userId] = DEFAULT_ELO
    }

    // Get all competitions for this season
    const competitions = await this.competitionsRepository.find({
      where: { leagueSeasonId: season.id },
      order: { startTime: 'ASC' },
    })

    // Process each week: use previous ELO + week W's results → store as week W
    for (let w = 1; w <= competitions.length; w++) {
      const comp = competitions.find(c => c.alias === `league-${season.number}-${w}`)
      if (!comp) continue

      const results = await this.resultsRepository.find({
        where: { competitionId: comp.id },
      })
      const resultMap = Object.fromEntries(results.filter(r => playerUserIds.has(r.userId)).map(r => [r.userId, r]))

      const weekUserIds: number[] = []
      const weekElos: number[] = []
      const weekSolves: number[][] = []

      // Include ALL league players, even those without results (DNS for all 3)
      for (const userId of playerUserIds) {
        const result = resultMap[userId]
        const values = result ? result.values.map(v => (v === 0 ? DNS : v)) : [DNS, DNS, DNS]
        weekUserIds.push(userId)
        weekElos.push(eloMap[userId] ?? DEFAULT_ELO)
        weekSolves.push(values)
      }

      if (weekUserIds.length < 2) continue

      const scoreList = calculateScores(weekSolves)
      const newEloList = updateElo(weekElos, scoreList)

      const historyEntities: LeagueEloHistories[] = []
      for (let i = 0; i < weekUserIds.length; i++) {
        const userId = weekUserIds[i]
        const oldElo = weekElos[i]
        const newElo = newEloList[i]
        eloMap[userId] = newElo

        const history = new LeagueEloHistories()
        history.seasonId = season.id
        history.competitionId = comp.id
        history.week = w
        history.userId = userId
        history.points = newElo
        history.delta = newElo - oldElo
        historyEntities.push(history)
      }

      await this.leagueEloHistoriesRepository.save(historyEntities)
      console.log(`Week ${w}: processed ${weekUserIds.length} players`)
    }

    // Update current ELOs in LeagueElos table
    for (const [userIdStr, points] of Object.entries(eloMap)) {
      const userId = Number(userIdStr)
      let elo = await this.leagueElosRepository.findOne({ where: { userId } })
      if (!elo) {
        elo = new LeagueElos()
        elo.userId = userId
      }
      elo.points = points
      await this.leagueElosRepository.save(elo)
    }

    console.log('ELO calculation completed')
  }

  async calculateWeekElo(seasonNumber: number, week: number) {
    const season = await this.leagueSeasonsRepository.findOne({ where: { number: seasonNumber } })
    if (!season) {
      console.error(`Season S${seasonNumber} not found`)
      return
    }

    const comp = await this.competitionsRepository.findOne({
      where: { alias: `league-${season.number}-${week}` },
    })
    if (!comp) {
      console.error(`Competition for S${season.number} Week ${week} not found`)
      return
    }

    // Get league players for this season
    const players = await this.leaguePlayersRepository.find({ where: { seasonId: season.id } })
    const playerUserIds = new Set(players.map(p => p.userId))

    // Delete existing elo history for this week (where results will be stored)
    await this.leagueEloHistoriesRepository.delete({ seasonId: season.id, week })

    // Resolve each player's ELO before this week (from previous week's history)
    const previousSeasonIds = (
      await this.leagueSeasonsRepository.find({
        where: { number: LessThan(season.number) },
      })
    ).map(s => s.id)

    const eloBeforeMap: Record<number, number> = {}
    for (const userId of playerUserIds) {
      // Look for the previous week's ELO in this season
      if (week > 1) {
        const prevHistory = await this.leagueEloHistoriesRepository.findOne({
          where: { userId, seasonId: season.id, week: week - 1 },
        })
        if (prevHistory) {
          eloBeforeMap[userId] = prevHistory.points
          continue
        }
      }
      // Fallback: latest from previous seasons
      if (previousSeasonIds.length > 0) {
        const lastHistory = await this.leagueEloHistoriesRepository.findOne({
          where: { userId, seasonId: In(previousSeasonIds) },
          order: { id: 'DESC' },
        })
        if (lastHistory) {
          eloBeforeMap[userId] = lastHistory.points
          continue
        }
      }
      eloBeforeMap[userId] = DEFAULT_ELO
    }

    // Get results for this competition
    const results = await this.resultsRepository.find({
      where: { competitionId: comp.id },
      relations: { user: true },
    })
    const resultMap = Object.fromEntries(results.filter(r => playerUserIds.has(r.userId)).map(r => [r.userId, r]))

    // Load user names for all league players
    const allUsers = await this.usersRepository.find({ where: { id: In([...playerUserIds]) } })
    const userNameMap = Object.fromEntries(allUsers.map(u => [u.id, u.name]))

    const weekUserIds: number[] = []
    const weekUserNames: string[] = []
    const weekElos: number[] = []
    const weekSolves: number[][] = []

    // Include ALL league players, even those without results (DNS for all 3)
    for (const userId of playerUserIds) {
      const result = resultMap[userId]
      const values = result ? result.values.map(v => (v === 0 ? DNS : v)) : [DNS, DNS, DNS]
      weekUserIds.push(userId)
      weekUserNames.push(userNameMap[userId] ?? `User#${userId}`)
      weekElos.push(eloBeforeMap[userId] ?? DEFAULT_ELO)
      weekSolves.push(values)
    }

    if (weekUserIds.length < 2) {
      console.error(`Not enough players for S${season.number} Week ${week}`)
      return
    }

    const scoreList = calculateScores(weekSolves)
    const newEloList = updateElo(weekElos, scoreList)

    // Save history as current week (ELO after this week's competition)
    const historyEntities: LeagueEloHistories[] = []
    for (let i = 0; i < weekUserIds.length; i++) {
      const userId = weekUserIds[i]
      const oldElo = weekElos[i]
      const newElo = newEloList[i]

      const history = new LeagueEloHistories()
      history.seasonId = season.id
      history.competitionId = comp.id
      history.week = week
      history.userId = userId
      history.points = newElo
      history.delta = newElo - oldElo
      historyEntities.push(history)

      console.log(
        `  ${weekUserNames[i]}: ${oldElo} -> ${newElo} (${newElo - oldElo >= 0 ? '+' : ''}${newElo - oldElo})`,
      )
    }
    await this.leagueEloHistoriesRepository.save(historyEntities)

    // Update LeagueElos: only if this week is the player's latest history entry
    for (let i = 0; i < weekUserIds.length; i++) {
      const userId = weekUserIds[i]
      const laterHistory = await this.leagueEloHistoriesRepository.findOne({
        where: { userId },
        order: { id: 'DESC' },
      })
      if (laterHistory && laterHistory.week === week && laterHistory.seasonId === season.id) {
        let elo = await this.leagueElosRepository.findOne({ where: { userId } })
        if (!elo) {
          elo = new LeagueElos()
          elo.userId = userId
        }
        elo.points = newEloList[i]
        await this.leagueElosRepository.save(elo)
      }
    }

    console.log(`S${season.number} Week ${week}: processed ${weekUserIds.length} players`)
  }

  async importElo(filename: string, seasonNumber: number) {
    const xlsx = XLSX.readFile(filename)
    const eloSheetName = xlsx.SheetNames.find(s => s.toLowerCase().includes('elo'))
    if (!eloSheetName) {
      console.error('ELO sheet not found in file')
      return
    }
    const eloSheet = xlsx.Sheets[eloSheetName]
    const data = XLSX.utils.sheet_to_json(eloSheet, { header: 1 }) as unknown[][]

    const season = await this.leagueSeasonsRepository.findOne({ where: { number: seasonNumber } })
    if (!season) {
      console.error(`Season S${seasonNumber} not found`)
      return
    }

    // Get competitions ordered by week
    const competitions = await this.competitionsRepository.find({
      where: { leagueSeasonId: season.id },
      order: { startTime: 'ASC' },
    })
    if (competitions.length === 0) {
      console.error('No competitions found for this season')
      return
    }
    const weeks = competitions.length

    // Clear existing elo histories for this season
    await this.leagueEloHistoriesRepository.delete({ seasonId: season.id })
    console.log(`Cleared existing ELO histories for S${seasonNumber}`)

    let imported = 0
    let skipped = 0

    for (let row = 1; row < data.length; row++) {
      const rowData = data[row]
      if (!rowData || !rowData[1]) break

      const wcaId = String(rowData[1]).trim()
      const user = await this.usersRepository.findOne({ where: { wcaId, source: Not('MERGED') } })
      if (!user) {
        console.warn(`User not found: ${rowData[0]} (${wcaId}), skipping`)
        skipped++
        continue
      }

      // Check if this player has any ELO values
      const hasElo = Array.from({ length: weeks }, (_, i) => rowData[i + 2]).some(v => typeof v === 'number')
      if (!hasElo) {
        skipped++
        continue
      }

      let userElo = await this.leagueElosRepository.findOne({ where: { userId: user.id } })
      if (!userElo) {
        userElo = new LeagueElos()
        userElo.userId = user.id
        userElo.points = 0
      }

      // Excel layout: W1(initial), W2(after W1), ..., W9(after W8), Final(after W9)
      // W1 is at index 2, so W(n) is at index n+1, Final is at index 2+weeks
      const initialElo = rowData[2]
      let prevElo = typeof initialElo === 'number' ? initialElo : DEFAULT_ELO

      for (let w = 1; w <= weeks; w++) {
        // W2..W(weeks) at indices 3..weeks+1, Final at index 2+weeks
        const eloValue = w < weeks ? rowData[w + 2] : rowData[2 + weeks]
        if (typeof eloValue !== 'number') continue

        const eloHistory = new LeagueEloHistories()
        eloHistory.seasonId = season.id
        eloHistory.competitionId = competitions[w - 1].id
        eloHistory.week = w
        eloHistory.userId = user.id
        eloHistory.points = eloValue
        eloHistory.delta = eloValue - prevElo
        prevElo = eloValue
        await this.leagueEloHistoriesRepository.save(eloHistory)
      }

      userElo.points = prevElo
      await this.leagueElosRepository.save(userElo)
      imported++
      console.log(`  ${rowData[0]} (${wcaId}): final ELO = ${userElo.points}`)
    }

    console.log(`Import completed: ${imported} players imported, ${skipped} skipped`)
  }
}
