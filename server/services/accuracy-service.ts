/**
 * Accuracy Service
 * Calculates badge results (green/yellow/red) for ranking lines
 * by comparing projections against real post-match statistics.
 */

export interface RankingLine {
  line: string;
  projection: number;
  baseline: number;
  confidenceIndex: number;
  category: string;
}

export interface LiveStats {
  homeGoals: number;
  awayGoals: number;
  homeShots?: number;
  awayShots?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homePossession?: number;
  awayPossession?: number;
  homeDangerousAttacks?: number;
  awayDangerousAttacks?: number;
}

export interface BadgeResult {
  line: string;
  projection: number;
  baseline: number;
  confidenceIndex: number;
  category: string;
  actualValue: number | null;
  badge: 'green' | 'yellow' | 'red' | 'pending';
  hit: boolean;
  description: string;
}

/**
 * Resolve the actual value for a ranking line from live stats.
 * The `line` field describes the market, e.g.:
 *   "Total escanteios Over 9.5", "Fluminense escanteios Over 4.5",
 *   "Total finalizações Over 18.5", "BTTS", "Fluminense vence", etc.
 */
export function resolveActualValue(line: string, homeTeam: string, awayTeam: string, stats: LiveStats): number | null {
  const lower = line.toLowerCase();
  const homeNorm = homeTeam.toLowerCase();
  const awayNorm = awayTeam.toLowerCase();

  // Total goals
  if (lower.includes('total gol') || lower.includes('total de gol')) {
    return stats.homeGoals + stats.awayGoals;
  }

  // BTTS (Both Teams To Score)
  if (lower.includes('btts') || lower.includes('ambas marcam') || lower.includes('ambos marcam')) {
    return stats.homeGoals > 0 && stats.awayGoals > 0 ? 1 : 0;
  }

  // Home team goals
  if ((lower.includes(homeNorm) || lower.includes('mandante')) && lower.includes('gol')) {
    return stats.homeGoals;
  }

  // Away team goals
  if ((lower.includes(awayNorm) || lower.includes('visitante')) && lower.includes('gol')) {
    return stats.awayGoals;
  }

  // Total corners
  if (lower.includes('total escanteio') || lower.includes('total de escanteio')) {
    if (stats.homeCorners !== undefined && stats.awayCorners !== undefined) {
      return stats.homeCorners + stats.awayCorners;
    }
    return null;
  }

  // Home team corners
  if ((lower.includes(homeNorm) || lower.includes('mandante')) && lower.includes('escanteio')) {
    return stats.homeCorners ?? null;
  }

  // Away team corners
  if ((lower.includes(awayNorm) || lower.includes('visitante')) && lower.includes('escanteio')) {
    return stats.awayCorners ?? null;
  }

  // Total shots
  if (lower.includes('total finaliza') || lower.includes('total de finaliza')) {
    if (stats.homeShots !== undefined && stats.awayShots !== undefined) {
      return stats.homeShots + stats.awayShots;
    }
    return null;
  }

  // Home team shots
  if ((lower.includes(homeNorm) || lower.includes('mandante')) && lower.includes('finaliza')) {
    return stats.homeShots ?? null;
  }

  // Away team shots
  if ((lower.includes(awayNorm) || lower.includes('visitante')) && lower.includes('finaliza')) {
    return stats.awayShots ?? null;
  }

  // Total shots on target
  if (lower.includes('total chute') || lower.includes('total de chute')) {
    if (stats.homeShotsOnTarget !== undefined && stats.awayShotsOnTarget !== undefined) {
      return stats.homeShotsOnTarget + stats.awayShotsOnTarget;
    }
    return null;
  }

  // Home team shots on target
  if ((lower.includes(homeNorm) || lower.includes('mandante')) && lower.includes('chute')) {
    return stats.homeShotsOnTarget ?? null;
  }

  // Away team shots on target
  if ((lower.includes(awayNorm) || lower.includes('visitante')) && lower.includes('chute')) {
    return stats.awayShotsOnTarget ?? null;
  }

  // Home win
  if (lower.includes(homeNorm + ' vence') || lower.includes('vitória ' + homeNorm) || lower.includes('mandante vence')) {
    return stats.homeGoals > stats.awayGoals ? 1 : 0;
  }

  // Away win
  if (lower.includes(awayNorm + ' vence') || lower.includes('vitória ' + awayNorm) || lower.includes('visitante vence')) {
    return stats.awayGoals > stats.homeGoals ? 1 : 0;
  }

  // Draw
  if (lower.includes('empate') || lower.includes('draw')) {
    return stats.homeGoals === stats.awayGoals ? 1 : 0;
  }

  return null;
}

