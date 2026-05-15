/**
 * Suggestions Engine - Módulo "Sugestões Estatísticas do Modelo"
 * 
 * Gera combinações de 2 ou 3 linhas estatísticas com base no ranking do modelo,
 * usando apenas linhas com boa sustentação estatística.
 * 
 * Perfis: Conservador (2 linhas), Equilibrado (2 linhas), Agressivo (3 linhas)
 */

import { RankingLine } from "../calculations";

// ============================================================
// TYPES
// ============================================================

export interface SuggestionLine {
  line: string;
  projection: number;
  baseline: number;
  absoluteMargin: number;
  percentageMargin: number;
  confidenceIndex: number;
  status: string;
  stability: string;
  category: string;
  correlation: string;
}

export interface SuggestionCombination {
  profile: "conservador" | "equilibrado" | "agressivo";
  profileLabel: string;
  profileTag: string;
  lines: SuggestionLine[];
  averageIndex: number;
  correlationLevel: "Baixa" | "Média" | "Alta";
  correlationPenalty: number;
  finalIndex: number;
  finalStatus: "Forte" | "Boa" | "Média" | "Não sugerir";
  alerts: string[];
}

export interface RejectedLine {
  line: string;
  projection: number;
  baseline: number;
  absoluteMargin: number;
  reason: string;
}

export interface SuggestionsResult {
  combinations: SuggestionCombination[];
  rejectedLines: RejectedLine[];
  disclaimer: string;
}

// ============================================================
// METRIC HIERARCHY (priority order for selection)
// ============================================================

// Category C = Chutes no gol (priority 1)
// Category B = Finalizações (priority 2)
// Category A = Escanteios (priority 3)
// Category D = Gols (priority 4)
const METRIC_PRIORITY: Record<string, number> = {
  "C": 1, // Chutes no gol / finalizações no gol
  "B": 2, // Finalizações totais
  "A": 3, // Escanteios
  "D": 4, // Gols
};

// ============================================================
// CORRELATION MATRIX
// ============================================================

interface CorrelationPair {
  patterns: [RegExp, RegExp];
  level: "Alta" | "Média" | "Baixa";
}

const CORRELATION_PAIRS: CorrelationPair[] = [
  // Alta correlação
  { patterns: [/^Total chutes no gol$/, /chutes no gol$/], level: "Alta" },
  { patterns: [/^Total escanteios$/, /escanteios$/], level: "Alta" },
  { patterns: [/^Total finalizações$/, /finalizações$/], level: "Alta" },
  { patterns: [/finalizações$/, /chutes no gol$/], level: "Alta" },
  { patterns: [/gols esperados$/, /^Total gols$/], level: "Alta" },

  // Média correlação
  { patterns: [/chutes no gol$/, /gols esperados$/], level: "Média" },
  { patterns: [/finalizações$/, /escanteios$/], level: "Média" },
  { patterns: [/chutes no gol$/, /^Total gols$/], level: "Média" },
  { patterns: [/finalizações$/, /gols esperados$/], level: "Média" },
];

/**
 * Determine correlation level between two lines
 */
function getLineCorrelation(line1: string, line2: string): "Baixa" | "Média" | "Alta" {
  for (const pair of CORRELATION_PAIRS) {
    const [p1, p2] = pair.patterns;
    if ((p1.test(line1) && p2.test(line2)) || (p1.test(line2) && p2.test(line1))) {
      return pair.level;
    }
  }
  return "Baixa";
}

/**
 * Get overall correlation for a combination of lines
 */
function getCombinationCorrelation(lines: SuggestionLine[]): {
  level: "Baixa" | "Média" | "Alta";
  highCount: number;
  mediumCount: number;
} {
  let highCount = 0;
  let mediumCount = 0;

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const corr = getLineCorrelation(lines[i].line, lines[j].line);
      if (corr === "Alta") highCount++;
      if (corr === "Média") mediumCount++;
    }
  }

  let level: "Baixa" | "Média" | "Alta" = "Baixa";
  if (highCount >= 1) level = "Alta";
  else if (mediumCount >= 1) level = "Média";

  return { level, highCount, mediumCount };
}

/**
 * Calculate correlation penalty
 */
function getCorrelationPenalty(highCount: number, mediumCount: number): number {
  if (highCount >= 2) return 0.8;
  if (highCount === 1) return 0.5;
  if (mediumCount >= 1) return 0.2;
  return 0;
}

// ============================================================
// ELIGIBILITY CRITERIA
// ============================================================

/**
 * Check if a line is eligible for suggestions (all criteria must pass)
 */
