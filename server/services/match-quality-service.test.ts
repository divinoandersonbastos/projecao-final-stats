import { describe, it, expect } from "vitest";
import {
  calculateMatchQuality,
  calculateDataAvailability,
  calculateOffensiveVolume,
  calculateContextRisk,
  getQualityLabel,
  type FixtureContext,
} from "./match-quality-service";
import type { TeamStats } from "./sportmonks-service";

// ─── Mock Data ──────────────────────────────────────────────────────────────

function makeStats(overrides: Partial<TeamStats> = {}): TeamStats {
  return {
    teamId: 1,
    teamName: "Test Team",
    seasonId: 100,
    gamesPlayed: 15,
    dangerousAttacksAvg: 40,
    attacksAvg: 80,
    shotsTotal: 180,
    shotsOnTarget: 75,
    shotsAvg: 12,
    cornersAvg: 6,
    goalsScored: { all: 25, home: 15, away: 10, avgAll: 1.67, avgHome: 1.88, avgAway: 1.43 },
    goalsConceded: { all: 12, home: 5, away: 7, avgAll: 0.8, avgHome: 0.63, avgAway: 1.0 },
    rating: 6.9,
    btts: { allPct: 55, homePct: 50, awayPct: 60 },
    cleanSheets: { allPct: 40, homePct: 50, awayPct: 30 },
    failedToScore: { allPct: 15, homePct: 10, awayPct: 20 },
    wins: { allPct: 60, homePct: 70, awayPct: 50 },
    overUnder: { gfOver05: 85, gfOver15: 60, gfOver25: 35, gaOver05: 60, gaOver15: 35, gaOver25: 15 },
    ...overrides,
  };
}

