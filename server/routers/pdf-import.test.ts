import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
const mockInvokeLLM = vi.fn();
vi.mock("../_core/llm", () => ({
  invokeLLM: (...args: any[]) => mockInvokeLLM(...args),
}));

// Mock storage
vi.mock("../storage", () => ({
  storagePut: vi.fn(async () => ({ key: "test-key", url: "/manus-storage/test-key" })),
}));

// Import the router after mocks
import { pdfImportRouter } from "./pdf-import";

// Create a tRPC caller using the router's createCaller
const caller = pdfImportRouter.createCaller({});

function makeLLMResponse(data: Record<string, any>) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify(data),
        },
      },
    ],
  };
}

const flamengoData = {
  teamName: "Flamengo",
  attacks: 55.1,
  attacksAgainst: 39.1,
  corners: 4.7,
  cornersAgainst: 4.4,
  shots: 15.6,
  shotsAgainst: 11.1,
  shotsOnTarget: 6.1,
  shotsOnTargetAgainst: 3.3,
  goals: 1.8,
  goalsAgainst: 0.7,
};

const vitoriaData = {
  teamName: "Vitória",
  attacks: 43.4,
  attacksAgainst: 49.9,
  corners: 4.5,
  cornersAgainst: 5.4,
  shots: 10.7,
  shotsAgainst: 6.8,
  shotsOnTarget: 3.1,
  shotsOnTargetAgainst: 1.6,
  goals: 2.3,
  goalsAgainst: 2.1,
};

const dummyBase64 = Buffer.from("dummy pdf content").toString("base64");

describe("pdfImportRouter", () => {
  beforeEach(() => {
    mockInvokeLLM.mockReset();
  });

  describe("importFromPDF", () => {
    it("should extract data from a single PDF and return success", async () => {
      mockInvokeLLM.mockResolvedValueOnce(makeLLMResponse(flamengoData));

      const result = await caller.importFromPDF({
        pdfBase64: dummyBase64,
        teamType: "home",
        fileName: "mandanteFlamengo.pdf",
      });

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data!.teamName).toBe("Flamengo");
      expect(result.data!.attacks).toBe(55.1);
      expect(result.data!.corners).toBe(4.7);
      expect(result.data!.shots).toBe(15.6);
      expect(result.data!.shotsOnTarget).toBe(6.1);
      expect(result.data!.goals).toBe(1.8);
      expect(result.data!.goalsAgainst).toBe(0.7);
      expect(result.message).toContain("Flamengo");

      // Verify LLM was called with correct structure
      expect(mockInvokeLLM).toHaveBeenCalledTimes(1);
      const llmCall = mockInvokeLLM.mock.calls[0][0];
      expect(llmCall.messages).toHaveLength(2);
      expect(llmCall.response_format.type).toBe("json_schema");
    });

    it("should return error when LLM fails", async () => {
      mockInvokeLLM.mockRejectedValueOnce(new Error("LLM service unavailable"));

      const result = await caller.importFromPDF({
        pdfBase64: dummyBase64,
        teamType: "away",
        fileName: "test.pdf",
      });

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.message).toContain("Falha ao importar PDF");
    });

    it("should return error when LLM returns empty content", async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const result = await caller.importFromPDF({
        pdfBase64: dummyBase64,
        teamType: "home",
      });

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
    });

    it("should handle LLM response with markdown code blocks", async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "```json\n" + JSON.stringify(vitoriaData) + "\n```",
            },
          },
        ],
      });

      const result = await caller.importFromPDF({
        pdfBase64: dummyBase64,
        teamType: "away",
      });

      expect(result.success).toBe(true);
      expect(result.data!.teamName).toBe("Vitória");
      expect(result.data!.shots).toBe(10.7);
    });
  });

  describe("importBothTeams", () => {
    it("should extract data from both PDFs in parallel", async () => {
      mockInvokeLLM
        .mockResolvedValueOnce(makeLLMResponse(flamengoData))
        .mockResolvedValueOnce(makeLLMResponse(vitoriaData));

      const result = await caller.importBothTeams({
        homePdfBase64: dummyBase64,
        awayPdfBase64: dummyBase64,
        homeFileName: "mandanteFlamengo.pdf",
        awayFileName: "visitantevitoria.pdf",
      });

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data!.home.teamName).toBe("Flamengo");
      expect(result.data!.home.shots).toBe(15.6);
      expect(result.data!.away.teamName).toBe("Vitória");
      expect(result.data!.away.shots).toBe(10.7);
      expect(result.message).toContain("Flamengo");
      expect(result.message).toContain("Vitória");

      // Both PDFs processed
      expect(mockInvokeLLM).toHaveBeenCalledTimes(2);
    });

    it("should return error when one PDF fails", async () => {
      mockInvokeLLM
        .mockResolvedValueOnce(makeLLMResponse(flamengoData))
        .mockRejectedValueOnce(new Error("Failed to process away PDF"));

      const result = await caller.importBothTeams({
        homePdfBase64: dummyBase64,
        awayPdfBase64: dummyBase64,
      });

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.message).toContain("Falha ao importar PDFs");
    });

    it("should convert string numbers from LLM to proper numbers", async () => {
      const stringNumberData = {
        teamName: "Flamengo",
        attacks: "55.1",
        attacksAgainst: "39.1",
        corners: "4.7",
        cornersAgainst: "4.4",
        shots: "15.6",
        shotsAgainst: "11.1",
        shotsOnTarget: "6.1",
        shotsOnTargetAgainst: "3.3",
        goals: "1.8",
        goalsAgainst: "0.7",
      };

      mockInvokeLLM
        .mockResolvedValueOnce(makeLLMResponse(stringNumberData))
        .mockResolvedValueOnce(makeLLMResponse(vitoriaData));

      const result = await caller.importBothTeams({
        homePdfBase64: dummyBase64,
        awayPdfBase64: dummyBase64,
      });

      expect(result.success).toBe(true);
      expect(typeof result.data!.home.attacks).toBe("number");
      expect(result.data!.home.attacks).toBe(55.1);
      expect(typeof result.data!.home.goals).toBe("number");
      expect(result.data!.home.goals).toBe(1.8);
    });
  });
});
