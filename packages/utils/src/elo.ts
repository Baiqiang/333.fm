import { betterThan } from './result'

export const DEFAULT_ELO = 1000

export interface MatchResult {
  player1Score: number
  player2Score: number
}

export function calculateMatch(player1: number[], player2: number[]): MatchResult {
  let score1 = 0
  for (let i = 0; i < player1.length; i++) {
    if (betterThan(player1[i], player2[i])) {
      score1 += 1
    } else if (!betterThan(player2[i], player1[i])) {
      score1 += 0.5
    }
  }

  const half = player1.length / 2
  if (score1 > half) return { player1Score: 1, player2Score: 0 }
  if (score1 === half) return { player1Score: 0.5, player2Score: 0.5 }
  return { player1Score: 0, player2Score: 1 }
}

export function calculateScores(solvesList: number[][]): number[] {
  const scoreList = new Array(solvesList.length).fill(0)

  for (let i = 0; i < solvesList.length; i++) {
    for (let j = i + 1; j < solvesList.length; j++) {
      const { player1Score, player2Score } = calculateMatch(solvesList[i], solvesList[j])
      scoreList[i] += player1Score
      scoreList[j] += player2Score
    }
  }

  if (solvesList.length <= 1) return scoreList

  const coeff = 1 / (solvesList.length - 1)
  return scoreList.map(score => coeff * score)
}

export function updateElo(eloList: number[], scoreList: number[], k = 10): number[] {
  const numberOfOpponents = eloList.length - 1
  if (numberOfOpponents === 0) return [...eloList]

  const sumElos = eloList.reduce((a, b) => a + b, 0)
  const newEloList: number[] = []

  for (let i = 0; i < eloList.length; i++) {
    const playerElo = eloList[i]
    const avgOpponentElo = (sumElos - playerElo) / numberOfOpponents
    const expectedScore = 1 / (1 + Math.pow(10, (avgOpponentElo - playerElo) / 400))
    const newElo = Math.trunc(playerElo + k * (scoreList[i] - expectedScore) * numberOfOpponents)
    newEloList.push(newElo)
  }

  return newEloList
}
