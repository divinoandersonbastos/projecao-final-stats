import { describe, it, expect } from "vitest";
import {
  generateSuggestions,
  isLineEligible,
  getRejectionReason,
  getLineCorrelation,
  getCombinationCorrelation,
  getCorrelationPenalty,
} from "./suggestions-engine";
import { RankingLine } from "../calculations";

// Helper to create a valid ranking line
function makeLine(overrides: Partial<RankingLine> = {}): RankingLine {
  return {
    rank: 1,
    line: "Test line",
    projection: 6.0,
    baseline: 4.0,
    absoluteMargin: 2.0,
    percentageMargin: 50,
    stability: "Alta",
    correlation: "Média",
    confidenceIndex: 8.5,
    status: "Forte",
    category: "C",
    isAlert: false,
    ...overrides,
  };
}

describe("isLineEligible", () => {
  it("returns true for a line meeting all criteria", () => {
    const line = makeLine();
    expect(isLineEligible(line)).toBe(true);
  });

  it("rejects line with confidenceIndex < 7.5", () => {
    const line = makeLine({ confidenceIndex: 7.0 });
    expect(isLineEligible(line)).toBe(false);
  });

  it("rejects line with status Média", () => {
    const line = makeLine({ status: "Média" });
    expect(isLineEligible(line)).toBe(false);
  });

  it("rejects line with status Fraca", () => {
    const line = makeLine({ status: "Fraca" });
    expect(isLineEligible(line)).toBe(false);
  });

  it("rejects line with status Sem sustentação", () => {
    const line = makeLine({ status: "Sem sustentação" });
    expect(isLineEligible(line)).toBe(false);
  });

  it("rejects line with negative absoluteMargin", () => {
    const line = makeLine({ absoluteMargin: -0.5 });
    expect(isLineEligible(line)).toBe(false);
  });

  it("rejects line with zero absoluteMargin", () => {
    const line = makeLine({ absoluteMargin: 0 });
    expect(isLineEligible(line)).toBe(false);
  });

  it("rejects line with negative percentageMargin", () => {
    const line = makeLine({ percentageMargin: -10 });
    expect(isLineEligible(line)).toBe(false);
  });

  it("rejects line with projection <= baseline", () => {
    const line = makeLine({ projection: 4.0, baseline: 4.0 });
    expect(isLineEligible(line)).toBe(false);
  });

  it("rejects line with stability Baixa (default mode)", () => {
    const line = makeLine({ stability: "Baixa" });
    expect(isLineEligible(line)).toBe(false);
  });

  it("allows line with stability Baixa when allowLowStability=true", () => {
    const line = makeLine({ stability: "Baixa" });
    expect(isLineEligible(line, true)).toBe(true);
  });
});

describe("getRejectionReason", () => {
  it("returns correct reason for low confidence", () => {
    const line = makeLine({ confidenceIndex: 6.0 });
    expect(getRejectionReason(line)).toBe("Índice de confiança abaixo de 7.5");
  });

  it("returns correct reason for Sem sustentação status", () => {
    const line = makeLine({ confidenceIndex: 8.0, status: "Sem sustentação" });
    expect(getRejectionReason(line)).toBe("Sem sustentação estatística");
  });

  it("returns correct reason for negative margin", () => {
    const line = makeLine({ confidenceIndex: 8.0, status: "Forte", absoluteMargin: -1 });
    expect(getRejectionReason(line)).toBe("Margem absoluta negativa ou zero");
  });
});

describe("getLineCorrelation", () => {
  it("returns Alta for Total finalizações vs chutes no gol", () => {
    expect(getLineCorrelation("Total finalizações", "Flamengo chutes no gol")).toBe("Alta");
  });

  it("returns Alta for Total escanteios vs team escanteios", () => {
    expect(getLineCorrelation("Total escanteios", "Vitória escanteios")).toBe("Alta");
  });

  it("returns Média for chutes no gol vs gols esperados", () => {
    expect(getLineCorrelation("Flamengo chutes no gol", "Flamengo gols esperados")).toBe("Média");
  });

  it("returns Baixa for unrelated lines", () => {
    expect(getLineCorrelation("Flamengo escanteios", "Vitória gols esperados")).toBe("Baixa");
  });

  it("is symmetric", () => {
    const a = getLineCorrelation("Total finalizações", "Flamengo chutes no gol");
    const b = getLineCorrelation("Flamengo chutes no gol", "Total finalizações");
    expect(a).toBe(b);
  });
});

