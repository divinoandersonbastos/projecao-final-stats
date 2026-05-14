/**
 * Football Statistics Projection Engine
 * Implements all calculation formulas from the Projeção Final Stats specification
 */

export interface TeamData {
  name: string;
  dangerousAttacksFor: number;
  dangerousAttacksAgainst: number;
  cornersFor: number;
  cornersAgainst: number;
  shotsFor: number;
  shotsAgainst: number;
  shotsOnTargetFor: number;
  shotsOnTargetAgainst: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface ProjectionResult {
  homeTeam: TeamData;
  awayTeam: TeamData;
  
  // Projected values
  homeProjectedShots: number;
  awayProjectedShots: number;
  homeProjectedShotsOnTarget: number;
  awayProjectedShotsOnTarget: number;
  homeProjectedCorners: number;
  awayProjectedCorners: number;
  homeProjectedGoals: number;
  awayProjectedGoals: number;
  
  // Conversion rates
  homeOffensiveConversion: number;
  homeDefensiveConversion: number;
  awayOffensiveConversion: number;
  awayDefensiveConversion: number;
  
  // Pressure factors
  homePressureFactor: number;
  awayPressureFactor: number;
  
  // Final projection
  projectedHomeGoals: number;
  projectedAwayGoals: number;
  
  // Ranking data
  rankingLines: RankingLine[];
}

export interface RankingLine {
  rank: number;
  line: string;
  projection: number;
  baseline: number;
  absoluteMargin: number;
  percentageMargin: number;
  stability: "Alta" | "Média" | "Baixa";
  correlation: "Baixa" | "Média" | "Alta";
  confidenceIndex: number;
  status: "Forte" | "Boa" | "Média" | "Fraca" | "Sem sustentação";
  category: "A" | "B" | "C" | "D";
  isAlert: boolean;
  alertReason?: string;
}

/**
 * 4.1 FINALIZAÇÕES ESPERADAS
 */
function calculateProjectedShots(teamFor: number, opponentAgainst: number): number {
  return (teamFor + opponentAgainst) / 2;
}

/**
 * 4.2 FINALIZAÇÕES NO GOL ESPERADAS
 */
function calculateProjectedShotsOnTarget(teamFor: number, opponentAgainst: number): number {
  return (teamFor + opponentAgainst) / 2;
}

/**
 * 4.3 CONVERSÃO OFENSIVA
 */
function calculateOffensiveConversion(goalsFor: number, shotsOnTargetFor: number): number {
  if (shotsOnTargetFor === 0) return 0;
  return goalsFor / shotsOnTargetFor;
}

/**
 * 4.4 CONVERSÃO SOFRIDA
 */
function calculateDefensiveConversion(goalsAgainst: number, shotsOnTargetAgainst: number): number {
  if (shotsOnTargetAgainst === 0) return 0;
  return goalsAgainst / shotsOnTargetAgainst;
}

/**
 * 4.5 GOLS ESPERADOS
 */
function calculateProjectedGoals(
  projectedShotsOnTarget: number,
  offensiveConversion: number,
  opponentDefensiveConversion: number
): number {
  const avgConversion = (offensiveConversion + opponentDefensiveConversion) / 2;
  return projectedShotsOnTarget * avgConversion;
}

/**
 * 4.6 ESCANTEIOS ESPERADOS — BASE SIMPLES
 */
function calculateProjectedCorners(teamFor: number, opponentAgainst: number): number {
  return (teamFor + opponentAgainst) / 2;
}

/**
 * 4.7 ESCANTEIOS ESPERADOS — AJUSTE POR PRESSÃO
 */
function calculatePressureFactor(dangerousAttacksExpected: number): number {
  const factor = 1 + ((dangerousAttacksExpected - 45) / 200);
  // Limitar entre 0,90 e 1,10
  return Math.max(0.9, Math.min(1.1, factor));
}

function calculateAdjustedCorners(baseCorners: number, pressureFactor: number): number {
  return baseCorners * pressureFactor;
}

/**
 * Calculate dangerous attacks expected
 */
function calculateDangerousAttacksExpected(teamFor: number, opponentAgainst: number): number {
  return (teamFor + opponentAgainst) / 2;
}

/**
 * Calculate confidence index for a projection line
 */
function calculateConfidenceIndex(
  projection: number,
  baseline: number,
  stability: number,
  coherence: number,
  correlation: number
): number {
  const marginScore = calculateMarginScore(projection, baseline);
  const stabilityScore = stability * 10; // 0-10 scale
  const coherenceScore = coherence * 10; // 0-10 scale
  const correlationScore = correlation * 10; // 0-10 scale

  return (
    marginScore * 0.4 +
    stabilityScore * 0.3 +
    coherenceScore * 0.2 +
    correlationScore * 0.1
  );
}

/**
 * Calculate margin score (0-10)
 */
function calculateMarginScore(projection: number, baseline: number): number {
  if (baseline === 0) return 0;
  
  const percentageMargin = ((projection - baseline) / baseline) * 100;
  
  if (percentageMargin >= 15) return 10; // Forte
  if (percentageMargin >= 5) return 8; // Média/boa
  if (percentageMargin >= 0) return 5; // Baixa
  return 0; // Sem sustentação
}

/**
 * Get stability score for a metric
 */
function getStabilityScore(metricType: string): { score: number; label: "Alta" | "Média" | "Baixa" } {
  const stabilityMap: Record<string, { score: number; label: "Alta" | "Média" | "Baixa" }> = {
    "corners_per_team": { score: 8.5, label: "Alta" },
    "total_corners": { score: 8.0, label: "Alta" },
    "total_shots": { score: 7.5, label: "Média" },
    "shots_on_target": { score: 7.0, label: "Média" },
    "over_1_5_goals": { score: 6.5, label: "Média" },
    "over_2_5_goals": { score: 5.5, label: "Baixa" },
    "final_result": { score: 4.0, label: "Baixa" },
    "exact_score": { score: 3.0, label: "Baixa" },
  };

  return stabilityMap[metricType] || { score: 5.0, label: "Média" };
}

/**
 * Get correlation between two metrics
 */
function getCorrelation(metric1: string, metric2: string): "Baixa" | "Média" | "Alta" {
  const highCorrelations = [
    ["corners_per_team", "total_corners"],
    ["total_shots", "shots_on_target"],
    ["dangerous_attacks", "corners"],
  ];

  const mediumCorrelations = [
    ["shots_on_target", "goals"],
    ["dangerous_attacks", "shots"],
    ["corners", "goals"],
  ];

  const key = [metric1, metric2].sort().join("|");

  for (const pair of highCorrelations) {
    if (key === pair.sort().join("|")) return "Alta";
  }

  for (const pair of mediumCorrelations) {
    if (key === pair.sort().join("|")) return "Média";
  }

  return "Baixa";
}

/**
 * Get status based on confidence index
 */
function getStatus(confidenceIndex: number): "Forte" | "Boa" | "Média" | "Fraca" | "Sem sustentação" {
  if (confidenceIndex >= 8.0) return "Forte";
  if (confidenceIndex >= 7.0) return "Boa";
  if (confidenceIndex >= 6.0) return "Média";
  if (confidenceIndex >= 5.0) return "Fraca";
  return "Sem sustentação";
}

/**
 * Main calculation function
 */
export function calculateProjections(homeTeam: TeamData, awayTeam: TeamData): ProjectionResult {
  // Calculate projected shots
  const homeProjectedShots = calculateProjectedShots(homeTeam.shotsFor, awayTeam.shotsAgainst);
  const awayProjectedShots = calculateProjectedShots(awayTeam.shotsFor, homeTeam.shotsAgainst);

  // Calculate projected shots on target
  const homeProjectedShotsOnTarget = calculateProjectedShotsOnTarget(
    homeTeam.shotsOnTargetFor,
    awayTeam.shotsOnTargetAgainst
  );
  const awayProjectedShotsOnTarget = calculateProjectedShotsOnTarget(
    awayTeam.shotsOnTargetFor,
    homeTeam.shotsOnTargetAgainst
  );

  // Calculate conversion rates
  const homeOffensiveConversion = calculateOffensiveConversion(
    homeTeam.goalsFor,
    homeTeam.shotsOnTargetFor
  );
  const homeDefensiveConversion = calculateDefensiveConversion(
    homeTeam.goalsAgainst,
    homeTeam.shotsOnTargetAgainst
  );
  const awayOffensiveConversion = calculateOffensiveConversion(
    awayTeam.goalsFor,
    awayTeam.shotsOnTargetFor
  );
  const awayDefensiveConversion = calculateDefensiveConversion(
    awayTeam.goalsAgainst,
    awayTeam.shotsOnTargetAgainst
  );

  // Calculate projected goals
  const homeProjectedGoals = calculateProjectedGoals(
    homeProjectedShotsOnTarget,
    homeOffensiveConversion,
    awayDefensiveConversion
  );
  const awayProjectedGoals = calculateProjectedGoals(
    awayProjectedShotsOnTarget,
    awayOffensiveConversion,
    homeDefensiveConversion
  );

  // Calculate dangerous attacks expected
  const homeDangerousAttacksExpected = calculateDangerousAttacksExpected(
    homeTeam.dangerousAttacksFor,
    awayTeam.dangerousAttacksAgainst
  );
  const awayDangerousAttacksExpected = calculateDangerousAttacksExpected(
    awayTeam.dangerousAttacksFor,
    homeTeam.dangerousAttacksAgainst
  );

  // Calculate pressure factors
  const homePressureFactor = calculatePressureFactor(homeDangerousAttacksExpected);
  const awayPressureFactor = calculatePressureFactor(awayDangerousAttacksExpected);

  // Calculate base corners
  const homeBaseCorners = calculateProjectedCorners(homeTeam.cornersFor, awayTeam.cornersAgainst);
  const awayBaseCorners = calculateProjectedCorners(awayTeam.cornersFor, homeTeam.cornersAgainst);

  // Calculate adjusted corners
  const homeProjectedCorners = calculateAdjustedCorners(homeBaseCorners, homePressureFactor);
  const awayProjectedCorners = calculateAdjustedCorners(awayBaseCorners, awayPressureFactor);

  // Final goal projection (rounded)
  const projectedHomeGoals = Math.round(homeProjectedGoals);
  const projectedAwayGoals = Math.round(awayProjectedGoals);

  // Generate ranking lines
  const rankingLines = generateRankingLines(
    homeTeam,
    awayTeam,
    homeProjectedShots,
    awayProjectedShots,
    homeProjectedShotsOnTarget,
    awayProjectedShotsOnTarget,
    homeProjectedCorners,
    awayProjectedCorners,
    homeProjectedGoals,
    awayProjectedGoals,
    homeOffensiveConversion,
    awayOffensiveConversion
  );

  return {
    homeTeam,
    awayTeam,
    homeProjectedShots,
    awayProjectedShots,
    homeProjectedShotsOnTarget,
    awayProjectedShotsOnTarget,
    homeProjectedCorners,
    awayProjectedCorners,
    homeProjectedGoals,
    awayProjectedGoals,
    homeOffensiveConversion,
    homeDefensiveConversion,
    awayOffensiveConversion,
    awayDefensiveConversion,
    homePressureFactor,
    awayPressureFactor,
    projectedHomeGoals,
    projectedAwayGoals,
    rankingLines,
  };
}

/**
 * Generate ranking lines for the analysis
 */
function generateRankingLines(
  homeTeam: TeamData,
  awayTeam: TeamData,
  homeProjectedShots: number,
  awayProjectedShots: number,
  homeProjectedShotsOnTarget: number,
  awayProjectedShotsOnTarget: number,
  homeProjectedCorners: number,
  awayProjectedCorners: number,
  homeProjectedGoals: number,
  awayProjectedGoals: number,
  homeOffensiveConversion: number,
  awayOffensiveConversion: number
): RankingLine[] {
  const lines: RankingLine[] = [];
  let rank = 1;

  // Baseline values (using average from 20 games as reference)
  const baselines = {
    cornersPerTeam: 4.0,
    totalCorners: 8.0,
    totalShots: 25.5,
    shotsOnTarget: 7.5,
    over1_5Goals: 2.5,
    over2_5Goals: 2.5,
  };

  // BLOCO A - Escanteios
  const homeCornerStability = getStabilityScore("corners_per_team");
  const homeCornerMargin = homeProjectedCorners - baselines.cornersPerTeam;
  const homeCornerMarginPercent = (homeCornerMargin / baselines.cornersPerTeam) * 100;
  const homeCornerConfidence = calculateConfidenceIndex(
    homeProjectedCorners,
    baselines.cornersPerTeam,
    homeCornerStability.score / 10,
    0.8,
    0.7
  );

  lines.push({
    rank: rank++,
    line: `${homeTeam.name} escanteios`,
    projection: Math.round(homeProjectedCorners * 100) / 100,
    baseline: baselines.cornersPerTeam,
    absoluteMargin: Math.round(homeCornerMargin * 100) / 100,
    percentageMargin: Math.round(homeCornerMarginPercent * 10) / 10,
    stability: homeCornerStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(homeCornerConfidence * 10) / 10,
    status: getStatus(homeCornerConfidence),
    category: "A",
    isAlert: false,
  });

  const awayCornerStability = getStabilityScore("corners_per_team");
  const awayCornerMargin = awayProjectedCorners - baselines.cornersPerTeam;
  const awayCornerMarginPercent = (awayCornerMargin / baselines.cornersPerTeam) * 100;
  const awayCornerConfidence = calculateConfidenceIndex(
    awayProjectedCorners,
    baselines.cornersPerTeam,
    awayCornerStability.score / 10,
    0.8,
    0.7
  );

  lines.push({
    rank: rank++,
    line: `${awayTeam.name} escanteios`,
    projection: Math.round(awayProjectedCorners * 100) / 100,
    baseline: baselines.cornersPerTeam,
    absoluteMargin: Math.round(awayCornerMargin * 100) / 100,
    percentageMargin: Math.round(awayCornerMarginPercent * 10) / 10,
    stability: awayCornerStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(awayCornerConfidence * 10) / 10,
    status: getStatus(awayCornerConfidence),
    category: "A",
    isAlert: false,
  });

  const totalCornersStability = getStabilityScore("total_corners");
  const totalCorners = homeProjectedCorners + awayProjectedCorners;
  const totalCornersMargin = totalCorners - baselines.totalCorners;
  const totalCornersMarginPercent = (totalCornersMargin / baselines.totalCorners) * 100;
  const totalCornersConfidence = calculateConfidenceIndex(
    totalCorners,
    baselines.totalCorners,
    totalCornersStability.score / 10,
    0.85,
    0.9
  );

  lines.push({
    rank: rank++,
    line: "Total escanteios",
    projection: Math.round(totalCorners * 100) / 100,
    baseline: baselines.totalCorners,
    absoluteMargin: Math.round(totalCornersMargin * 100) / 100,
    percentageMargin: Math.round(totalCornersMarginPercent * 10) / 10,
    stability: totalCornersStability.label,
    correlation: "Alta",
    confidenceIndex: Math.round(totalCornersConfidence * 10) / 10,
    status: getStatus(totalCornersConfidence),
    category: "A",
    isAlert: false,
  });

  // BLOCO B - Finalizações
  const homeShotsStability = getStabilityScore("total_shots");
  const homeShotsMargin = homeProjectedShots - (baselines.totalShots / 2);
  const homeShotsMarginPercent = (homeShotsMargin / (baselines.totalShots / 2)) * 100;
  const homeShotsConfidence = calculateConfidenceIndex(
    homeProjectedShots,
    baselines.totalShots / 2,
    homeShotsStability.score / 10,
    0.75,
    0.6
  );

  lines.push({
    rank: rank++,
    line: `${homeTeam.name} finalizações`,
    projection: Math.round(homeProjectedShots * 100) / 100,
    baseline: baselines.totalShots / 2,
    absoluteMargin: Math.round(homeShotsMargin * 100) / 100,
    percentageMargin: Math.round(homeShotsMarginPercent * 10) / 10,
    stability: homeShotsStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(homeShotsConfidence * 10) / 10,
    status: getStatus(homeShotsConfidence),
    category: "B",
    isAlert: false,
  });

  const awayShotsStability = getStabilityScore("total_shots");
  const awayShotsMargin = awayProjectedShots - (baselines.totalShots / 2);
  const awayShotsMarginPercent = (awayShotsMargin / (baselines.totalShots / 2)) * 100;
  const awayShotsConfidence = calculateConfidenceIndex(
    awayProjectedShots,
    baselines.totalShots / 2,
    awayShotsStability.score / 10,
    0.75,
    0.6
  );

  lines.push({
    rank: rank++,
    line: `${awayTeam.name} finalizações`,
    projection: Math.round(awayProjectedShots * 100) / 100,
    baseline: baselines.totalShots / 2,
    absoluteMargin: Math.round(awayShotsMargin * 100) / 100,
    percentageMargin: Math.round(awayShotsMarginPercent * 10) / 10,
    stability: awayShotsStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(awayShotsConfidence * 10) / 10,
    status: getStatus(awayShotsConfidence),
    category: "B",
    isAlert: false,
  });

  const totalShotsStability = getStabilityScore("total_shots");
  const totalShots = homeProjectedShots + awayProjectedShots;
  const totalShotsMargin = totalShots - baselines.totalShots;
  const totalShotsMarginPercent = (totalShotsMargin / baselines.totalShots) * 100;
  const totalShotsConfidence = calculateConfidenceIndex(
    totalShots,
    baselines.totalShots,
    totalShotsStability.score / 10,
    0.8,
    0.7
  );

  lines.push({
    rank: rank++,
    line: "Total finalizações",
    projection: Math.round(totalShots * 100) / 100,
    baseline: baselines.totalShots,
    absoluteMargin: Math.round(totalShotsMargin * 100) / 100,
    percentageMargin: Math.round(totalShotsMarginPercent * 10) / 10,
    stability: totalShotsStability.label,
    correlation: "Alta",
    confidenceIndex: Math.round(totalShotsConfidence * 10) / 10,
    status: getStatus(totalShotsConfidence),
    category: "B",
    isAlert: false,
  });

  // BLOCO C - Finalizações no gol
  const homeShotsOnTargetStability = getStabilityScore("shots_on_target");
  const homeShotsOnTargetMargin = homeProjectedShotsOnTarget - (baselines.shotsOnTarget / 2);
  const homeShotsOnTargetMarginPercent = (homeShotsOnTargetMargin / (baselines.shotsOnTarget / 2)) * 100;
  const homeShotsOnTargetConfidence = calculateConfidenceIndex(
    homeProjectedShotsOnTarget,
    baselines.shotsOnTarget / 2,
    homeShotsOnTargetStability.score / 10,
    0.7,
    0.5
  );

  lines.push({
    rank: rank++,
    line: `${homeTeam.name} chutes no gol`,
    projection: Math.round(homeProjectedShotsOnTarget * 100) / 100,
    baseline: baselines.shotsOnTarget / 2,
    absoluteMargin: Math.round(homeShotsOnTargetMargin * 100) / 100,
    percentageMargin: Math.round(homeShotsOnTargetMarginPercent * 10) / 10,
    stability: homeShotsOnTargetStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(homeShotsOnTargetConfidence * 10) / 10,
    status: getStatus(homeShotsOnTargetConfidence),
    category: "C",
    isAlert: false,
  });

  const awayShotsOnTargetStability = getStabilityScore("shots_on_target");
  const awayShotsOnTargetMargin = awayProjectedShotsOnTarget - (baselines.shotsOnTarget / 2);
  const awayShotsOnTargetMarginPercent = (awayShotsOnTargetMargin / (baselines.shotsOnTarget / 2)) * 100;
  const awayShotsOnTargetConfidence = calculateConfidenceIndex(
    awayProjectedShotsOnTarget,
    baselines.shotsOnTarget / 2,
    awayShotsOnTargetStability.score / 10,
    0.7,
    0.5
  );

  lines.push({
    rank: rank++,
    line: `${awayTeam.name} chutes no gol`,
    projection: Math.round(awayProjectedShotsOnTarget * 100) / 100,
    baseline: baselines.shotsOnTarget / 2,
    absoluteMargin: Math.round(awayShotsOnTargetMargin * 100) / 100,
    percentageMargin: Math.round(awayShotsOnTargetMarginPercent * 10) / 10,
    stability: awayShotsOnTargetStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(awayShotsOnTargetConfidence * 10) / 10,
    status: getStatus(awayShotsOnTargetConfidence),
    category: "C",
    isAlert: false,
  });

  const totalShotsOnTargetStability = getStabilityScore("shots_on_target");
  const totalShotsOnTarget = homeProjectedShotsOnTarget + awayProjectedShotsOnTarget;
  const totalShotsOnTargetMargin = totalShotsOnTarget - baselines.shotsOnTarget;
  const totalShotsOnTargetMarginPercent = (totalShotsOnTargetMargin / baselines.shotsOnTarget) * 100;
  const totalShotsOnTargetConfidence = calculateConfidenceIndex(
    totalShotsOnTarget,
    baselines.shotsOnTarget,
    totalShotsOnTargetStability.score / 10,
    0.75,
    0.6
  );

  lines.push({
    rank: rank++,
    line: "Total chutes no gol",
    projection: Math.round(totalShotsOnTarget * 100) / 100,
    baseline: baselines.shotsOnTarget,
    absoluteMargin: Math.round(totalShotsOnTargetMargin * 100) / 100,
    percentageMargin: Math.round(totalShotsOnTargetMarginPercent * 10) / 10,
    stability: totalShotsOnTargetStability.label,
    correlation: "Alta",
    confidenceIndex: Math.round(totalShotsOnTargetConfidence * 10) / 10,
    status: getStatus(totalShotsOnTargetConfidence),
    category: "C",
    isAlert: false,
  });

  // BLOCO D - Gols
  const homeGoalsStability = getStabilityScore("over_1_5_goals");
  const homeGoalsMargin = homeProjectedGoals - (baselines.over1_5Goals / 2);
  const homeGoalsMarginPercent = (homeGoalsMargin / (baselines.over1_5Goals / 2)) * 100;
  const homeGoalsConfidence = calculateConfidenceIndex(
    homeProjectedGoals,
    baselines.over1_5Goals / 2,
    homeGoalsStability.score / 10,
    0.65,
    0.4
  );
  const homeConversionAlert = homeOffensiveConversion > 0.4;

  lines.push({
    rank: rank++,
    line: `${homeTeam.name} gols esperados`,
    projection: Math.round(homeProjectedGoals * 100) / 100,
    baseline: baselines.over1_5Goals / 2,
    absoluteMargin: Math.round(homeGoalsMargin * 100) / 100,
    percentageMargin: Math.round(homeGoalsMarginPercent * 10) / 10,
    stability: homeGoalsStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(homeGoalsConfidence * 10) / 10,
    status: getStatus(homeGoalsConfidence),
    category: "D",
    isAlert: homeConversionAlert,
    alertReason: homeConversionAlert ? "Conversão acima de 40%" : undefined,
  });

  const awayGoalsStability = getStabilityScore("over_1_5_goals");
  const awayGoalsMargin = awayProjectedGoals - (baselines.over1_5Goals / 2);
  const awayGoalsMarginPercent = (awayGoalsMargin / (baselines.over1_5Goals / 2)) * 100;
  const awayGoalsConfidence = calculateConfidenceIndex(
    awayProjectedGoals,
    baselines.over1_5Goals / 2,
    awayGoalsStability.score / 10,
    0.65,
    0.4
  );
  const awayConversionAlert = awayOffensiveConversion > 0.4;

  lines.push({
    rank: rank++,
    line: `${awayTeam.name} gols esperados`,
    projection: Math.round(awayProjectedGoals * 100) / 100,
    baseline: baselines.over1_5Goals / 2,
    absoluteMargin: Math.round(awayGoalsMargin * 100) / 100,
    percentageMargin: Math.round(awayGoalsMarginPercent * 10) / 10,
    stability: awayGoalsStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(awayGoalsConfidence * 10) / 10,
    status: getStatus(awayGoalsConfidence),
    category: "D",
    isAlert: awayConversionAlert,
    alertReason: awayConversionAlert ? "Conversão acima de 40%" : undefined,
  });

  const totalGoalsStability = getStabilityScore("over_1_5_goals");
  const totalGoals = homeProjectedGoals + awayProjectedGoals;
  const totalGoalsMargin = totalGoals - baselines.over1_5Goals;
  const totalGoalsMarginPercent = (totalGoalsMargin / baselines.over1_5Goals) * 100;
  const totalGoalsConfidence = calculateConfidenceIndex(
    totalGoals,
    baselines.over1_5Goals,
    totalGoalsStability.score / 10,
    0.7,
    0.5
  );

  lines.push({
    rank: rank++,
    line: "Total gols",
    projection: Math.round(totalGoals * 100) / 100,
    baseline: baselines.over1_5Goals,
    absoluteMargin: Math.round(totalGoalsMargin * 100) / 100,
    percentageMargin: Math.round(totalGoalsMarginPercent * 10) / 10,
    stability: totalGoalsStability.label,
    correlation: "Média",
    confidenceIndex: Math.round(totalGoalsConfidence * 10) / 10,
    status: getStatus(totalGoalsConfidence),
    category: "D",
    isAlert: false,
  });

  // Sort by confidence index descending
  lines.sort((a, b) => b.confidenceIndex - a.confidenceIndex);

  // Re-rank
  lines.forEach((line, index) => {
    line.rank = index + 1;
  });

  return lines;
}
