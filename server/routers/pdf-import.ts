import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { extractTeamDataFromPDF } from "../scrapers/pdf-parser";
import * as fs from "fs";
import * as path from "path";

export const pdfImportRouter = router({
  /**
   * Import team data from uploaded PDF file
   * Extracts statistics and returns formatted data for form pre-fill
   */
  importFromPDF: publicProcedure
    .input(
      z.object({
        filePath: z.string().describe("Path to uploaded PDF file"),
        teamType: z.enum(["home", "away"]).describe("Whether this is home or away team"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Validate file exists
        if (!fs.existsSync(input.filePath)) {
          throw new Error("File not found");
        }

        // Extract data from PDF
        const extractedData = await extractTeamDataFromPDF(input.filePath);

        // Validate extracted data
        if (!extractedData.teamName) {
          throw new Error("Could not extract team name from PDF");
        }

        // Return formatted data for form pre-fill
        return {
          success: true,
          data: {
            teamName: extractedData.teamName,
            attacks: extractedData.attacks,
            attacksAgainst: extractedData.attacksAgainst,
            corners: extractedData.corners,
            cornersAgainst: extractedData.cornersAgainst,
            shots: extractedData.shots,
            shotsAgainst: extractedData.shotsAgainst,
            shotsOnTarget: extractedData.shotsOnTarget,
            shotsOnTargetAgainst: extractedData.shotsOnTargetAgainst,
            goals: extractedData.goals,
            goalsAgainst: extractedData.goalsAgainst,
          },
          message: `Successfully extracted data for ${extractedData.teamName}`,
        };
      } catch (error) {
        console.error("PDF import error:", error);
        return {
          success: false,
          data: null,
          message: `Failed to import PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Import data from multiple PDFs (home and away teams)
   * Returns data for both teams ready for analysis
   */
  importBothTeams: publicProcedure
    .input(
      z.object({
        homeTeamPath: z.string().describe("Path to home team PDF"),
        awayTeamPath: z.string().describe("Path to away team PDF"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Extract data from both PDFs
        const homeData = await extractTeamDataFromPDF(input.homeTeamPath);
        const awayData = await extractTeamDataFromPDF(input.awayTeamPath);

        return {
          success: true,
          data: {
            home: {
              teamName: homeData.teamName,
              attacks: homeData.attacks,
              attacksAgainst: homeData.attacksAgainst,
              corners: homeData.corners,
              cornersAgainst: homeData.cornersAgainst,
              shots: homeData.shots,
              shotsAgainst: homeData.shotsAgainst,
              shotsOnTarget: homeData.shotsOnTarget,
              shotsOnTargetAgainst: homeData.shotsOnTargetAgainst,
              goals: homeData.goals,
              goalsAgainst: homeData.goalsAgainst,
            },
            away: {
              teamName: awayData.teamName,
              attacks: awayData.attacks,
              attacksAgainst: awayData.attacksAgainst,
              corners: awayData.corners,
              cornersAgainst: awayData.cornersAgainst,
              shots: awayData.shots,
              shotsAgainst: awayData.shotsAgainst,
              shotsOnTarget: awayData.shotsOnTarget,
              shotsOnTargetAgainst: awayData.shotsOnTargetAgainst,
              goals: awayData.goals,
              goalsAgainst: awayData.goalsAgainst,
            },
          },
          message: `Successfully extracted data for ${homeData.teamName} vs ${awayData.teamName}`,
        };
      } catch (error) {
        console.error("PDF import error:", error);
        return {
          success: false,
          data: null,
          message: `Failed to import PDFs: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),
});
