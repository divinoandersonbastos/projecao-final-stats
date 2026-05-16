/**
 * Match Quality Service
 * Calculates "Qualidade da Projeção" (0-10) for each fixture
 * using 6 weighted criteria based on Sportmonks aggregated team stats.
 */

import { TeamStats } from './sportmonks-service.js';

// ============================================================
// TYPES
// ============================================================

export interface QualityCriteriaScores {
  dataAvailability: number;     // Peso 20%
  homeAwayCoherence: number;    // Peso 20%
  offensiveVolume: number;      // Peso 25%
  defensiveVolume: number;      // Peso 15%
  competitiveBalance: number;   // Peso 10%
  contextRisk: number;          // Peso 10%
}

export type QualityLabel = 'excellent' | 'good' | 'acceptable' | 'caution' | 'avoid';

export type StatBlock = 'Chutes no gol' | 'Finalizações' | 'Escanteios' | 'Gols' | 'BTTS' | 'Evitar';

export interface MatchQualityResult {
  qualityScore: number;
  qualityLabel: QualityLabel;
  criteria: QualityCriteriaScores;
  bestBlocks: StatBlock[];
  alerts: string[];
  explanation: string;
  projectedStats: ProjectedStats;
}

export interface ProjectedStats {
  totalShots: number;
  totalShotsOnTarget: number;
  totalCorners: number;
  homeGoalsExpected: number;
  awayGoalsExpected: number;
  totalGoalsExpected: number;
  homeDangerousAttacks: number;
  awayDangerousAttacks: number;
}

export interface FixtureContext {
  isKnockout: boolean;
  isFriendly: boolean;
  isPreseason: boolean;
  leagueType: 'league' | 'cup' | 'friendly' | 'unknown';
  round?: string;
}

// ============================================================
// WEIGHTS
// ============================================================

const WEIGHTS = {
  dataAvailability: 0.20,
  homeAwayCoherence: 0.20,
  offensiveVolume: 0.25,
  defensiveVolume: 0.15,
  competitiveBalance: 0.10,
  contextRisk: 0.10,
};

// ============================================================
// CLASSIFICATION
// ============================================================

export function getQualityLabel(score: number): QualityLabel {
  if (score >= 8.0) return 'excellent';
  if (score >= 7.0) return 'good';
  if (score >= 6.0) return 'acceptable';
  if (score >= 5.0) return 'caution';
  return 'avoid';
}

export function getQualityLabelText(label: QualityLabel): string {
  switch (label) {
    case 'excellent': return 'Excelente para projeção';
    case 'good': return 'Boa para projeção';
    case 'acceptable': return 'Aceitável';
    case 'caution': return 'Cuidado';
    case 'avoid': return 'Evitar análise automática';
  }
}

// ============================================================
// CRITERION 1: DATA AVAILABILITY (20%)
// ============================================================

export function calculateDataAvailability(homeStats: TeamStats | null, awayStats: TeamStats | null): number {
  if (!homeStats || !awayStats) return 0;

  const homeGames = homeStats.gamesPlayed;
  const awayGames = awayStats.gamesPlayed;

  // Check if key metrics are available
  const homeHasShots = homeStats.shotsAvg > 0;
  const awayHasShots = awayStats.shotsAvg > 0;
  const homeHasCorners = homeStats.cornersAvg > 0;
  const awayHasCorners = awayStats.cornersAvg > 0;
  const homeHasDangerousAttacks = homeStats.dangerousAttacksAvg > 0;
  const awayHasDangerousAttacks = awayStats.dangerousAttacksAvg > 0;

  let score = 0;

  // Games played scoring
  const minGames = Math.min(homeGames, awayGames);
  if (minGames >= 20) score = 10;
  else if (minGames >= 15) score = 8;
  else if (minGames >= 10) score = 6;
  else if (minGames >= 5) score = 4;
  else if (minGames >= 3) score = 2;
  else return 0;

  // Reduce if key metrics are missing
  if (!homeHasShots || !awayHasShots) score -= 1.5;
  if (!homeHasCorners || !awayHasCorners) score -= 1;
  if (!homeHasDangerousAttacks || !awayHasDangerousAttacks) score -= 0.5;

  return Math.max(0, Math.min(10, score));
}

// ============================================================
// CRITERION 2: HOME/AWAY COHERENCE (20%)
// ============================================================

