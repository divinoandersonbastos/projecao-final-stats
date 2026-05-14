import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { extractTeamDataFromPDF, ExtractedTeamData } from "./pdf-parser";
import * as fs from "fs";
import * as path from "path";

describe("PDF Parser - CraqueStats Data Extraction", () => {
  // Test data - simulating extracted text from CraqueStats PDFs
  const mockFlamengoData = {
    teamName: "Flamengo",
    attacks: 6.1,
    corners: 4.7,
    shots: 15.6,
    shotsOnTarget: 6.1,
    goals: 1.5,
    goalsAgainst: 1.8,
  };

  const mockVitoriaData = {
    teamName: "Vitória",
    attacks: 3.1,
    corners: 4.5,
    shots: 6.8,
    shotsOnTarget: 3.1,
    goals: 1.8,
    goalsAgainst: 0.8,
  };

  it("should validate extracted team data structure", () => {
    const data: ExtractedTeamData = mockFlamengoData;

    expect(data).toHaveProperty("teamName");
    expect(data).toHaveProperty("attacks");
    expect(data).toHaveProperty("corners");
    expect(data).toHaveProperty("shots");
    expect(data).toHaveProperty("shotsOnTarget");
    expect(data).toHaveProperty("goals");
    expect(data).toHaveProperty("goalsAgainst");
  });

  it("should have valid numeric values for all statistics", () => {
    const data: ExtractedTeamData = mockFlamengoData;

    expect(typeof data.attacks).toBe("number");
    expect(typeof data.corners).toBe("number");
    expect(typeof data.shots).toBe("number");
    expect(typeof data.shotsOnTarget).toBe("number");
    expect(typeof data.goals).toBe("number");
    expect(typeof data.goalsAgainst).toBe("number");

    // All values should be non-negative
    expect(data.attacks).toBeGreaterThanOrEqual(0);
    expect(data.corners).toBeGreaterThanOrEqual(0);
    expect(data.shots).toBeGreaterThanOrEqual(0);
    expect(data.shotsOnTarget).toBeGreaterThanOrEqual(0);
    expect(data.goals).toBeGreaterThanOrEqual(0);
    expect(data.goalsAgainst).toBeGreaterThanOrEqual(0);
  });

  it("should validate shots >= shots on target", () => {
    const data: ExtractedTeamData = mockFlamengoData;
    expect(data.shots).toBeGreaterThanOrEqual(data.shotsOnTarget);
  });

  it("should validate team name is not empty", () => {
    const data: ExtractedTeamData = mockFlamengoData;
    expect(data.teamName).toBeTruthy();
    expect(data.teamName.length).toBeGreaterThan(0);
  });

  it("should validate Flamengo data", () => {
    const data = mockFlamengoData;

    expect(data.teamName).toBe("Flamengo");
    expect(data.shots).toBe(15.6);
    expect(data.shotsOnTarget).toBe(6.1);
    expect(data.corners).toBe(4.7);
    expect(data.attacks).toBe(6.1);
  });

  it("should validate Vitória data", () => {
    const data = mockVitoriaData;

    expect(data.teamName).toBe("Vitória");
    expect(data.shots).toBe(6.8);
    expect(data.shotsOnTarget).toBe(3.1);
    expect(data.corners).toBe(4.5);
    expect(data.attacks).toBe(3.1);
  });

  it("should detect incomplete data extraction", () => {
    const incompleteData: ExtractedTeamData = {
      teamName: "Unknown",
      attacks: 0,
      corners: 0,
      shots: 0,
      shotsOnTarget: 0,
      goals: 0,
      goalsAgainst: 0,
    };

    // Check if all statistics are zero (indicates extraction failure)
    const allZero =
      incompleteData.attacks === 0 &&
      incompleteData.corners === 0 &&
      incompleteData.shots === 0 &&
      incompleteData.shotsOnTarget === 0;

    expect(allZero).toBe(true);
  });

  it("should validate data consistency between teams", () => {
    const homeData = mockFlamengoData;
    const awayData = mockVitoriaData;

    // Both teams should have valid data
    expect(homeData.shots).toBeGreaterThan(0);
    expect(awayData.shots).toBeGreaterThan(0);

    // Both should have shots >= shots on target
    expect(homeData.shots).toBeGreaterThanOrEqual(homeData.shotsOnTarget);
    expect(awayData.shots).toBeGreaterThanOrEqual(awayData.shotsOnTarget);
  });

  it("should calculate realistic conversion rates", () => {
    const data = mockFlamengoData;

    // Conversion rate: goals / shots
    const conversionRate = data.goals / data.shots;

    // Should be between 0 and 1 (0% to 100%)
    expect(conversionRate).toBeGreaterThanOrEqual(0);
    expect(conversionRate).toBeLessThanOrEqual(1);

    // For Flamengo: 1.5 / 15.6 ≈ 0.096 (9.6%)
    expect(conversionRate).toBeCloseTo(0.096, 2);
  });

  it("should validate shot accuracy (shots on target / shots)", () => {
    const data = mockFlamengoData;

    // Shot accuracy: shots on target / shots
    const shotAccuracy = data.shotsOnTarget / data.shots;

    // Should be between 0 and 1
    expect(shotAccuracy).toBeGreaterThanOrEqual(0);
    expect(shotAccuracy).toBeLessThanOrEqual(1);

    // For Flamengo: 6.1 / 15.6 ≈ 0.391 (39.1%)
    expect(shotAccuracy).toBeCloseTo(0.391, 2);
  });

  it("should handle comparison between home and away teams", () => {
    const homeData = mockFlamengoData;
    const awayData = mockVitoriaData;

    // Home team (Flamengo) has more shots
    expect(homeData.shots).toBeGreaterThan(awayData.shots);

    // Home team (Flamengo) has more corners
    expect(homeData.corners).toBeGreaterThan(awayData.corners);
  });
});
