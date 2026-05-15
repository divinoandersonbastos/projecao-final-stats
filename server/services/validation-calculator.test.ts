import { describe, it, expect } from "vitest";
import { calculateValidation, classifyError, isMetricAchieved } from "./validation-calculator";

describe("classifyError (new binary logic)", () => {
  it("classifies projected <= actual as excellent (achieved)", () => {
    // projected <= actual → achieved → "excellent"
    expect(classifyError(2, 3)).toBe("excellent");   // 2 <= 3
    expect(classifyError(2, 2)).toBe("excellent");   // 2 <= 2 (equal)
    expect(classifyError(0, 5)).toBe("excellent");   // 0 <= 5
    expect(classifyError(1.5, 2)).toBe("excellent"); // 1.5 <= 2
  });

  it("classifies projected > actual as divergent (not achieved)", () => {
    // projected > actual → not achieved → "divergent"
    expect(classifyError(3, 2)).toBe("divergent");   // 3 > 2
    expect(classifyError(5, 0)).toBe("divergent");   // 5 > 0
    expect(classifyError(10, 9)).toBe("divergent");  // 10 > 9
    expect(classifyError(2.1, 2)).toBe("divergent"); // 2.1 > 2
  });
});

describe("isMetricAchieved (new binary logic)", () => {
  it("returns true when projected <= actual", () => {
    expect(isMetricAchieved(2, 3)).toBe(true);  // 2 <= 3
    expect(isMetricAchieved(2, 2)).toBe(true);  // 2 <= 2
    expect(isMetricAchieved(0, 0)).toBe(true);  // 0 <= 0
  });

  it("returns false when projected > actual", () => {
    expect(isMetricAchieved(3, 2)).toBe(false); // 3 > 2
    expect(isMetricAchieved(5, 0)).toBe(false); // 5 > 0
    expect(isMetricAchieved(1, 0)).toBe(false); // 1 > 0
  });
});

