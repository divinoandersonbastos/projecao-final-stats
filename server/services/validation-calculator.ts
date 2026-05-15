/**
 * Validation Calculator - compares projections with real match results
 * 
 * Classification system (positive-oriented):
 * - excellent (≤10% error) = "Alcançado" - Projeção bateu com o resultado real
 * - good (10-20% error) = "Próximo" - Projeção ficou muito perto do real
 * - medium (20-35% error) = "Parcial" - Projeção acertou parcialmente
 * - divergent (>35% error) = "Não Alcançado" - Projeção divergiu do resultado
 * 
 * A metric is considered "achieved" if error ≤ 20% (excellent or good)
 */

export interface MetricValidation {
  metric: string;
  metricLabel: string;
  category: "goals" | "shots" | "shotsOnTarget" | "corners" | "dangerousAttacks";
  projected: number;
  actual: number;
  absoluteError: number;
  percentError: number;
  classification: "excellent" | "good" | "medium" | "divergent";
  achieved: boolean; // true if error ≤ 20% (excellent or good)
}

export interface ValidationResult {
  metrics: MetricValidation[];
  overallScore: number;
  overallClassification: "excellent" | "good" | "medium" | "divergent";
  avgAbsoluteError: number;
  avgPercentError: number;
  totalMetrics: number;
  excellentCount: number;
  goodCount: number;
  mediumCount: number;
  divergentCount: number;
  achievedCount: number; // metrics with error ≤ 20%
  achievedMetrics: string[]; // labels of achieved metrics
  notAchievedMetrics: string[]; // labels of not achieved metrics
}

interface ProjectedValues {
  homeProjectedShots: number;
  awayProjectedShots: number;
  homeProjectedShotsOnTarget: number;
  awayProjectedShotsOnTarget: number;
  homeProjectedCorners: number;
  awayProjectedCorners: number;
  homeProjectedGoals: number;
  awayProjectedGoals: number;
  projectedHomeGoals: number;
  projectedAwayGoals: number;
}

interface ActualValues {
  homeGoals: number;
  awayGoals: number;
  homeShots: number | null;
  awayShots: number | null;
  homeShotsOnTarget: number | null;
  awayShotsOnTarget: number | null;
  homeCorners: number | null;
  awayCorners: number | null;
  homeDangerousAttacks: number | null;
  awayDangerousAttacks: number | null;
}

/**
 * Classify error percentage into quality categories
 */
export function classifyError(percentError: number): "excellent" | "good" | "medium" | "divergent" {
  const absPercent = Math.abs(percentError);
  if (absPercent <= 10) return "excellent";
  if (absPercent <= 20) return "good";
  if (absPercent <= 35) return "medium";
  return "divergent";
}

/**
 * Check if a metric is considered "achieved" (error ≤ 20%)
 */
export function isMetricAchieved(classification: "excellent" | "good" | "medium" | "divergent"): boolean {
  return classification === "excellent" || classification === "good";
}

/**
 * Calculate error percentage safely (avoid division by zero)
 */
function calcPercentError(projected: number, actual: number): number {
  if (actual === 0 && projected === 0) return 0;
  if (actual === 0) return 100; // Max divergence when actual is 0 but projected isn't
  return ((projected - actual) / actual) * 100;
}

/**
 * Calculate complete validation comparing projected vs actual values
 */