function isLineEligible(line: RankingLine, allowLowStability: boolean = false): boolean {
  // Índice de confiança >= 7.5
  if (line.confidenceIndex < 7.5) return false;

  // Status = Forte ou Boa
  if (line.status !== "Forte" && line.status !== "Boa") return false;

  // Margem absoluta positiva
  if (line.absoluteMargin <= 0) return false;

  // Margem percentual positiva
  if (line.percentageMargin <= 0) return false;

  // Projeção acima da linha-base (OVER lines: projection > baseline)
  if (line.projection <= line.baseline) return false;

  // Estabilidade diferente de "Baixa" (exceto perfil agressivo)
  if (!allowLowStability && line.stability === "Baixa") return false;

  return true;
}

/**
 * Get rejection reason for a line
 */
function getRejectionReason(line: RankingLine): string {
  if (line.confidenceIndex < 7.5) return "Índice de confiança abaixo de 7.5";
  if (line.status === "Média") return "Status Média";
  if (line.status === "Fraca") return "Status Fraca";
  if (line.status === "Sem sustentação") return "Sem sustentação estatística";
  if (line.absoluteMargin <= 0) return "Margem absoluta negativa ou zero";
  if (line.percentageMargin <= 0) return "Margem percentual negativa ou zero";
  if (line.projection <= line.baseline) return "Projeção abaixo da linha-base";
  if (line.stability === "Baixa") return "Estabilidade baixa";
  return "Não atende critérios mínimos";
}

// ============================================================
// PROFILE GENERATORS
// ============================================================

/**
 * Check if a line is a "volume" metric (shots, shots on target, corners)
 */
function isVolumeMetric(line: RankingLine): boolean {
  return line.category === "C" || line.category === "B" || line.category === "A";
}

/**
 * Check if a line is a "goals" metric
 */
function isGoalsMetric(line: RankingLine): boolean {
  return line.category === "D";
}

/**
 * Convert RankingLine to SuggestionLine
 */
function toSuggestionLine(line: RankingLine): SuggestionLine {
  return {
    line: line.line,
    projection: line.projection,
    baseline: line.baseline,
    absoluteMargin: line.absoluteMargin,
    percentageMargin: line.percentageMargin,
    confidenceIndex: line.confidenceIndex,
    status: line.status,
    stability: line.stability,
    category: line.category,
    correlation: line.correlation,
  };
}

/**
 * Build a combination from selected lines
 */
function buildCombination(
  profile: "conservador" | "equilibrado" | "agressivo",
  profileLabel: string,
  profileTag: string,
  selectedLines: RankingLine[]
): SuggestionCombination | null {
  if (selectedLines.length < 2) return null;

  const suggestionLines = selectedLines.map(toSuggestionLine);
  const averageIndex = suggestionLines.reduce((sum, l) => sum + l.confidenceIndex, 0) / suggestionLines.length;

  const { level, highCount, mediumCount } = getCombinationCorrelation(suggestionLines);
  const penalty = getCorrelationPenalty(highCount, mediumCount);
  const finalIndex = Math.round((averageIndex - penalty) * 100) / 100;

  // Determine final status
  let finalStatus: "Forte" | "Boa" | "Média" | "Não sugerir";
  if (finalIndex >= 8.0) finalStatus = "Forte";
  else if (finalIndex >= 7.0) finalStatus = "Boa";
  else if (finalIndex >= 6.0) finalStatus = "Média";
  else finalStatus = "Não sugerir";

  // Generate alerts
  const alerts: string[] = [];
  if (highCount >= 2) {
    alerts.push("Combinação dependente do mesmo roteiro de jogo.");
  } else if (highCount === 1) {
    alerts.push("As linhas dependem parcialmente do mesmo roteiro ofensivo.");
  }

  // Check for goals volatility
  const hasGoals = selectedLines.some(l => isGoalsMetric(l));
  if (hasGoals) {
    alerts.push("Gols são mais voláteis que métricas de volume.");
  }

  // Check for low stability
  const hasLowStability = selectedLines.some(l => l.stability === "Baixa");
  if (hasLowStability) {
    alerts.push("Contém linha com estabilidade baixa.");
  }

  return {
    profile,
    profileLabel,
    profileTag,
    lines: suggestionLines,
    averageIndex: Math.round(averageIndex * 100) / 100,
    correlationLevel: level,
    correlationPenalty: penalty,
    finalIndex,
    finalStatus,
    alerts,
  };
}

/**
 * Generate Conservative profile (2 lines, volume, avoid high correlation)
 */