export function calculateHomeAwayCoherence(homeStats: TeamStats | null, awayStats: TeamStats | null): number {
  if (!homeStats || !awayStats) return 0;

  // Check if home/away split data is available
  const homeHasHomeData = homeStats.goalsScored.avgHome > 0;
  const awayHasAwayData = awayStats.goalsScored.avgAway > 0;

  if (!homeHasHomeData && !awayHasAwayData) return 2; // Only general data

  // Calculate home games for home team and away games for away team
  // Using goals ratio to estimate games played in each context
  const homeGoalsTotal = homeStats.goalsScored.all;
  const homeGoalsHome = homeStats.goalsScored.home;
  const homeGoalsAway = homeStats.goalsScored.away;
  const awayGoalsTotal = awayStats.goalsScored.all;
  const awayGoalsAway = awayStats.goalsScored.away;

  // Estimate home games and away games
  const homeTeamHomeGames = homeGoalsHome > 0 && homeStats.goalsScored.avgHome > 0
    ? Math.round(homeGoalsHome / homeStats.goalsScored.avgHome)
    : 0;
  const awayTeamAwayGames = awayGoalsAway > 0 && awayStats.goalsScored.avgAway > 0
    ? Math.round(awayGoalsAway / awayStats.goalsScored.avgAway)
    : 0;

  const minContextGames = Math.min(homeTeamHomeGames, awayTeamAwayGames);

  if (minContextGames >= 10) return 10;
  if (minContextGames >= 7) return 8;
  if (minContextGames >= 5) return 6;
  if (minContextGames >= 3) return 4;
  if (minContextGames >= 1) return 2;
  return 0;
}

// ============================================================
// CRITERION 3: OFFENSIVE VOLUME (25%)
// ============================================================

export function calculateOffensiveVolume(homeStats: TeamStats | null, awayStats: TeamStats | null): number {
  if (!homeStats || !awayStats) return 0;

  // Calculate projected stats
  // Home team shots expected = (home shots avg + away goals conceded proxy) / 2
  // Using shots average directly from Sportmonks aggregated data
  const homeShotsExpected = homeStats.shotsAvg;
  const awayShotsExpected = awayStats.shotsAvg;
  const totalShots = homeShotsExpected + awayShotsExpected;

  // Shots on target: estimate from shots and on-target ratio
  const homeOnTargetRatio = homeStats.shotsTotal > 0 ? homeStats.shotsOnTarget / homeStats.shotsTotal : 0.35;
  const awayOnTargetRatio = awayStats.shotsTotal > 0 ? awayStats.shotsOnTarget / awayStats.shotsTotal : 0.35;
  const homeShotsOnTargetExpected = homeShotsExpected * homeOnTargetRatio;
  const awayShotsOnTargetExpected = awayShotsExpected * awayOnTargetRatio;
  const totalShotsOnTarget = homeShotsOnTargetExpected + awayShotsOnTargetExpected;

  // Corners
  const totalCorners = homeStats.cornersAvg + awayStats.cornersAvg;

  // Score based on thresholds
  let shotsScore = 0;
  if (totalShots >= 26) shotsScore = 10;
  else if (totalShots >= 23) shotsScore = 8;
  else if (totalShots >= 20) shotsScore = 6;
  else if (totalShots >= 17) shotsScore = 4;
  else shotsScore = 2;

  let onTargetScore = 0;
  if (totalShotsOnTarget >= 8.5) onTargetScore = 10;
  else if (totalShotsOnTarget >= 7.5) onTargetScore = 8;
  else if (totalShotsOnTarget >= 6.5) onTargetScore = 6;
  else if (totalShotsOnTarget >= 5.5) onTargetScore = 4;
  else onTargetScore = 2;

  let cornersScore = 0;
  if (totalCorners >= 8.5) cornersScore = 10;
  else if (totalCorners >= 7.5) cornersScore = 8;
  else if (totalCorners >= 6.5) cornersScore = 6;
  else if (totalCorners >= 5.5) cornersScore = 4;
  else cornersScore = 2;

  // Weighted average of the three metrics
  return (shotsScore * 0.4 + onTargetScore * 0.35 + cornersScore * 0.25);
}

// ============================================================
// CRITERION 4: DEFENSE ALLOWS VOLUME (15%)
// ============================================================