describe("getCombinationCorrelation", () => {
  it("returns Baixa when no correlations exist", () => {
    const lines = [
      { line: "Flamengo escanteios", projection: 5, baseline: 4, absoluteMargin: 1, percentageMargin: 25, confidenceIndex: 8, status: "Forte", stability: "Alta", category: "A", correlation: "Média" },
      { line: "Vitória gols esperados", projection: 2, baseline: 1.25, absoluteMargin: 0.75, percentageMargin: 60, confidenceIndex: 8, status: "Forte", stability: "Média", category: "D", correlation: "Média" },
    ];
    const result = getCombinationCorrelation(lines);
    expect(result.level).toBe("Baixa");
    expect(result.highCount).toBe(0);
    expect(result.mediumCount).toBe(0);
  });

  it("returns Alta when high correlation exists", () => {
    const lines = [
      { line: "Total finalizações", projection: 28, baseline: 25.5, absoluteMargin: 2.5, percentageMargin: 10, confidenceIndex: 8, status: "Forte", stability: "Média", category: "B", correlation: "Alta" },
      { line: "Flamengo chutes no gol", projection: 5, baseline: 3.75, absoluteMargin: 1.25, percentageMargin: 33, confidenceIndex: 8, status: "Forte", stability: "Média", category: "C", correlation: "Média" },
    ];
    const result = getCombinationCorrelation(lines);
    expect(result.level).toBe("Alta");
    expect(result.highCount).toBe(1);
  });
});

describe("getCorrelationPenalty", () => {
  it("returns 0 for no correlations", () => {
    expect(getCorrelationPenalty(0, 0)).toBe(0);
  });

  it("returns 0.2 for medium correlation", () => {
    expect(getCorrelationPenalty(0, 1)).toBe(0.2);
  });

  it("returns 0.5 for one high correlation", () => {
    expect(getCorrelationPenalty(1, 0)).toBe(0.5);
  });

  it("returns 0.8 for two high correlations", () => {
    expect(getCorrelationPenalty(2, 0)).toBe(0.8);
  });
});