export function calculateValidation(
  projected: ProjectedValues,
  actual: ActualValues,
  homeTeamName: string,
  awayTeamName: string
): ValidationResult {
  const metrics: MetricValidation[] = [];

  // Goals (always available)
  addMetric(metrics, "homeGoals", `Gols ${homeTeamName}`, "goals",
    projected.projectedHomeGoals, actual.homeGoals);
  addMetric(metrics, "awayGoals", `Gols ${awayTeamName}`, "goals",
    projected.projectedAwayGoals, actual.awayGoals);
  addMetric(metrics, "totalGoals", "Total de Gols", "goals",
    projected.projectedHomeGoals + projected.projectedAwayGoals,
    actual.homeGoals + actual.awayGoals);

  // Shots (if available)
  if (actual.homeShots !== null && actual.awayShots !== null) {
    addMetric(metrics, "homeShots", `Finalizações ${homeTeamName}`, "shots",
      projected.homeProjectedShots, actual.homeShots);
    addMetric(metrics, "awayShots", `Finalizações ${awayTeamName}`, "shots",
      projected.awayProjectedShots, actual.awayShots);
    addMetric(metrics, "totalShots", "Total Finalizações", "shots",
      projected.homeProjectedShots + projected.awayProjectedShots,
      actual.homeShots + actual.awayShots);
  }

  // Shots on target (if available)
  if (actual.homeShotsOnTarget !== null && actual.awayShotsOnTarget !== null) {
    addMetric(metrics, "homeShotsOnTarget", `Chutes no Gol ${homeTeamName}`, "shotsOnTarget",
      projected.homeProjectedShotsOnTarget, actual.homeShotsOnTarget);
    addMetric(metrics, "awayShotsOnTarget", `Chutes no Gol ${awayTeamName}`, "shotsOnTarget",
      projected.awayProjectedShotsOnTarget, actual.awayShotsOnTarget);
    addMetric(metrics, "totalShotsOnTarget", "Total Chutes no Gol", "shotsOnTarget",
      projected.homeProjectedShotsOnTarget + projected.awayProjectedShotsOnTarget,
      actual.homeShotsOnTarget + actual.awayShotsOnTarget);
  }

  // Corners (if available)
  if (actual.homeCorners !== null && actual.awayCorners !== null) {
    addMetric(metrics, "homeCorners", `Escanteios ${homeTeamName}`, "corners",
      projected.homeProjectedCorners, actual.homeCorners);
    addMetric(metrics, "awayCorners", `Escanteios ${awayTeamName}`, "corners",
      projected.awayProjectedCorners, actual.awayCorners);
    addMetric(metrics, "totalCorners", "Total Escanteios", "corners",
      projected.homeProjectedCorners + projected.awayProjectedCorners,
      actual.homeCorners + actual.awayCorners);
  }

  // Calculate summary
  const totalMetrics = metrics.length;
  const excellentCount = metrics.filter((m) => m.classification === "excellent").length;
  const goodCount = metrics.filter((m) => m.classification === "good").length;
  const mediumCount = metrics.filter((m) => m.classification === "medium").length;
  const divergentCount = metrics.filter((m) => m.classification === "divergent").length;
  
  // Achieved = excellent + good (error ≤ 20%)
  const achievedCount = excellentCount + goodCount;
  const achievedMetrics = metrics.filter((m) => m.achieved).map((m) => m.metricLabel);
  const notAchievedMetrics = metrics.filter((m) => !m.achieved).map((m) => m.metricLabel);

  const avgAbsoluteError = totalMetrics > 0
    ? metrics.reduce((sum, m) => sum + m.absoluteError, 0) / totalMetrics
    : 0;
  const avgPercentError = totalMetrics > 0
    ? metrics.reduce((sum, m) => sum + Math.abs(m.percentError), 0) / totalMetrics
    : 0;

  // Overall score: weighted by classification counts
  // Excellent = 100pts, Good = 75pts, Medium = 50pts, Divergent = 0pts
  const overallScore = totalMetrics > 0
    ? ((excellentCount * 100 + goodCount * 75 + mediumCount * 50 + divergentCount * 0) / totalMetrics)
    : 0;

  const overallClassification = classifyOverall(overallScore);

  return {
    metrics,
    overallScore: Math.round(overallScore * 100) / 100,
    overallClassification,
    avgAbsoluteError: Math.round(avgAbsoluteError * 10000) / 10000,
    avgPercentError: Math.round(avgPercentError * 10000) / 10000,
    totalMetrics,
    excellentCount,
    goodCount,
    mediumCount,
    divergentCount,
    achievedCount,
    achievedMetrics,
    notAchievedMetrics,
  };
}

function addMetric(
  metrics: MetricValidation[],
  metric: string,
  metricLabel: string,
  category: MetricValidation["category"],
  projected: number,
  actual: number
): void {
  const absoluteError = Math.round(Math.abs(projected - actual) * 100) / 100;
  const percentError = Math.round(calcPercentError(projected, actual) * 100) / 100;
  const classification = classifyError(percentError);
  const achieved = isMetricAchieved(classification);

  metrics.push({
    metric,
    metricLabel,
    category,
    projected: Math.round(projected * 100) / 100,
    actual,
    absoluteError,
    percentError,
    classification,
    achieved,
  });
}

function classifyOverall(score: number): "excellent" | "good" | "medium" | "divergent" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "medium";
  return "divergent";
}