export function calculateDefensiveVolume(homeStats: TeamStats | null, awayStats: TeamStats | null): number {
  if (!homeStats || !awayStats) return 0;

  // How much the home team's defense allows (away team will attack)
  // and how much the away team's defense allows (home team will attack)
  const homeDefenseGoalsConceded = homeStats.goalsConceded.avgAll;
  const awayDefenseGoalsConceded = awayStats.goalsConceded.avgAll;

  // Use dangerous attacks average as proxy for shots allowed
  // Higher goals conceded = weaker defense = more volume for opponent
  let homeDefenseScore = 0;
  if (homeDefenseGoalsConceded >= 1.5) homeDefenseScore = 10;
  else if (homeDefenseGoalsConceded >= 1.2) homeDefenseScore = 8;
  else if (homeDefenseGoalsConceded >= 1.0) homeDefenseScore = 6;
  else if (homeDefenseGoalsConceded >= 0.7) homeDefenseScore = 4;
  else homeDefenseScore = 2;

  let awayDefenseScore = 0;
  if (awayDefenseGoalsConceded >= 1.5) awayDefenseScore = 10;
  else if (awayDefenseGoalsConceded >= 1.2) awayDefenseScore = 8;
  else if (awayDefenseGoalsConceded >= 1.0) awayDefenseScore = 6;
  else if (awayDefenseGoalsConceded >= 0.7) awayDefenseScore = 4;
  else awayDefenseScore = 2;

  // Both defenses allowing volume is best
  const avgDefenseScore = (homeDefenseScore + awayDefenseScore) / 2;

  // Bonus if both allow high volume
  if (homeDefenseScore >= 8 && awayDefenseScore >= 8) return 10;
  if (homeDefenseScore >= 8 || awayDefenseScore >= 8) return Math.min(10, avgDefenseScore + 1);

  return avgDefenseScore;
}

// ============================================================
// CRITERION 5: COMPETITIVE BALANCE (10%)
// ============================================================

export function calculateCompetitiveBalance(homeStats: TeamStats | null, awayStats: TeamStats | null): number {
  if (!homeStats || !awayStats) return 0;

  const homeGoalsAvg = homeStats.goalsScored.avgAll;
  const awayGoalsAvg = awayStats.goalsScored.avgAll;

  const goalsDiff = Math.abs(homeGoalsAvg - awayGoalsAvg);

  // Check if both teams are offensive enough
  const bothOffensive = homeGoalsAvg >= 0.9 && awayGoalsAvg >= 0.9;

  let score = 0;
  if (goalsDiff <= 0.30) score = 10;
  else if (goalsDiff <= 0.70) score = 8;
  else if (goalsDiff <= 1.00) score = 6;
  else if (goalsDiff <= 1.50) score = 4;
  else score = 2;

  // Penalize if one team is too weak offensively
  if (!bothOffensive) {
    score = Math.max(0, score - 2);
  }

  // Extra penalty if visitor is completely inoffensive
  if (awayGoalsAvg < 0.5) {
    score = Math.max(0, score - 2);
  }

  return Math.min(10, score);
}

// ============================================================
// CRITERION 6: CONTEXT RISK (10%)
// ============================================================

export function calculateContextRisk(context: FixtureContext): number {
  if (context.isFriendly || context.isPreseason) return 2;

  let score = 10;

  if (context.leagueType === 'cup') {
    score -= 2; // Cups tend to be more tactical
  }

  if (context.isKnockout) {
    score -= 3; // Knockout games can be very defensive
  }

  // Check round info for context
  if (context.round) {
    const roundLower = context.round.toLowerCase();
    if (roundLower.includes('final') || roundLower.includes('semi')) {
      score -= 2; // Finals/semis tend to be tighter
    }
    if (roundLower.includes('group')) {
      score += 1; // Group stages tend to be more open
    }
  }

  return Math.max(0, Math.min(10, score));
}

// ============================================================
// BEST STATISTICAL BLOCKS
// ============================================================

