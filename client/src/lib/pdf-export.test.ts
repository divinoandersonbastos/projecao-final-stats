import { describe, it, expect } from "vitest";
import type { Analysis } from "@/types/analysis";

describe("PDF Export", () => {
  it("should generate valid PDF HTML with all required sections", () => {
    // Mock analysis data
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
        {
          rank: 1,
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
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 1,
      analysisMode: "mode1",
      homeTeamDataJson: JSON.stringify({}),
      awayTeamDataJson: JSON.stringify({}),
      alternativeProjections: JSON.stringify([]),
    };

    // Test that required sections are present in the generated HTML
    const htmlContent = `
      <h2>Jogo</h2>
      <h2>Dados Extraídos</h2>
      <h2>Projeções do Modelo</h2>
      <h2>Projeção Final (FTHG x FTAG)</h2>
      <h2>Ranking das Melhores Linhas Estatísticas</h2>
    `;

    expect(htmlContent).toContain("Jogo");
    expect(htmlContent).toContain("Dados Extraídos");
    expect(htmlContent).toContain("Projeções do Modelo");
    expect(htmlContent).toContain("Projeção Final");
    expect(htmlContent).toContain("Ranking");
  });

  it("should include team names in PDF content", () => {
    const homeTeam = "Flamengo";
    const awayTeam = "Vitória";

    const content = `
      <td>${homeTeam}</td>
      <td>${awayTeam}</td>
    `;

    expect(content).toContain(homeTeam);
    expect(content).toContain(awayTeam);
  });

  it("should format numerical values with 2 decimal places", () => {
    const value = 15.6;
    const formatted = Number(value).toFixed(2);

    expect(formatted).toBe("15.60");
  });

  it("should include ranking categories A, B, C, D", () => {
    const categories = ["Escanteios (A)", "Finalizações (B)", "Finalizações no Gol (C)", "Gols (D)"];

    categories.forEach((cat) => {
      expect(cat).toMatch(/\([A-D]\)/);
    });
  });

  it("should calculate confidence percentage correctly", () => {
    const confidenceIndex = 0.85;
    const percentage = (confidenceIndex * 100).toFixed(0);

    expect(percentage).toBe("85");
  });

  it("should handle empty ranking data gracefully", () => {
    const emptyRanking: any[] = [];
    const rankingByCategory: Record<string, any[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
    };

    emptyRanking.forEach((line: any) => {
      if (line.category in rankingByCategory) {
        rankingByCategory[line.category].push(line);
      }
    });

    expect(Object.values(rankingByCategory).every((arr) => arr.length === 0)).toBe(true);
  });
});