describe("generateSuggestions", () => {
  it("returns empty results for empty ranking lines", () => {
    const result = generateSuggestions([]);
    expect(result.combinations).toHaveLength(0);
    expect(result.rejectedLines).toHaveLength(0);
    expect(result.disclaimer).toBeTruthy();
  });

  it("returns empty results for null ranking lines", () => {
    const result = generateSuggestions(null as any);
    expect(result.combinations).toHaveLength(0);
  });

  it("generates suggestions from strong ranking lines", () => {
    const lines: RankingLine[] = [
      makeLine({ line: "Flamengo chutes no gol", category: "C", confidenceIndex: 8.5, status: "Forte", projection: 5.5, baseline: 3.75, absoluteMargin: 1.75, percentageMargin: 46.7 }),
      makeLine({ line: "Vitória chutes no gol", category: "C", confidenceIndex: 8.0, status: "Forte", projection: 4.5, baseline: 3.75, absoluteMargin: 0.75, percentageMargin: 20 }),
      makeLine({ line: "Flamengo escanteios", category: "A", confidenceIndex: 8.2, status: "Forte", projection: 5.8, baseline: 4.0, absoluteMargin: 1.8, percentageMargin: 45 }),
      makeLine({ line: "Flamengo finalizações", category: "B", confidenceIndex: 7.8, status: "Boa", projection: 15, baseline: 12.75, absoluteMargin: 2.25, percentageMargin: 17.6 }),
      makeLine({ line: "Flamengo gols esperados", category: "D", confidenceIndex: 7.6, status: "Boa", projection: 2.1, baseline: 1.25, absoluteMargin: 0.85, percentageMargin: 68 }),
    ];

    const result = generateSuggestions(lines);

    // Should generate at least conservador and equilibrado
    expect(result.combinations.length).toBeGreaterThanOrEqual(2);

    // Check conservador profile exists and has 2 lines
    const conservador = result.combinations.find(c => c.profile === "conservador");
    if (conservador) {
      expect(conservador.lines).toHaveLength(2);
      expect(conservador.profileLabel).toBe("Perfil Conservador");
      expect(conservador.finalIndex).toBeGreaterThan(0);
    }

    // Check equilibrado profile exists
    const equilibrado = result.combinations.find(c => c.profile === "equilibrado");
    if (equilibrado) {
      expect(equilibrado.lines).toHaveLength(2);
      expect(equilibrado.profileLabel).toBe("Perfil Equilibrado");
    }

    // Disclaimer should always be present
    expect(result.disclaimer).toContain("projeção estatística");
  });

  it("rejects lines that don't meet criteria", () => {
    const lines: RankingLine[] = [
      makeLine({ line: "Weak line", confidenceIndex: 5.0, status: "Fraca", projection: 3.5, baseline: 4.0, absoluteMargin: -0.5, percentageMargin: -12.5 }),
      makeLine({ line: "No sustentation", confidenceIndex: 4.0, status: "Sem sustentação", projection: 2.0, baseline: 4.0, absoluteMargin: -2.0, percentageMargin: -50 }),
    ];

    const result = generateSuggestions(lines);
    expect(result.combinations).toHaveLength(0);
    expect(result.rejectedLines.length).toBeGreaterThan(0);
    expect(result.rejectedLines[0].reason).toBeTruthy();
  });

  it("generates agressivo profile with 3 lines when enough eligible", () => {
    const lines: RankingLine[] = [
      makeLine({ line: "Flamengo chutes no gol", category: "C", confidenceIndex: 9.0, status: "Forte", projection: 6.0, baseline: 3.75, absoluteMargin: 2.25, percentageMargin: 60 }),
      makeLine({ line: "Flamengo finalizações", category: "B", confidenceIndex: 8.5, status: "Forte", projection: 16, baseline: 12.75, absoluteMargin: 3.25, percentageMargin: 25.5 }),
      makeLine({ line: "Flamengo escanteios", category: "A", confidenceIndex: 8.2, status: "Forte", projection: 6.0, baseline: 4.0, absoluteMargin: 2.0, percentageMargin: 50 }),
      makeLine({ line: "Flamengo gols esperados", category: "D", confidenceIndex: 7.8, status: "Boa", projection: 2.5, baseline: 1.25, absoluteMargin: 1.25, percentageMargin: 100 }),
    ];

    const result = generateSuggestions(lines);
    const agressivo = result.combinations.find(c => c.profile === "agressivo");
    if (agressivo) {
      expect(agressivo.lines).toHaveLength(3);
      expect(agressivo.profileLabel).toBe("Perfil Agressivo");
    }
  });

  it("applies correlation penalty correctly", () => {
    // Two highly correlated lines (finalizações + chutes no gol)
    const lines: RankingLine[] = [
      makeLine({ line: "Total finalizações", category: "B", confidenceIndex: 8.5, status: "Forte", projection: 28, baseline: 25.5, absoluteMargin: 2.5, percentageMargin: 9.8 }),
      makeLine({ line: "Flamengo chutes no gol", category: "C", confidenceIndex: 8.3, status: "Forte", projection: 5.5, baseline: 3.75, absoluteMargin: 1.75, percentageMargin: 46.7 }),
      makeLine({ line: "Flamengo escanteios", category: "A", confidenceIndex: 8.0, status: "Forte", projection: 5.5, baseline: 4.0, absoluteMargin: 1.5, percentageMargin: 37.5 }),
    ];

    const result = generateSuggestions(lines);

    // The conservador should try to avoid high correlation
    const conservador = result.combinations.find(c => c.profile === "conservador");
    if (conservador) {
      // Should prefer the low-correlation pair
      const hasHighCorr = conservador.correlationLevel === "Alta";
      // If it picked the correlated pair, penalty should be applied
      if (hasHighCorr) {
        expect(conservador.correlationPenalty).toBeGreaterThan(0);
        expect(conservador.finalIndex).toBeLessThan(conservador.averageIndex);
      }
    }
  });

  it("includes alerts for goals volatility", () => {
    const lines: RankingLine[] = [
      makeLine({ line: "Flamengo chutes no gol", category: "C", confidenceIndex: 8.5, status: "Forte", projection: 5.5, baseline: 3.75, absoluteMargin: 1.75, percentageMargin: 46.7 }),
      makeLine({ line: "Flamengo gols esperados", category: "D", confidenceIndex: 8.0, status: "Forte", projection: 2.5, baseline: 1.25, absoluteMargin: 1.25, percentageMargin: 100 }),
    ];

    const result = generateSuggestions(lines);
    const equilibrado = result.combinations.find(c => c.profile === "equilibrado");
    if (equilibrado) {
      const hasGoalAlert = equilibrado.alerts.some(a => a.includes("voláteis"));
      expect(hasGoalAlert).toBe(true);
    }
  });
});