export function detectBestBlocks(homeStats: TeamStats | null, awayStats: TeamStats | null): StatBlock[] {
  if (!homeStats || !awayStats) return ['Evitar'];

  const blocks: StatBlock[] = [];

  // Calculate projected totals
  const totalShots = homeStats.shotsAvg + awayStats.shotsAvg;
  const homeOnTargetRatio = homeStats.shotsTotal > 0 ? homeStats.shotsOnTarget / homeStats.shotsTotal : 0.35;
  const awayOnTargetRatio = awayStats.shotsTotal > 0 ? awayStats.shotsOnTarget / awayStats.shotsTotal : 0.35;
  const totalShotsOnTarget = (homeStats.shotsAvg * homeOnTargetRatio) + (awayStats.shotsAvg * awayOnTargetRatio);
  const totalCorners = homeStats.cornersAvg + awayStats.cornersAvg;
  const homeGoalsAvg = homeStats.goalsScored.avgAll;
  const awayGoalsAvg = awayStats.goalsScored.avgAll;
  const totalGoals = homeGoalsAvg + awayGoalsAvg;

  if (totalShotsOnTarget >= 7.5) blocks.push('Chutes no gol');
  if (totalShots >= 23) blocks.push('Finalizações');
  if (totalCorners >= 8.0) blocks.push('Escanteios');
  if (totalGoals >= 2.5) blocks.push('Gols');
  if (homeGoalsAvg >= 1.0 && awayGoalsAvg >= 1.0) blocks.push('BTTS');

  if (blocks.length === 0) blocks.push('Evitar');

  return blocks;
}

// ============================================================
// ALERTS
// ============================================================

export function generateAlerts(
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  criteria: QualityCriteriaScores,
  context: FixtureContext
): string[] {
  const alerts: string[] = [];

  if (criteria.dataAvailability < 4) {
    alerts.push('Poucos dados disponíveis');
  }

  if (criteria.homeAwayCoherence < 4) {
    alerts.push('Poucos dados casa/fora');
  }

  if (criteria.competitiveBalance < 4) {
    alerts.push('Favorito muito dominante');
  }

  if (context.isKnockout) {
    alerts.push('Mata-mata');
  }

  if (context.leagueType === 'cup') {
    alerts.push('Copa - possível rotação');
  }

  if (homeStats && awayStats) {
    // High correlation between shots and goals
    const homeConversion = homeStats.goalsScored.avgAll / Math.max(homeStats.shotsAvg, 1);
    const awayConversion = awayStats.goalsScored.avgAll / Math.max(awayStats.shotsAvg, 1);
    if (homeConversion > 0.15 || awayConversion > 0.15) {
      alerts.push('Alta correlação ofensiva');
    }

    // One team very defensive
    if (homeStats.goalsConceded.avgAll < 0.5 || awayStats.goalsConceded.avgAll < 0.5) {
      alerts.push('Defesa muito sólida presente');
    }
  }

  return alerts;
}

// ============================================================
// EXPLANATION GENERATOR
// ============================================================

export function generateExplanation(
  homeTeam: string,
  awayTeam: string,
  score: number,
  label: QualityLabel,
  criteria: QualityCriteriaScores,
  bestBlocks: StatBlock[]
): string {
  const matchName = `${homeTeam} x ${awayTeam}`;

  if (label === 'excellent' || label === 'good') {
    const reasons: string[] = [];
    if (criteria.dataAvailability >= 7) reasons.push('dados suficientes');
    if (criteria.offensiveVolume >= 7) reasons.push('bom volume ofensivo projetado');
    if (criteria.homeAwayCoherence >= 7) reasons.push('boa coerência casa/fora');
    if (criteria.defensiveVolume >= 7) reasons.push('defesas permitem volume');
    if (criteria.competitiveBalance >= 7) reasons.push('equilíbrio competitivo');

    const blocksText = bestBlocks.filter(b => b !== 'Evitar').join(', ');
    return `${matchName} recebeu nota ${score.toFixed(1)} porque ${reasons.join(', ')}. Os melhores blocos são ${blocksText}.`;
  }

  if (label === 'acceptable') {
    const weakPoints: string[] = [];
    if (criteria.dataAvailability < 6) weakPoints.push('dados limitados');
    if (criteria.offensiveVolume < 6) weakPoints.push('volume ofensivo moderado');
    if (criteria.homeAwayCoherence < 6) weakPoints.push('poucos dados casa/fora');
    return `${matchName} recebeu nota ${score.toFixed(1)}. Partida aceitável para análise, mas com ${weakPoints.join(' e ')}.`;
  }

  // caution or avoid
  const problems: string[] = [];
  if (criteria.dataAvailability < 5) problems.push('poucos dados disponíveis');
  if (criteria.offensiveVolume < 5) problems.push('baixo volume ofensivo');
  if (criteria.homeAwayCoherence < 5) problems.push('poucos dados casa/fora');
  if (criteria.competitiveBalance < 5) problems.push('desequilíbrio competitivo');
  if (criteria.contextRisk < 5) problems.push('risco contextual elevado');

  return `Partida marcada como ${getQualityLabelText(label)} porque ${problems.join(', ')}.`;
}

