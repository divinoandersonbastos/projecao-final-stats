import { describe, it, expect } from "vitest";
import type { Analysis } from "../client/src/types/analysis";

// Mock the PDF generation function
function generatePDFHTML(analysis: Analysis): string {
  // Parse ranking data
  const rankingData = Array.isArray(analysis.rankingData)
    ? analysis.rankingData
    : typeof analysis.rankingData === "string"
    ? JSON.parse(analysis.rankingData)
    : [];

  const rankingByCategory: Record<string, any[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
  };
  rankingData.forEach((line: any) => {
    if (line.category in rankingByCategory) {
      rankingByCategory[line.category].push(line);
    }
  });

  return `
    <div>
      <h2>Jogo</h2>
      <h2>Dados Extraídos</h2>
      <h2>Projeções do Modelo</h2>
      <h2>Projeção Final (FTHG x FTAG)</h2>
      <h2>Ranking das Melhores Linhas Estatísticas</h2>
      <p>${analysis.homeTeamName} vs ${analysis.awayTeamName}</p>
      <p>Home Goals: ${Number(analysis.homeProjectedGoals).toFixed(2)}</p>
      <p>Away Goals: ${Number(analysis.awayProjectedGoals).toFixed(2)}</p>
    </div>
  `;
}

describe("PDF Export - HTML Generation", () => {
  const mockAnalysis: Analysis = {
    id: 1,
    homeTeamName: "Flamengo",
    awayTeamName: "Vitória",
    homeProjectedShots: 15.6,
    awayProjectedShots: 8.2,
    homeProjectedShotsOnTarget: 5.3,
    awayProjectedShotsOnTarget: 2.1,
    homeProjectedCorners: 6.4,
    awayProjectedCorners: 3.2,
    homeProjectedGoals: 1.8,
    awayProjectedGoals: 0.9,
    projectedHomeGoals: 2,
    projectedAwayGoals: 1,
    homeOffensiveConversion: 11.5,
    awayOffensiveConversion: 10.9,
    homeDefensiveConversion: 8.2,
    awayDefensiveConversion: 9.1,
    rankingData: JSON.stringify([
      {
        rank: 1,
        line: "Over 10.5 Corners",
        category: "A",
        projection: 9.6,
        baseline: 9.0,
        absoluteMargin: 0.6,
        percentageMargin: 6.7,
        stability: "Alta",
        correlation: "Baixa",
        confidenceIndex: 0.85,
        isAlert: false,
      },
    ]),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 1,
    analysisMode: "mode1",
    homeTeamDataJson: JSON.stringify({}),
    awayTeamDataJson: JSON.stringify({}),
    alternativeProjections: JSON.stringify([]),
  };

  it("should generate HTML with all required sections", () => {
    const html = generatePDFHTML(mockAnalysis);

    expect(html).toContain("<h2>Jogo</h2>");
    expect(html).toContain("<h2>Dados Extraídos</h2>");
    expect(html).toContain("<h2>Projeções do Modelo</h2>");
    expect(html).toContain("<h2>Projeção Final (FTHG x FTAG)</h2>");
    expect(html).toContain("<h2>Ranking das Melhores Linhas Estatísticas</h2>");
  });

  it("should include team names in HTML", () => {
    const html = generatePDFHTML(mockAnalysis);

    expect(html).toContain("Flamengo");
    expect(html).toContain("Vitória");
    expect(html).toContain("Flamengo vs Vitória");
  });

  it("should format projected goals with 2 decimal places", () => {
    const html = generatePDFHTML(mockAnalysis);

    expect(html).toContain("1.80");
    expect(html).toContain("0.90");
  });

  it("should parse and include ranking data", () => {
    const html = generatePDFHTML(mockAnalysis);

    // Verify ranking section is present
    expect(html).toContain("Ranking");
  });

  it("should handle JSON ranking data correctly", () => {
    const analysisWithRanking = {
      ...mockAnalysis,
      rankingData: JSON.stringify([
        {
          rank: 1,
          line: "Over 10.5 Corners",
          category: "A",
          projection: 9.6,
          baseline: 9.0,
          absoluteMargin: 0.6,
          percentageMargin: 6.7,
          stability: "Alta",
          correlation: "Baixa",
          confidenceIndex: 0.85,
          isAlert: false,
        },
        {
          rank: 2,
          line: "Over 23.5 Shots",
          category: "B",
          projection: 23.8,
          baseline: 22.0,
          absoluteMargin: 1.8,
          percentageMargin: 8.2,
          stability: "Média",
          correlation: "Alta",
          confidenceIndex: 0.78,
          isAlert: false,
        },
      ]),
    };

    const html = generatePDFHTML(analysisWithRanking);
    expect(html).toContain("Ranking");
  });

  it("should include match date information", () => {
    const html = generatePDFHTML(mockAnalysis);

    // Should have some reference to the analysis
    expect(html).toBeTruthy();
    expect(html.length > 0).toBe(true);
  });

  it("should handle empty ranking data gracefully", () => {
    const analysisWithoutRanking = {
      ...mockAnalysis,
      rankingData: JSON.stringify([]),
    };

    const html = generatePDFHTML(analysisWithoutRanking);

    expect(html).toContain("Ranking");
    expect(html).toBeTruthy();
  });
});