function makeContext(overrides: Partial<FixtureContext> = {}): FixtureContext {
  return {
    isKnockout: false,
    isFriendly: false,
    isPreseason: false,
    leagueType: "league",
    round: "Round 10",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Match Quality Service", () => {
  describe("getQualityLabel", () => {
    it("should return 'excellent' for scores >= 8.5", () => {
      expect(getQualityLabel(8.5)).toBe("excellent");
      expect(getQualityLabel(9.5)).toBe("excellent");
    });

    it("should return 'good' for scores >= 7.5 and < 8.5", () => {
      expect(getQualityLabel(7.5)).toBe("good");
      expect(getQualityLabel(8.4)).toBe("good");
    });

    it("should return 'acceptable' for scores >= 6.5 and < 7.5", () => {
      expect(getQualityLabel(6.5)).toBe("acceptable");
      expect(getQualityLabel(7.4)).toBe("acceptable");
    });

    it("should return 'caution' for scores >= 5.0 and < 6.5", () => {
      expect(getQualityLabel(5.0)).toBe("caution");
      expect(getQualityLabel(6.4)).toBe("caution");
    });

    it("should return 'avoid' for scores < 5.0", () => {
      expect(getQualityLabel(4.9)).toBe("avoid");
      expect(getQualityLabel(0)).toBe("avoid");
    });
  });

  describe("calculateDataAvailability", () => {
    it("should return 0 when stats are null", () => {
      expect(calculateDataAvailability(null, null)).toBe(0);
      expect(calculateDataAvailability(makeStats(), null)).toBe(0);
    });

    it("should return high score when both teams have many games", () => {
      const home = makeStats({ gamesPlayed: 20 });
      const away = makeStats({ gamesPlayed: 20 });
      expect(calculateDataAvailability(home, away)).toBeGreaterThanOrEqual(8);
    });

    it("should return low score when teams have few games", () => {
      const home = makeStats({ gamesPlayed: 3 });
      const away = makeStats({ gamesPlayed: 3 });
      expect(calculateDataAvailability(home, away)).toBeLessThanOrEqual(4);
    });
  });

  describe("calculateOffensiveVolume", () => {
    it("should return 0 when stats are null", () => {
      expect(calculateOffensiveVolume(null, null)).toBe(0);
    });

    it("should return high score for teams with high shot volume", () => {
      const home = makeStats({ shotsAvg: 16, dangerousAttacksAvg: 55, cornersAvg: 8 });
      const away = makeStats({ shotsAvg: 14, dangerousAttacksAvg: 50, cornersAvg: 7 });
      expect(calculateOffensiveVolume(home, away)).toBeGreaterThanOrEqual(7);
    });

    it("should return low score for teams with low shot volume", () => {
      const home = makeStats({ shotsAvg: 5, dangerousAttacksAvg: 20, cornersAvg: 2 });
      const away = makeStats({ shotsAvg: 4, dangerousAttacksAvg: 18, cornersAvg: 2 });
      expect(calculateOffensiveVolume(home, away)).toBeLessThan(5);
    });
  });

  describe("calculateContextRisk", () => {
    it("should return high score for regular league matches", () => {
      const context = makeContext({ leagueType: "league", isKnockout: false });
      expect(calculateContextRisk(context)).toBeGreaterThanOrEqual(8);
    });

    it("should return lower score for cup/knockout matches", () => {
      const context = makeContext({ leagueType: "cup", isKnockout: true });
      expect(calculateContextRisk(context)).toBeLessThan(8);
    });

    it("should return low score for friendly matches", () => {
      const context = makeContext({ isFriendly: true });
      expect(calculateContextRisk(context)).toBeLessThan(6);
    });
  });

  describe("calculateMatchQuality (integration)", () => {
    it("should return a quality score between 0 and 10", () => {
      const home = makeStats({ teamId: 1, teamName: "Home FC" });
      const away = makeStats({ teamId: 2, teamName: "Away United" });
      const context = makeContext();

      const result = calculateMatchQuality(home, away, context, "Home FC", "Away United");

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(10);
    });

    it("should classify high-volume teams as excellent or good", () => {
      const home = makeStats({
        teamId: 1,
        teamName: "Home FC",
        gamesPlayed: 20,
        shotsAvg: 16,
        shotsTotal: 320,
        shotsOnTarget: 130,
        dangerousAttacksAvg: 55,
        cornersAvg: 8,
        goalsScored: { all: 40, home: 24, away: 16, avgAll: 2.0, avgHome: 2.4, avgAway: 1.6 },
        goalsConceded: { all: 20, home: 8, away: 12, avgAll: 1.0, avgHome: 0.8, avgAway: 1.2 },
      });
      const away = makeStats({
        teamId: 2,
        teamName: "Away United",
        gamesPlayed: 20,
        shotsAvg: 14,
        shotsTotal: 280,
        shotsOnTarget: 110,
        dangerousAttacksAvg: 50,
        cornersAvg: 7,
        goalsScored: { all: 35, home: 20, away: 15, avgAll: 1.75, avgHome: 2.0, avgAway: 1.5 },
        goalsConceded: { all: 25, home: 10, away: 15, avgAll: 1.25, avgHome: 1.0, avgAway: 1.5 },
      });
      const context = makeContext();

      const result = calculateMatchQuality(home, away, context, "Home FC", "Away United");

      expect(result.qualityScore).toBeGreaterThanOrEqual(7);
      expect(["excellent", "good"]).toContain(result.qualityLabel);
    });

    it("should include bestBlocks array", () => {
      const home = makeStats({ teamId: 1, teamName: "Home FC" });
      const away = makeStats({ teamId: 2, teamName: "Away United" });
      const context = makeContext();

      const result = calculateMatchQuality(home, away, context, "Home FC", "Away United");

      expect(Array.isArray(result.bestBlocks)).toBe(true);
    });

    it("should include explanation string", () => {
      const home = makeStats({ teamId: 1, teamName: "Home FC" });
      const away = makeStats({ teamId: 2, teamName: "Away United" });
      const context = makeContext();

      const result = calculateMatchQuality(home, away, context, "Home FC", "Away United");

      expect(typeof result.explanation).toBe("string");
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it("should include projectedStats with positive totals", () => {
      const home = makeStats({ teamId: 1, teamName: "Home FC" });
      const away = makeStats({ teamId: 2, teamName: "Away United" });
      const context = makeContext();

      const result = calculateMatchQuality(home, away, context, "Home FC", "Away United");

      expect(result.projectedStats).toBeDefined();
      expect(result.projectedStats.totalShots).toBeGreaterThan(0);
      expect(result.projectedStats.totalShotsOnTarget).toBeGreaterThan(0);
      expect(result.projectedStats.totalCorners).toBeGreaterThan(0);
    });

    it("should add alerts for cup/knockout matches", () => {
      const home = makeStats({ teamId: 1, teamName: "Home FC" });
      const away = makeStats({ teamId: 2, teamName: "Away United" });
      const context = makeContext({ leagueType: "cup", isKnockout: true });

      const result = calculateMatchQuality(home, away, context, "Home FC", "Away United");

      expect(result.alerts.length).toBeGreaterThan(0);
    });

    it("should cap score at 5.0 when data availability is very low", () => {
      const home = makeStats({
        teamId: 1,
        teamName: "Home FC",
        gamesPlayed: 2,
        shotsAvg: 0,
        dangerousAttacksAvg: 0,
        cornersAvg: 0,
      });
      const away = makeStats({
        teamId: 2,
        teamName: "Away United",
        gamesPlayed: 2,
        shotsAvg: 0,
        dangerousAttacksAvg: 0,
        cornersAvg: 0,
      });
      const context = makeContext();

      const result = calculateMatchQuality(home, away, context, "Home FC", "Away United");

      expect(result.qualityScore).toBeLessThanOrEqual(5.0);
    });

    it("should return all required fields", () => {
      const home = makeStats({ teamId: 1, teamName: "Home FC" });
      const away = makeStats({ teamId: 2, teamName: "Away United" });
      const context = makeContext();

      const result = calculateMatchQuality(home, away, context, "Home FC", "Away United");

      expect(result).toHaveProperty("qualityScore");
      expect(result).toHaveProperty("qualityLabel");
      expect(result).toHaveProperty("criteria");
      expect(result).toHaveProperty("bestBlocks");
      expect(result).toHaveProperty("alerts");
      expect(result).toHaveProperty("explanation");
      expect(result).toHaveProperty("projectedStats");
      expect(result.criteria).toHaveProperty("dataAvailability");
      expect(result.criteria).toHaveProperty("homeAwayCoherence");
      expect(result.criteria).toHaveProperty("offensiveVolume");
      expect(result.criteria).toHaveProperty("defensiveVolume");
      expect(result.criteria).toHaveProperty("competitiveBalance");
      expect(result.criteria).toHaveProperty("contextRisk");
    });
  });
});