/**
 * Determine badge color for a ranking line given the actual value.
 * 
 * For Over/Under lines:
 *   - Green: actual crosses the line in the projected direction
 *   - Yellow: actual is within 1 unit of the projection baseline
 *   - Red: actual is clearly in the opposite direction
 * 
 * For binary outcomes (BTTS, winner):
 *   - Green: hit exactly
 *   - Red: missed
 */
export function calculateBadge(
  line: string,
  projection: number,
  baseline: number,
  actualValue: number | null
): { badge: 'green' | 'yellow' | 'red' | 'pending'; hit: boolean; description: string } {
  if (actualValue === null) {
    return { badge: 'pending', hit: false, description: 'Dado não disponível' };
  }

  const lower = line.toLowerCase();
  const isBinary = lower.includes('btts') || lower.includes('ambas') || lower.includes('vence') || lower.includes('vitória') || lower.includes('empate');
  const isOver = lower.includes('over') || lower.includes('acima') || lower.includes('mais de');
  const isUnder = lower.includes('under') || lower.includes('abaixo') || lower.includes('menos de');

  if (isBinary) {
    const hit = actualValue === 1;
    return {
      badge: hit ? 'green' : 'red',
      hit,
      description: hit ? 'Confirmado' : 'Não confirmado',
    };
  }

  if (isOver) {
    if (actualValue > baseline) {
      return { badge: 'green', hit: true, description: `${actualValue} > ${baseline} ✓` };
    } else if (actualValue >= baseline - 1) {
      return { badge: 'yellow', hit: false, description: `${actualValue} próximo de ${baseline}` };
    } else {
      return { badge: 'red', hit: false, description: `${actualValue} < ${baseline}` };
    }
  }

  if (isUnder) {
    if (actualValue < baseline) {
      return { badge: 'green', hit: true, description: `${actualValue} < ${baseline} ✓` };
    } else if (actualValue <= baseline + 1) {
      return { badge: 'yellow', hit: false, description: `${actualValue} próximo de ${baseline}` };
    } else {
      return { badge: 'red', hit: false, description: `${actualValue} > ${baseline}` };
    }
  }

  // Generic numeric comparison: project vs actual within 15% tolerance
  const tolerance = Math.max(1, baseline * 0.15);
  const diff = Math.abs(actualValue - projection);
  if (diff <= tolerance * 0.5) {
    return { badge: 'green', hit: true, description: `${actualValue} ≈ ${projection} ✓` };
  } else if (diff <= tolerance) {
    return { badge: 'yellow', hit: false, description: `${actualValue} próximo de ${projection}` };
  } else {
    return { badge: 'red', hit: false, description: `${actualValue} vs projetado ${projection}` };
  }
}

/**
 * Process all ranking lines against final match stats and return badge results.
 */
export function processRankingLines(
  rankingLines: RankingLine[],
  homeTeamName: string,
  awayTeamName: string,
  stats: LiveStats
): BadgeResult[] {
  return rankingLines.map((rl) => {
    const actualValue = resolveActualValue(rl.line, homeTeamName, awayTeamName, stats);
    const { badge, hit, description } = calculateBadge(rl.line, rl.projection, rl.baseline, actualValue);
    return {
      ...rl,
      actualValue,
      badge,
      hit,
      description,
    };
  });
}

/**
 * Compute aggregate accuracy metrics from badge results.
 */
export function computeAccuracyMetrics(results: BadgeResult[]): {
  totalLines: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  hitRate: number;
} {
  const greenCount = results.filter(r => r.badge === 'green').length;
  const yellowCount = results.filter(r => r.badge === 'yellow').length;
  const redCount = results.filter(r => r.badge === 'red').length;
  const totalLines = results.filter(r => r.badge !== 'pending').length;
  const hitRate = totalLines > 0 ? Math.round((greenCount / totalLines) * 100) : 0;

  return { totalLines, greenCount, yellowCount, redCount, hitRate };
}
