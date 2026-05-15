import { describe, it, expect } from "vitest";
import {
  calculateImpliedSum,
  calculateTheoreticalMargin,
  classifyStatus,
  findBestLine,
  parseOddsInput,
} from "@shared/market-inefficiency";

describe("MarketInefficiency - Calculation Logic", () => {
  describe("calculateImpliedSum", () => {
    it("should calculate implied sum correctly", () => {
      // 1/2.15 + 1/10.00 + 1/9.00
      const result = calculateImpliedSum(2.15, 10.0, 9.0);
      // 0.4651 + 0.1 + 0.1111 = 0.6762
      expect(result).toBeCloseTo(0.6762, 3);
    });

    it("should return ~1.0 for a balanced market", () => {
      // Fair odds: 1/2 + 1/3 + 1/6 = 1.0
      const result = calculateImpliedSum(2.0, 3.0, 6.0);
      expect(result).toBeCloseTo(1.0, 4);
    });

    it("should return > 1.0 for overround market", () => {
      // Typical bookmaker: 1/1.8 + 1/3.5 + 1/4.0 > 1
      const result = calculateImpliedSum(1.8, 3.5, 4.0);
      expect(result).toBeGreaterThan(1.0);
    });
  });

  describe("calculateTheoreticalMargin", () => {
    it("should return positive margin when sum < 1", () => {
      const margin = calculateTheoreticalMargin(0.6762);
      expect(margin).toBeCloseTo(32.38, 1);
    });

    it("should return 0 when sum = 1", () => {
      const margin = calculateTheoreticalMargin(1.0);
      expect(margin).toBeCloseTo(0, 4);
    });

    it("should return negative margin when sum > 1", () => {
      const margin = calculateTheoreticalMargin(1.05);
      expect(margin).toBeLessThan(0);
    });
  });

  describe("classifyStatus", () => {
    it("should classify > 10% as high", () => {
      expect(classifyStatus(15)).toBe("high");
      expect(classifyStatus(10.1)).toBe("high");
    });

    it("should classify 5-10% as medium", () => {
      expect(classifyStatus(7)).toBe("medium");
      expect(classifyStatus(5)).toBe("medium");
    });

    it("should classify 0-5% as low", () => {
      expect(classifyStatus(3)).toBe("low");
      expect(classifyStatus(0.1)).toBe("low");
    });

    it("should classify <= 0 as none", () => {
      expect(classifyStatus(0)).toBe("none");
      expect(classifyStatus(-5)).toBe("none");
    });
  });

  describe("findBestLine", () => {
    it("should return -1 when no positive margins", () => {
      const lines = [
        { market: "A", line: "A", oddOver: 1.8, oddExact: 3.5, oddUnder: 4.0, impliedSum: 1.09, theoreticalMargin: -9, status: "none" as const, isBest: false },
      ];
      expect(findBestLine(lines)).toBe(-1);
    });

    it("should return index of highest margin", () => {
      const lines = [
        { market: "A", line: "A", oddOver: 1.9, oddExact: 8.0, oddUnder: 2.0, impliedSum: 0.65, theoreticalMargin: 5, status: "medium" as const, isBest: false },
        { market: "B", line: "B", oddOver: 2.15, oddExact: 10.0, oddUnder: 9.0, impliedSum: 0.676, theoreticalMargin: 32.4, status: "high" as const, isBest: false },
        { market: "C", line: "C", oddOver: 1.85, oddExact: 8.5, oddUnder: 2.1, impliedSum: 0.73, theoreticalMargin: 10, status: "medium" as const, isBest: false },
      ];
      expect(findBestLine(lines)).toBe(1);
    });

    it("should use tiebreaker: lower implied sum", () => {
      const lines = [
        { market: "A", line: "A", oddOver: 2.0, oddExact: 10.0, oddUnder: 10.0, impliedSum: 0.7, theoreticalMargin: 30, status: "high" as const, isBest: false },
        { market: "B", line: "B", oddOver: 2.5, oddExact: 5.0, oddUnder: 5.0, impliedSum: 0.8, theoreticalMargin: 30, status: "high" as const, isBest: false },
      ];
      // Same margin (30), A has lower impliedSum (0.7 < 0.8)
      expect(findBestLine(lines)).toBe(0);
    });

    it("should use tiebreaker: higher minimum odd", () => {
      const lines = [
        { market: "A", line: "A", oddOver: 1.5, oddExact: 10.0, oddUnder: 10.0, impliedSum: 0.7, theoreticalMargin: 30, status: "high" as const, isBest: false },
        { market: "B", line: "B", oddOver: 2.0, oddExact: 10.0, oddUnder: 10.0, impliedSum: 0.7, theoreticalMargin: 30, status: "high" as const, isBest: false },
      ];
      // Same margin and impliedSum, B has higher min odd (2.0 > 1.5)
      expect(findBestLine(lines)).toBe(1);
    });
  });

  describe("parseOddsInput", () => {
    it("should parse pipe-separated format", () => {
      const input = "Escanteios | 7 escanteios | 2.15 | 10.00 | 9.00";
      const result = parseOddsInput(input);
      expect(result).toHaveLength(1);
      expect(result[0].market).toBe("Escanteios");
      expect(result[0].line).toBe("7 escanteios");
      expect(result[0].oddOver).toBe(2.15);
      expect(result[0].oddExact).toBe(10.0);
      expect(result[0].oddUnder).toBe(9.0);
      expect(result[0].theoreticalMargin).toBeCloseTo(32.38, 1);
      expect(result[0].status).toBe("high");
      expect(result[0].isBest).toBe(true);
    });

    it("should parse semicolon-separated format", () => {
      const input = "Gols; Acima 2.5; 1.85; 8.50; 2.10";
      const result = parseOddsInput(input);
      expect(result).toHaveLength(1);
      expect(result[0].market).toBe("Gols");
      expect(result[0].oddOver).toBe(1.85);
    });

    it("should parse multiple lines and find best", () => {
      const input = `Escanteios | 7 escanteios | 2.15 | 10.00 | 9.00
Gols | Acima 2.5 | 1.85 | 8.50 | 2.10
Chutes | Acima 9.5 | 1.90 | 12.00 | 1.95`;
      const result = parseOddsInput(input);
      expect(result).toHaveLength(3);
      // Escanteios has highest margin (32.4%)
      expect(result[0].isBest).toBe(true);
      expect(result[1].isBest).toBe(false);
      expect(result[2].isBest).toBe(false);
    });

    it("should handle 4-part format (market+line combined)", () => {
      const input = "7 escanteios | 2.15 | 10.00 | 9.00";
      const result = parseOddsInput(input);
      expect(result).toHaveLength(1);
      expect(result[0].market).toBe("7 escanteios");
      expect(result[0].oddOver).toBe(2.15);
    });

    it("should skip invalid lines", () => {
      const input = `Escanteios | 7 escanteios | 2.15 | 10.00 | 9.00
This is not a valid line
Another invalid`;
      const result = parseOddsInput(input);
      expect(result).toHaveLength(1);
    });

    it("should skip lines with zero or negative odds", () => {
      const input = "Test | Line | 0 | 10.00 | 9.00";
      const result = parseOddsInput(input);
      expect(result).toHaveLength(0);
    });

    it("should mark no best line when all margins are negative", () => {
      const input = "Overround | Market | 1.5 | 2.0 | 2.5";
      const result = parseOddsInput(input);
      // 1/1.5 + 1/2 + 1/2.5 = 0.667 + 0.5 + 0.4 = 1.567 -> margin = -56.7%
      expect(result).toHaveLength(1);
      expect(result[0].isBest).toBe(false);
      expect(result[0].status).toBe("none");
    });

    it("should handle tab-separated format", () => {
      const input = "Escanteios\t7 escanteios\t2.15\t10.00\t9.00";
      const result = parseOddsInput(input);
      expect(result).toHaveLength(1);
      expect(result[0].market).toBe("Escanteios");
      expect(result[0].oddOver).toBe(2.15);
    });
  });
});