describe("calculateValidation (new binary logic)", () => {
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

    expect(result.totalMetrics).toBe(12); // 3 goals + 3 shots + 3 shotsOnTarget + 3 corners
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(["excellent", "good", "medium", "divergent"]).toContain(result.overallClassification);
    // In new logic: excellentCount = achieved, divergentCount = not achieved, good/medium = 0
    expect(result.goodCount).toBe(0);
    expect(result.mediumCount).toBe(0);
    expect(result.excellentCount + result.divergentCount).toBe(result.totalMetrics);
    expect(result.achievedCount).toBe(result.excellentCount);
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

  it("handles projection <= actual (all achieved)", () => {
    // All projected values are <= actual values
    const actual = {
      homeGoals: 3,     // projected 2 <= 3 → achieved
      awayGoals: 2,     // projected 1 <= 2 → achieved
      homeShots: 20,    // projected 15 <= 20 → achieved
      awayShots: 12,    // projected 10 <= 12 → achieved
      homeShotsOnTarget: 8,  // projected 6 <= 8 → achieved
      awayShotsOnTarget: 5,  // projected 3 <= 5 → achieved
      homeCorners: 7,   // projected 5 <= 7 → achieved
      awayCorners: 6,   // projected 4 <= 6 → achieved
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    // All metrics achieved (projected <= actual)
    expect(result.achievedCount).toBe(result.totalMetrics);
    expect(result.excellentCount).toBe(result.totalMetrics);
    expect(result.divergentCount).toBe(0);
    expect(result.overallScore).toBe(100);
    expect(result.overallClassification).toBe("excellent");
  });

  it("handles projection > actual (all not achieved)", () => {
    // All projected values are > actual values
    const actual = {
      homeGoals: 0,     // projected 2 > 0 → not achieved
      awayGoals: 0,     // projected 1 > 0 → not achieved
      homeShots: 10,    // projected 15 > 10 → not achieved
      awayShots: 5,     // projected 10 > 5 → not achieved
      homeShotsOnTarget: 3,  // projected 6 > 3 → not achieved
      awayShotsOnTarget: 1,  // projected 3 > 1 → not achieved
      homeCorners: 2,   // projected 5 > 2 → not achieved
      awayCorners: 2,   // projected 4 > 2 → not achieved
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    // No metrics achieved (all projected > actual)
    expect(result.achievedCount).toBe(0);
    expect(result.excellentCount).toBe(0);
    expect(result.divergentCount).toBe(result.totalMetrics);
    expect(result.overallScore).toBe(0);
    expect(result.overallClassification).toBe("divergent");
  });

  it("handles mixed results (some achieved, some not)", () => {
    const actual = {
      homeGoals: 2,     // projected 2 <= 2 → achieved (equal)
      awayGoals: 0,     // projected 1 > 0 → not achieved
      homeShots: 20,    // projected 15 <= 20 → achieved
      awayShots: 8,     // projected 10 > 8 → not achieved
      homeShotsOnTarget: null,
      awayShotsOnTarget: null,
      homeCorners: null,
      awayCorners: null,
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    // 6 metrics: 3 goals + 3 shots (shotsOnTarget and corners are null)
    // homeGoals: 2 <= 2 → achieved
    // awayGoals: 1 > 0 → not achieved
    // totalGoals: 3 > 2 → not achieved
    // homeShots: 15 <= 20 → achieved
    // awayShots: 10 > 8 → not achieved
    // totalShots: 25 <= 28 → achieved
    expect(result.totalMetrics).toBe(6);
    
    // Check specific metrics
    const homeGoals = result.metrics.find(m => m.metric === "homeGoals");
    expect(homeGoals?.achieved).toBe(true); // 2 <= 2
    
    const awayGoals = result.metrics.find(m => m.metric === "awayGoals");
    expect(awayGoals?.achieved).toBe(false); // 1 > 0
    
    const homeShots = result.metrics.find(m => m.metric === "homeShots");
    expect(homeShots?.achieved).toBe(true); // 15 <= 20
    
    const awayShots = result.metrics.find(m => m.metric === "awayShots");
    expect(awayShots?.achieved).toBe(false); // 10 > 8

    const totalShots = result.metrics.find(m => m.metric === "totalShots");
    expect(totalShots?.achieved).toBe(true); // 25 <= 28

    // 3 achieved, 3 not achieved → 50% → "good"
    expect(result.achievedCount).toBe(3);
    expect(result.overallClassification).toBe("good");
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

  it("calculates overall classification based on achieved percentage", () => {
    // Test >=75% achieved → excellent
    const actual75 = {
      homeGoals: 3, awayGoals: 2, // both achieved
      homeShots: 20, awayShots: 12, // both achieved
      homeShotsOnTarget: 8, awayShotsOnTarget: 5, // both achieved
      homeCorners: 7, awayCorners: 6, // both achieved
      homeDangerousAttacks: null, awayDangerousAttacks: null,
    };
    const result75 = calculateValidation(projected, actual75, "A", "B");
    expect(result75.overallClassification).toBe("excellent");
    expect(result75.overallScore).toBe(100); // all achieved

    // Test <25% achieved → divergent
    const actual0 = {
      homeGoals: 0, awayGoals: 0, // all not achieved (proj > actual)
      homeShots: 5, awayShots: 3,
      homeShotsOnTarget: 2, awayShotsOnTarget: 1,
      homeCorners: 2, awayCorners: 1,
      homeDangerousAttacks: null, awayDangerousAttacks: null,
    };
    const result0 = calculateValidation(projected, actual0, "A", "B");
    expect(result0.overallClassification).toBe("divergent");
    expect(result0.overallScore).toBe(0); // none achieved
  });

  it("correctly identifies achieved metrics in result lists", () => {
    const actual = {
      homeGoals: 3,     // projected 2 <= 3 → achieved
      awayGoals: 0,     // projected 1 > 0 → not achieved
      homeShots: null, awayShots: null,
      homeShotsOnTarget: null, awayShotsOnTarget: null,
      homeCorners: null, awayCorners: null,
      homeDangerousAttacks: null, awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    // homeGoals achieved (2 <= 3), awayGoals not (1 > 0), totalGoals: 3 > 3? No, 3 <= 3 → achieved
    expect(result.achievedMetrics).toContain("Gols Flamengo");
    expect(result.achievedMetrics).toContain("Total de Gols");
    expect(result.notAchievedMetrics).toContain("Gols Vitória");
  });

  it("equal projection and actual is always achieved", () => {
    const actual = {
      homeGoals: 2,     // projected 2 == 2 → achieved
      awayGoals: 1,     // projected 1 == 1 → achieved
      homeShots: 15,    // projected 15 == 15 → achieved
      awayShots: 10,    // projected 10 == 10 → achieved
      homeShotsOnTarget: 6,  // projected 6 == 6 → achieved
      awayShotsOnTarget: 3,  // projected 3 == 3 → achieved
      homeCorners: 5,   // projected 5 == 5 → achieved
      awayCorners: 4,   // projected 4 == 4 → achieved
      homeDangerousAttacks: null,
      awayDangerousAttacks: null,
    };

    const result = calculateValidation(projected, actual, "Flamengo", "Vitória");

    // All equal → all achieved
    expect(result.achievedCount).toBe(result.totalMetrics);
    expect(result.overallScore).toBe(100);
    expect(result.overallClassification).toBe("excellent");
  });
});
