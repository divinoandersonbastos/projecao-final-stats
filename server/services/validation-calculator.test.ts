import { describe, it, expect } from "vitest";
import { calculateValidation, classifyError } from "./validation-calculator";

describe("classifyError", () => {
  it("classifies ≤10% as excellent", () => {
    expect(classifyError(0)).toBe("excellent");
    expect(classifyError(5)).toBe("excellent");
    expect(classifyError(10)).toBe("excellent");
    expect(classifyError(-8)).toBe("excellent");
  });

  it("classifies 10-20% as good", () => {
    expect(classifyError(11)).toBe("good");
    expect(classifyError(15)).toBe("good");
    expect(classifyError(20)).toBe("good");
    expect(classifyError(-18)).toBe("good");
  });

  it("classifies 20-35% as medium", () => {
    expect(classifyError(21)).toBe("medium");
    expect(classifyError(30)).toBe("medium");
    expect(classifyError(35)).toBe("medium");
  });

  it("classifies >35% as divergent", () => {
    expect(classifyError(36)).toBe("divergent");
    expect(classifyError(50)).toBe("divergent");
    expect(classifyError(100)).toBe("divergent");
    expect(classifyError(-80)).toBe("divergent");
  });
});

describe("calculateValidation", () => {
  const projected = {
    homeProjectedShots: 15,
    awayProjectedShots: 10,
    homeProjectedShotsOnTarget: 6,
    awayProjectedShotsOnTarget: 3,
    homeProjectedCorners: 5,
    awayProjectedCorners: 4,
    homeProjectedGoals: 1.8,
    awayProjectedGoals: 0.7,
    projectedHomeGoals: 2,
    projectedAwayGoals: 1,
  };

  it("calculates validation with all metrics available", () => {
    const actual = {
      homeGoals: 2,
      awayGoals: 1,
      homeShots: 14,
      awayShots: 11,
      homeShotsOnTarget: 5,
      awayShotsOnTarget: 4,
      homeCorners: 6,
      awayCorners: 3,
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    expect(result.totalMetrics).toBeGreaterThan(0);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(["excellent", "good", "medium", "divergent"]).toContain(result.overallClassification);
    expect(result.excellentCount + result.goodCount + result.mediumCount + result.divergentCount).toBe(result.totalMetrics);
  });

  it("calculates validation with only goals available", () => {
    const actual = {
      homeGoals: 2,
      awayGoals: 1,
      homeShots: null,
      awayShots: null,
      homeShotsOnTarget: null,
      awayShotsOnTarget: null,
      homeCorners: null,
      awayCorners: null,
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    // Only 3 metrics: homeGoals, awayGoals, totalGoals
    expect(result.totalMetrics).toBe(3);
  });

  it("handles perfect prediction", () => {
    const actual = {
      homeGoals: 2,
      awayGoals: 1,
      homeShots: 15,
      awayShots: 10,
      homeShotsOnTarget: 6,
      awayShotsOnTarget: 3,
      homeCorners: 5,
      awayCorners: 4,
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    // Most metrics should be excellent
    expect(result.excellentCount).toBeGreaterThan(result.divergentCount);
    expect(result.overallScore).toBeGreaterThan(70);
  });

  it("handles completely wrong prediction", () => {
    const actual = {
      homeGoals: 0,
      awayGoals: 5,
      homeShots: 3,
      awayShots: 25,
      homeShotsOnTarget: 1,
      awayShotsOnTarget: 12,
      homeCorners: 1,
      awayCorners: 10,
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    expect(result.divergentCount).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThan(70);
  });

  it("includes correct metric labels with team names", () => {
    const actual = {
      homeGoals: 2,
      awayGoals: 1,
      homeShots: null,
      awayShots: null,
      homeShotsOnTarget: null,
      awayShotsOnTarget: null,
      homeCorners: null,
      awayCorners: null,
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    const labels = result.metrics.map((m) => m.metricLabel);
    expect(labels).toContain("Gols Flamengo");
    expect(labels).toContain("Gols Vitória");
    expect(labels).toContain("Total de Gols");
  });

  it("calculates error percentages correctly", () => {
    const actual = {
      homeGoals: 2,
      awayGoals: 0,
      homeShots: null,
      awayShots: null,
      homeShotsOnTarget: null,
      awayShotsOnTarget: null,
      homeCorners: null,
      awayCorners: null,
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    // homeGoals: projected 2, actual 2 → 0% error
    const homeGoalsMetric = result.metrics.find((m) => m.metric === "homeGoals");
    expect(homeGoalsMetric?.absoluteError).toBe(0);
    expect(homeGoalsMetric?.percentError).toBe(0);
    expect(homeGoalsMetric?.classification).toBe("excellent");

    // awayGoals: projected 1, actual 0 → 100% error (division by zero handled)
    const awayGoalsMetric = result.metrics.find((m) => m.metric === "awayGoals");
    expect(awayGoalsMetric?.absoluteError).toBe(1);
    expect(awayGoalsMetric?.percentError).toBe(100);
    expect(awayGoalsMetric?.classification).toBe("divergent");
  });
});
