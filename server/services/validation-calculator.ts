/**
 * Validation Calculator - compares projections with real match results
 * 
 * Classification system (binary):
 * - "achieved" = Projeção <= Real (o modelo projetou igual ou menos que o real)
 * - "not_achieved" = Projeção > Real (o modelo projetou mais que o real)
 * 
 * Overall classification based on percentage of achieved metrics:
 * - excellent (>=75% achieved) = "Projeção Alcançada"
 * - good (50-74% achieved) = "Projeção Próxima"
 * - medium (25-49% achieved) = "Projeção Parcial"
 * - divergent (<25% achieved) = "Projeção Não Alcançada"
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
  achieved: boolean; // true if projected <= actual
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
  achievedCount: number; // metrics where projected <= actual
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
 * Classify metric based on whether projection was achieved (projected <= actual)
 * Maps to DB enum values for backward compatibility
 */
export function classifyError(projected: number, actual: number): "excellent" | "good" | "medium" | "divergent" {
  // New logic: if projected <= actual, it's achieved (excellent)
  // If projected > actual, it's not achieved (divergent)
  if (projected <= actual) return "excellent";
  return "divergent";
}

/**
 * Check if a metric is considered "achieved" (projected <= actual)
 */
export function isMetricAchieved(projected: number, actual: number): boolean {
  return projected <= actual;
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
  const achievedCount = metrics.filter((m) => m.achieved).length;
  const notAchievedCount = metrics.filter((m) => !m.achieved).length;
  
  // Map to legacy count fields for DB compatibility
  // achieved = excellent, not achieved = divergent
  const excellentCount = achievedCount;
  const goodCount = 0;
  const mediumCount = 0;
  const divergentCount = notAchievedCount;

  const achievedMetrics = metrics.filter((m) => m.achieved).map((m) => m.metricLabel);
  const notAchievedMetrics = metrics.filter((m) => !m.achieved).map((m) => m.metricLabel);

  const avgAbsoluteError = totalMetrics > 0
    ? metrics.reduce((sum, m) => sum + m.absoluteError, 0) / totalMetrics
    : 0;
  const avgPercentError = totalMetrics > 0
    ? metrics.reduce((sum, m) => sum + Math.abs(m.percentError), 0) / totalMetrics
    : 0;

  // Overall score: percentage of achieved metrics (0-100)
  const overallScore = totalMetrics > 0
    ? (achievedCount / totalMetrics) * 100
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
  const achieved = isMetricAchieved(projected, actual);
  const classification = classifyError(projected, actual);

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

/**
 * Overall classification based on percentage of achieved metrics
 */
function classifyOverall(achievedPercent: number): "excellent" | "good" | "medium" | "divergent" {
  if (achievedPercent >= 75) return "excellent";
  if (achievedPercent >= 50) return "good";
  if (achievedPercent >= 25) return "medium";
  return "divergent";
}
