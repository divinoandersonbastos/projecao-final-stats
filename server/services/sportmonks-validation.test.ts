import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ENV module
vi.mock("../_core/env.js", () => ({
  ENV: {
    SPORTMONKS_API_TOKEN: "test-token-123",
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  FIXTURE_STAT_TYPES,
  getLiveFixtures,
  getFixturesByDate,
  searchFixtures,
  getFixtureById,
  getFixtureStats,
} from "./sportmonks-validation";

describe("sportmonks-validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("FIXTURE_STAT_TYPES", () => {
    it("should have all required stat type IDs", () => {
      expect(FIXTURE_STAT_TYPES.POSSESSION).toBe(45);
      expect(FIXTURE_STAT_TYPES.TOTAL_SHOTS).toBe(42);
      expect(FIXTURE_STAT_TYPES.SHOTS_ON_TARGET).toBe(50);
      expect(FIXTURE_STAT_TYPES.CORNERS).toBe(34);
      expect(FIXTURE_STAT_TYPES.GOALS).toBe(52);
      expect(FIXTURE_STAT_TYPES.DANGEROUS_ATTACKS).toBe(44);
      expect(FIXTURE_STAT_TYPES.ATTACKS).toBe(43);
      expect(FIXTURE_STAT_TYPES.FOULS).toBe(56);
      expect(FIXTURE_STAT_TYPES.PASSES).toBe(80);
      expect(FIXTURE_STAT_TYPES.PASS_ACCURACY).toBe(82);
      expect(FIXTURE_STAT_TYPES.TACKLES).toBe(46);
      expect(FIXTURE_STAT_TYPES.GK_SAVES).toBe(86);
      expect(FIXTURE_STAT_TYPES.YELLOW_CARDS).toBe(109);
      expect(FIXTURE_STAT_TYPES.RED_CARDS).toBe(79);
    });
  });

  describe("getFixturesByDate", () => {
    it("should fetch fixtures for a given date and transform them", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            {
              id: 19694879,
              starting_at: "2026-05-15 00:30:00",
              league_id: 462,
              season_id: 23614,
              state: { id: 5, state: "FT", name: "Full Time", short_name: "FT" },
              participants: [
                { id: 3440, name: "Vitória", image_path: "https://img.sportmonks.com/vitoria.png", meta: { location: "home" } },
                { id: 1024, name: "Flamengo", image_path: "https://img.sportmonks.com/flamengo.png", meta: { location: "away" } },
              ],
              scores: [
                { participant_id: 3440, score: { goals: 2 }, description: "CURRENT" },
                { participant_id: 1024, score: { goals: 0 }, description: "CURRENT" },
              ],
              league: { id: 462, name: "Serie A", image_path: "https://img.sportmonks.com/seriea.png" },
            },
          ],
          pagination: { has_more: false },
        }),
      });

      const results = await getFixturesByDate("2026-05-15");

      expect(results).toHaveLength(1);
      expect(results[0].fixtureId).toBe(19694879);
      expect(results[0].homeTeam).toBe("Vitória");
      expect(results[0].awayTeam).toBe("Flamengo");
      expect(results[0].homeGoals).toBe(2);
      expect(results[0].awayGoals).toBe(0);
      expect(results[0].statusShort).toBe("FT");
      expect(results[0].league).toBe("Serie A");
    });

    it("should handle empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], pagination: { has_more: false } }),
      });

      const results = await getFixturesByDate("2026-01-01");
      expect(results).toHaveLength(0);
    });
  });

  describe("getLiveFixtures", () => {
    it("should return empty array when no live fixtures", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve(JSON.stringify({ message: "No result(s) found" })),
      });

      const results = await getLiveFixtures();
      expect(results).toHaveLength(0);
    });

    it("should return live fixtures when available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            {
              id: 12345,
              starting_at: "2026-05-16 20:00:00",
              league_id: 462,
              state: { id: 3, state: "LIVE", name: "In Play", short_name: "2ND" },
              participants: [
                { id: 100, name: "Team A", image_path: "", meta: { location: "home" } },
                { id: 200, name: "Team B", image_path: "", meta: { location: "away" } },
              ],
              scores: [
                { participant_id: 100, score: { goals: 1 }, description: "CURRENT" },
                { participant_id: 200, score: { goals: 1 }, description: "CURRENT" },
              ],
              league: { id: 462, name: "Serie A" },
            },
          ],
        }),
      });

      const results = await getLiveFixtures();
      expect(results).toHaveLength(1);
      expect(results[0].homeGoals).toBe(1);
      expect(results[0].awayGoals).toBe(1);
      expect(results[0].statusShort).toBe("2H");
    });
  });

  describe("getFixtureStats", () => {
    it("should extract match statistics correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 19694879,
            state: { short_name: "FT", name: "Full Time" },
            participants: [
              { id: 3440, name: "Vitória", meta: { location: "home" } },
              { id: 1024, name: "Flamengo", meta: { location: "away" } },
            ],
            scores: [
              { participant_id: 3440, score: { goals: 2 }, description: "CURRENT" },
              { participant_id: 1024, score: { goals: 0 }, description: "CURRENT" },
            ],
            statistics: [
              { participant_id: 3440, type_id: 45, data: { value: 26 } },  // Possession
              { participant_id: 1024, type_id: 45, data: { value: 74 } },
              { participant_id: 3440, type_id: 42, data: { value: 5 } },   // Total Shots
              { participant_id: 1024, type_id: 42, data: { value: 26 } },
              { participant_id: 3440, type_id: 50, data: { value: 3 } },   // Shots On Target
              { participant_id: 1024, type_id: 50, data: { value: 11 } },
              { participant_id: 3440, type_id: 34, data: { value: 1 } },   // Corners
              { participant_id: 1024, type_id: 34, data: { value: 8 } },
              { participant_id: 3440, type_id: 44, data: { value: 17 } },  // Dangerous Attacks
              { participant_id: 1024, type_id: 44, data: { value: 91 } },
              { participant_id: 3440, type_id: 56, data: { value: 12 } },  // Fouls
              { participant_id: 1024, type_id: 56, data: { value: 14 } },
              { participant_id: 3440, type_id: 80, data: { value: 213 } }, // Passes
              { participant_id: 1024, type_id: 80, data: { value: 591 } },
              { participant_id: 3440, type_id: 82, data: { value: 67 } },  // Pass Accuracy
              { participant_id: 1024, type_id: 82, data: { value: 87 } },
              { participant_id: 3440, type_id: 46, data: { value: 66 } },  // Tackles
              { participant_id: 1024, type_id: 46, data: { value: 38 } },
              { participant_id: 3440, type_id: 86, data: { value: 4 } },   // GK Saves
              { participant_id: 1024, type_id: 86, data: { value: 7 } },
            ],
          },
        }),
      });

      const stats = await getFixtureStats(19694879);

      expect(stats.fixtureId).toBe(19694879);
      expect(stats.homeTeam).toBe("Vitória");
      expect(stats.awayTeam).toBe("Flamengo");
      expect(stats.homeGoals).toBe(2);
      expect(stats.awayGoals).toBe(0);
      expect(stats.homeShots).toBe(5);
      expect(stats.awayShots).toBe(26);
      expect(stats.homeShotsOnTarget).toBe(3);
      expect(stats.awayShotsOnTarget).toBe(11);
      expect(stats.homeCorners).toBe(1);
      expect(stats.awayCorners).toBe(8);
      expect(stats.homeDangerousAttacks).toBe(17);
      expect(stats.awayDangerousAttacks).toBe(91);
      expect(stats.homePossession).toBe(26);
      expect(stats.awayPossession).toBe(74);
      expect(stats.homeFouls).toBe(12);
      expect(stats.awayFouls).toBe(14);
      expect(stats.homePasses).toBe(213);
      expect(stats.awayPasses).toBe(591);
      expect(stats.homePassAccuracy).toBe(67);
      expect(stats.awayPassAccuracy).toBe(87);
      expect(stats.homeTackles).toBe(66);
      expect(stats.awayTackles).toBe(38);
      expect(stats.homeGkSaves).toBe(4);
      expect(stats.awayGkSaves).toBe(7);
      expect(stats.statusShort).toBe("FT");
    });

    it("should handle missing statistics gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 99999,
            state: { short_name: "FT", name: "Full Time" },
            participants: [
              { id: 100, name: "Team A", meta: { location: "home" } },
              { id: 200, name: "Team B", meta: { location: "away" } },
            ],
            scores: [
              { participant_id: 100, score: { goals: 1 }, description: "CURRENT" },
              { participant_id: 200, score: { goals: 0 }, description: "CURRENT" },
            ],
            statistics: [],
          },
        }),
      });

      const stats = await getFixtureStats(99999);

      expect(stats.homeGoals).toBe(1);
      expect(stats.awayGoals).toBe(0);
      expect(stats.homeShots).toBeNull();
      expect(stats.awayShots).toBeNull();
      expect(stats.homeCorners).toBeNull();
      expect(stats.awayCorners).toBeNull();
    });

    it("should throw error when fixture not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      await expect(getFixtureStats(0)).rejects.toThrow("Partida não encontrada");
    });
  });

  describe("searchFixtures", () => {
    it("should filter fixtures by team name", async () => {
      // Mock getFixturesByDate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            {
              id: 1,
              starting_at: "2026-05-16 20:00:00",
              league_id: 462,
              state: { short_name: "NS" },
              participants: [
                { id: 100, name: "Flamengo", image_path: "", meta: { location: "home" } },
                { id: 200, name: "Vasco", image_path: "", meta: { location: "away" } },
              ],
              scores: [],
              league: { name: "Serie A" },
            },
            {
              id: 2,
              starting_at: "2026-05-16 18:00:00",
              league_id: 462,
              state: { short_name: "NS" },
              participants: [
                { id: 300, name: "Palmeiras", image_path: "", meta: { location: "home" } },
                { id: 400, name: "Santos", image_path: "", meta: { location: "away" } },
              ],
              scores: [],
              league: { name: "Serie A" },
            },
          ],
          pagination: { has_more: false },
        }),
      });

      // Mock getLiveFixtures (no live)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve(JSON.stringify({ message: "No result(s) found" })),
      });

      const results = await searchFixtures("Flamengo", "Vasco");
      expect(results).toHaveLength(1);
      expect(results[0].homeTeam).toBe("Flamengo");
      expect(results[0].awayTeam).toBe("Vasco");
    });
  });

  describe("getFixtureById", () => {
    it("should fetch a single fixture by ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            id: 19694879,
            starting_at: "2026-05-15 00:30:00",
            league_id: 462,
            state: { short_name: "FT", name: "Full Time" },
            participants: [
              { id: 3440, name: "Vitória", image_path: "", meta: { location: "home" } },
              { id: 1024, name: "Flamengo", image_path: "", meta: { location: "away" } },
            ],
            scores: [
              { participant_id: 3440, score: { goals: 2 }, description: "CURRENT" },
              { participant_id: 1024, score: { goals: 0 }, description: "CURRENT" },
            ],
            league: { name: "Serie A" },
          },
        }),
      });

      const result = await getFixtureById(19694879);
      expect(result).not.toBeNull();
      expect(result!.fixtureId).toBe(19694879);
      expect(result!.homeTeam).toBe("Vitória");
      expect(result!.awayTeam).toBe("Flamengo");
      expect(result!.homeGoals).toBe(2);
      expect(result!.awayGoals).toBe(0);
    });

    it("should return null when fixture not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null }),
      });

      const result = await getFixtureById(0);
      expect(result).toBeNull();
    });
  });
});