function generateConservador(eligibleLines: RankingLine[]): SuggestionCombination | null {
  // Filter for volume metrics only, sorted by priority then confidence
  const volumeLines = eligibleLines
    .filter(l => isVolumeMetric(l))
    .sort((a, b) => {
      // First by metric priority (C > B > A)
      const priorityDiff = (METRIC_PRIORITY[a.category] || 99) - (METRIC_PRIORITY[b.category] || 99);
      if (priorityDiff !== 0) return priorityDiff;
      // Then by confidence index
      return b.confidenceIndex - a.confidenceIndex;
    });

  if (volumeLines.length < 2) {
    // Fallback: use any eligible lines
    const sorted = [...eligibleLines].sort((a, b) => b.confidenceIndex - a.confidenceIndex);
    if (sorted.length < 2) return null;

    // Try to find pair with low correlation
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const corr = getLineCorrelation(sorted[i].line, sorted[j].line);
        if (corr !== "Alta") {
          return buildCombination("conservador", "Perfil Conservador", "Menor volatilidade", [sorted[i], sorted[j]]);
        }
      }
    }
    // If all have high correlation, use top 2
    return buildCombination("conservador", "Perfil Conservador", "Menor volatilidade", [sorted[0], sorted[1]]);
  }

  // Try to find 2 volume lines with low/medium correlation
  for (let i = 0; i < volumeLines.length; i++) {
    for (let j = i + 1; j < volumeLines.length; j++) {
      const corr = getLineCorrelation(volumeLines[i].line, volumeLines[j].line);
      if (corr !== "Alta") {
        return buildCombination("conservador", "Perfil Conservador", "Menor volatilidade", [volumeLines[i], volumeLines[j]]);
      }
    }
  }

  // If no low-correlation pair, use top 2 volume lines
  return buildCombination("conservador", "Perfil Conservador", "Menor volatilidade", [volumeLines[0], volumeLines[1]]);
}

/**
 * Generate Balanced profile (2 lines, 1 volume + 1 goals if possible)
 */
function generateEquilibrado(eligibleLines: RankingLine[]): SuggestionCombination | null {
  const volumeLines = eligibleLines
    .filter(l => isVolumeMetric(l))
    .sort((a, b) => b.confidenceIndex - a.confidenceIndex);

  const goalLines = eligibleLines
    .filter(l => isGoalsMetric(l))
    .sort((a, b) => b.confidenceIndex - a.confidenceIndex);

  // Ideal: 1 volume + 1 goals
  if (volumeLines.length >= 1 && goalLines.length >= 1) {
    return buildCombination("equilibrado", "Perfil Equilibrado", "Volume + conversão", [volumeLines[0], goalLines[0]]);
  }

  // Fallback: top 2 eligible lines
  const sorted = [...eligibleLines].sort((a, b) => b.confidenceIndex - a.confidenceIndex);
  if (sorted.length < 2) return null;
  return buildCombination("equilibrado", "Perfil Equilibrado", "Volume + conversão", [sorted[0], sorted[1]]);
}

/**
 * Generate Aggressive profile (3 lines, allow high correlation)
 */
function generateAgressivo(allLines: RankingLine[]): SuggestionCombination | null {
  // For aggressive, allow low stability
  const eligible = allLines
    .filter(l => isLineEligible(l, true))
    .sort((a, b) => {
      const priorityDiff = (METRIC_PRIORITY[a.category] || 99) - (METRIC_PRIORITY[b.category] || 99);
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidenceIndex - a.confidenceIndex;
    });

  if (eligible.length < 3) return null;

  // Pick top 3 by priority and confidence
  const selected = eligible.slice(0, 3);
  return buildCombination("agressivo", "Perfil Agressivo", "Maior dependência do roteiro", selected);
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Generate statistical suggestions from ranking lines
 */
export function generateSuggestions(rankingLines: RankingLine[]): SuggestionsResult {
  const disclaimer = "As sugestões são baseadas em projeção estatística e não representam garantia de resultado.";

  if (!rankingLines || rankingLines.length === 0) {
    return { combinations: [], rejectedLines: [], disclaimer };
  }

  // Separate eligible and rejected lines
  const eligibleLines = rankingLines.filter(l => isLineEligible(l, false));
  const rejectedLines: RejectedLine[] = rankingLines
    .filter(l => !isLineEligible(l, true))
    .map(l => ({
      line: l.line,
      projection: l.projection,
      baseline: l.baseline,
      absoluteMargin: l.absoluteMargin,
      reason: getRejectionReason(l),
    }));

  // Generate combinations
  const combinations: SuggestionCombination[] = [];

  // Conservador
  const conservador = generateConservador(eligibleLines);
  if (conservador && conservador.finalStatus !== "Não sugerir") {
    combinations.push(conservador);
  }

  // Equilibrado
  const equilibrado = generateEquilibrado(eligibleLines);
  if (equilibrado && equilibrado.finalStatus !== "Não sugerir") {
    combinations.push(equilibrado);
  }

  // Agressivo
  const agressivo = generateAgressivo(rankingLines);
  if (agressivo && agressivo.finalStatus !== "Não sugerir") {
    combinations.push(agressivo);
  }

  return { combinations, rejectedLines, disclaimer };
}

// Export for testing
export {
  isLineEligible,
  getRejectionReason,
  getLineCorrelation,
  getCombinationCorrelation,
  getCorrelationPenalty,
  generateConservador,
  generateEquilibrado,
  generateAgressivo,
};
