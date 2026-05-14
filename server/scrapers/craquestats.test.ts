import { describe, it, expect } from "vitest";
import { validateCraqueStatsData, extractTeamIdFromUrl } from "./craquestats";
import type { CraqueStatsTeamData } from "./craquestats";

describe("CraqueStats Scraper", () => {
  describe("extractTeamIdFromUrl", () => {
    it("should extract team ID from valid URL", () => {
      const url = "https://craquestats.com.br/team/78094";
      const teamId = extractTeamIdFromUrl(url);
      expect(teamId).toBe("78094");
    });

    it("should extract team ID from URL without protocol", () => {
      const url = "craquestats.com.br/team/47708";
      const teamId = extractTeamIdFromUrl(url);
      expect(teamId).toBe("47708");
    });

    it("should return null for invalid URL", () => {
      const url = "https://example.com/invalid";
      const teamId = extractTeamIdFromUrl(url);
      expect(teamId).toBeNull();
    });
  });

  describe("validateCraqueStatsData", () => {
    it("should validate correct data", () => {
      const validData: CraqueStatsTeamData = {
        teamName: "Flamengo",
        finalizacoes: 15.6,
        finalizacoesContra: 11.1,
        escanteios: 8,
        ataquesPerigosos: 12,
        gols: 2,
        golsContra: 1,
      };

      expect(validateCraqueStatsData(validData)).toBe(true);
    });

    it("should reject data with missing team name", () => {
      const invalidData: CraqueStatsTeamData = {
        teamName: "",
        finalizacoes: 15.6,
        finalizacoesContra: 11.1,
        escanteios: 8,
        ataquesPerigosos: 12,
        gols: 2,
        golsContra: 1,
      };

      expect(validateCraqueStatsData(invalidData)).toBe(false);
    });

    it("should reject data with negative values", () => {
      const invalidData: CraqueStatsTeamData = {
        teamName: "Flamengo",
        finalizacoes: -15.6,
        finalizacoesContra: 11.1,
        escanteios: 8,
        ataquesPerigosos: 12,
        gols: 2,
        golsContra: 1,
      };

      expect(validateCraqueStatsData(invalidData)).toBe(false);
    });

    it("should accept zero values", () => {
      const validData: CraqueStatsTeamData = {
        teamName: "Vitória",
        finalizacoes: 0,
        finalizacoesContra: 0,
        escanteios: 0,
        ataquesPerigosos: 0,
        gols: 0,
        golsContra: 0,
      };

      expect(validateCraqueStatsData(validData)).toBe(true);
    });
  });
});
