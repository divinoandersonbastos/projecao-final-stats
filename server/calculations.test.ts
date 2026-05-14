import { describe, it, expect } from "vitest";
import { calculateProjections, generateRankingLines } from "./calculations";

describe("calculateProjections", () => {
  it("should calculate projections correctly with valid input", () => {
    const homeTeam = {
      dangerousAttacksFor: 10,
      dangerousAttacksAgainst: 5,
      cornersFor: 6,
      cornersAgainst: 4,
      shotsFor: 12,
      shotsAgainst: 8,
      shotsOnTargetFor: 5,
      shotsOnTargetAgainst: 3,
      goalsFor: 2,
      goalsAgainst: 1,
    };

    const awayTeam = {
      dangerousAttacksFor: 8,
      dangerousAttacksAgainst: 9,
      cornersFor: 5,
      cornersAgainst: 7,
      shotsFor: 10,
      shotsAgainst: 11,
      shotsOnTargetFor: 4,
      shotsOnTargetAgainst: 5,
      goalsFor: 1,
      goalsAgainst: 2,
    };

    const result = calculateProjections(homeTeam, awayTeam);

    expect(result).toHaveProperty("homeProjectedShots");
    expect(result).toHaveProperty("awayProjectedShots");
    expect(result).toHaveProperty("homeProjectedCorners");
    expect(result).toHaveProperty("awayProjectedCorners");
    expect(result).toHaveProperty("homeProjectedGoals");
    expect(result).toHaveProperty("awayProjectedGoals");
    expect(result).toHaveProperty("homeOffensiveConversion");
    expect(result).toHaveProperty("homeDefensiveConversion");
    expect(result).toHaveProperty("awayOffensiveConversion");
    expect(result).toHaveProperty("awayDefensiveConversion");
    expect(result).toHaveProperty("projectedHomeGoals");
    expect(result).toHaveProperty("projectedAwayGoals");
    expect(result).toHaveProperty("rankingLines");

    // Verify that values are numbers
    expect(typeof result.homeProjectedShots).toBe("number");
    expect(typeof result.projectedHomeGoals).toBe("number");
    expect(typeof result.homeOffensiveConversion).toBe("number");

    // Verify that conversions are between 0 and 1
    expect(result.homeOffensiveConversion).toBeGreaterThanOrEqual(0);
    expect(result.homeOffensiveConversion).toBeLessThanOrEqual(1);
    expect(result.homeDefensiveConversion).toBeGreaterThanOrEqual(0);
    expect(result.homeDefensiveConversion).toBeLessThanOrEqual(1);
  });

  it("should handle zero values gracefully", () => {
    const homeTeam = {
      dangerousAttacksFor: 0,
      dangerousAttacksAgainst: 0,
      cornersFor: 0,
      cornersAgainst: 0,
      shotsFor: 0,
      shotsAgainst: 0,
      shotsOnTargetFor: 0,
      shotsOnTargetAgainst: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };

    const awayTeam = { ...homeTeam };

    const result = calculateProjections(homeTeam, awayTeam);

    expect(result.homeProjectedShots).toBe(0);
    expect(result.projectedHomeGoals).toBe(0);
    expect(result.homeOffensiveConversion).toBe(0);
  });

  it("should generate ranking lines with correct structure", () => {
    const homeTeam = {
      dangerousAttacksFor: 10,
      dangerousAttacksAgainst: 5,
      cornersFor: 6,
      cornersAgainst: 4,
      shotsFor: 12,
      shotsAgainst: 8,
      shotsOnTargetFor: 5,
      shotsOnTargetAgainst: 3,
      goalsFor: 2,
      goalsAgainst: 1,
    };

    const awayTeam = {
      dangerousAttacksFor: 8,
      dangerousAttacksAgainst: 9,
      cornersFor: 5,
      cornersAgainst: 7,
      shotsFor: 10,
      shotsAgainst: 11,
      shotsOnTargetFor: 4,
      shotsOnTargetAgainst: 5,
      goalsFor: 1,
      goalsAgainst: 2,
    };

    const result = calculateProjections(homeTeam, awayTeam);
    const lines = result.rankingLines;

    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);

    // Check structure of first ranking line
    const firstLine = lines[0];
    expect(firstLine).toHaveProperty("rank");
    expect(firstLine).toHaveProperty("line");
    expect(firstLine).toHaveProperty("projection");
    expect(firstLine).toHaveProperty("baseline");
    expect(firstLine).toHaveProperty("absoluteMargin");
    expect(firstLine).toHaveProperty("percentageMargin");
    expect(firstLine).toHaveProperty("stability");
    expect(firstLine).toHaveProperty("correlation");
    expect(firstLine).toHaveProperty("confidenceIndex");
    expect(firstLine).toHaveProperty("status");
    expect(firstLine).toHaveProperty("category");
  });

  it("should calculate confidence index between 0 and 100", () => {
    const homeTeam = {
      dangerousAttacksFor: 10,
      dangerousAttacksAgainst: 5,
      cornersFor: 6,
      cornersAgainst: 4,
      shotsFor: 12,
      shotsAgainst: 8,
      shotsOnTargetFor: 5,
      shotsOnTargetAgainst: 3,
      goalsFor: 2,
      goalsAgainst: 1,
    };

    const awayTeam = {
      dangerousAttacksFor: 8,
      dangerousAttacksAgainst: 9,
      cornersFor: 5,
      cornersAgainst: 7,
      shotsFor: 10,
      shotsAgainst: 11,
      shotsOnTargetFor: 4,
      shotsOnTargetAgainst: 5,
      goalsFor: 1,
      goalsAgainst: 2,
    };

    const result = calculateProjections(homeTeam, awayTeam);
    const lines = result.rankingLines;

    lines.forEach((line) => {
      expect(line.confidenceIndex).toBeGreaterThanOrEqual(0);
      expect(line.confidenceIndex).toBeLessThanOrEqual(100);
    });
  });

  it("should handle real-world match scenario with high volatility", () => {
    // Real-world scenario: Strong attacking home team vs defensive away team
    const homeTeam = {
      dangerousAttacksFor: 18,
      dangerousAttacksAgainst: 3,
      cornersFor: 8,
      cornersAgainst: 2,
      shotsFor: 16,
      shotsAgainst: 4,
      shotsOnTargetFor: 7,
      shotsOnTargetAgainst: 1,
      goalsFor: 3,
      goalsAgainst: 0,
    };

    const awayTeam = {
      dangerousAttacksFor: 2,
      dangerousAttacksAgainst: 15,
      cornersFor: 1,
      cornersAgainst: 7,
      shotsFor: 3,
      shotsAgainst: 14,
      shotsOnTargetFor: 1,
      shotsOnTargetAgainst: 6,
      goalsFor: 0,
      goalsAgainst: 2,
    };

    const result = calculateProjections(homeTeam, awayTeam);

    // Home team should have higher projected goals
    expect(result.projectedHomeGoals).toBeGreaterThan(result.projectedAwayGoals);

    // Home team offensive conversion should be high
    expect(result.homeOffensiveConversion).toBeGreaterThan(0.3);

    // Away team defensive conversion should be high (preventing goals)
    expect(result.awayDefensiveConversion).toBeGreaterThan(0.2);

    // Verify ranking lines include goal lines with high confidence
    const goalLines = result.rankingLines.filter((line) => line.category === "D");
    expect(goalLines.length).toBeGreaterThan(0);
  });
});