// ============================================================
// MAIN CALCULATION
// ============================================================

export function calculateMatchQuality(
  homeStats: TeamStats | null,
  awayStats: TeamStats | null,
  context: FixtureContext,
  homeTeam: string,
  awayTeam: string
): MatchQualityResult {
  // Calculate each criterion
  const criteria: QualityCriteriaScores = {
    dataAvailability: calculateDataAvailability(homeStats, awayStats),
    homeAwayCoherence: calculateHomeAwayCoherence(homeStats, awayStats),
    offensiveVolume: calculateOffensiveVolume(homeStats, awayStats),
    defensiveVolume: calculateDefensiveVolume(homeStats, awayStats),
    competitiveBalance: calculateCompetitiveBalance(homeStats, awayStats),
    contextRisk: calculateContextRisk(context),
  };

  // Calculate weighted score
  let qualityScore =
    criteria.dataAvailability * WEIGHTS.dataAvailability +
    criteria.homeAwayCoherence * WEIGHTS.homeAwayCoherence +
    criteria.offensiveVolume * WEIGHTS.offensiveVolume +
    criteria.defensiveVolume * WEIGHTS.defensiveVolume +
    criteria.competitiveBalance * WEIGHTS.competitiveBalance +
    criteria.contextRisk * WEIGHTS.contextRisk;

  // Cap at 5.0 if data is insufficient
  if (criteria.dataAvailability <= 2) {
    qualityScore = Math.min(qualityScore, 5.0);
  }

  qualityScore = Math.max(0, Math.min(10, qualityScore));

  const qualityLabel = getQualityLabel(qualityScore);
  const bestBlocks = detectBestBlocks(homeStats, awayStats);
  const alerts = generateAlerts(homeStats, awayStats, criteria, context);
  const explanation = generateExplanation(homeTeam, awayTeam, qualityScore, qualityLabel, criteria, bestBlocks);

  // Calculate projected stats for reference
  const projectedStats = calculateProjectedStats(homeStats, awayStats);

  return {
    qualityScore,
    qualityLabel,
    criteria,
    bestBlocks,
    alerts,
    explanation,
    projectedStats,
  };
}

function calculateProjectedStats(homeStats: TeamStats | null, awayStats: TeamStats | null): ProjectedStats {
  if (!homeStats || !awayStats) {
    return {
      totalShots: 0,
      totalShotsOnTarget: 0,
      totalCorners: 0,
      homeGoalsExpected: 0,
      awayGoalsExpected: 0,
      totalGoalsExpected: 0,
      homeDangerousAttacks: 0,
      awayDangerousAttacks: 0,
    };
  }

  const homeOnTargetRatio = homeStats.shotsTotal > 0 ? homeStats.shotsOnTarget / homeStats.shotsTotal : 0.35;
  const awayOnTargetRatio = awayStats.shotsTotal > 0 ? awayStats.shotsOnTarget / awayStats.shotsTotal : 0.35;

  return {
    totalShots: homeStats.shotsAvg + awayStats.shotsAvg,
    totalShotsOnTarget: (homeStats.shotsAvg * homeOnTargetRatio) + (awayStats.shotsAvg * awayOnTargetRatio),
    totalCorners: homeStats.cornersAvg + awayStats.cornersAvg,
    homeGoalsExpected: homeStats.goalsScored.avgAll,
    awayGoalsExpected: awayStats.goalsScored.avgAll,
    totalGoalsExpected: homeStats.goalsScored.avgAll + awayStats.goalsScored.avgAll,
    homeDangerousAttacks: homeStats.dangerousAttacksAvg,
    awayDangerousAttacks: awayStats.dangerousAttacksAvg,
  };
}
