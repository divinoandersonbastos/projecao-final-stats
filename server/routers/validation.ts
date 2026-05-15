import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { searchFixtures, getFixtureStats, getLiveFixtures, getFixturesByDate, getApiStatus } from "../services/api-football";
import { calculateValidation } from "../services/validation-calculator";
import {
  getAnalysisById,
  updateAnalysisFixture,
  updateAnalysisStatus,
  saveFinalMatchStats,
  getFinalMatchStatsByAnalysis,
  saveValidationResult,
  getValidationResultByAnalysis,
  getUserAnalysesByStatus,
} from "../db";

export const validationRouter = router({
  /**
   * Get live fixtures currently being played
   */
  getLiveFixtures: protectedProcedure
    .query(async () => {
      return await getLiveFixtures();
    }),

  /**
   * Get fixtures for a specific date (default: today)
   */
  getFixturesByDate: protectedProcedure
    .input(z.object({ date: z.string().optional() }))
    .query(async ({ input }) => {
      return await getFixturesByDate(input.date);
    }),

  /**
   * Search for fixtures by team name (searches today + live)
   */
  searchFixtures: protectedProcedure
    .input(
      z.object({
        homeTeam: z.string().min(1),
        awayTeam: z.string().optional(),
        date: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const results = await searchFixtures(
        input.homeTeam,
        input.awayTeam,
        input.date
      );
      return results;
    }),

  /**
   * Get API status (requests used today)
   */
  getApiStatus: protectedProcedure
    .query(async () => {
      return await getApiStatus();
    }),

  /**
   * Fetch fixture stats from API-Football and save to DB
   */
  fetchAndSaveStats: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
        fixtureId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify analysis belongs to user
      const analysis = await getAnalysisById(input.analysisId, ctx.user.id);
      if (!analysis) {
        throw new Error("Análise não encontrada");
      }

      // Fetch stats from API-Football
      const stats = await getFixtureStats(input.fixtureId);

      // Check if game is finished or at least has stats
      const isFinished = stats.statusShort === "FT" || stats.statusShort === "AET" || stats.statusShort === "PEN";
      if (!isFinished) {
        throw new Error(`Partida ainda não finalizada. Status: ${stats.status}. Aguarde o término do jogo para validar.`);
      }

      // Save final match stats
      const insertResult = await saveFinalMatchStats({
        analysisId: input.analysisId,
        fixtureId: input.fixtureId,
        homeGoals: stats.homeGoals,
        awayGoals: stats.awayGoals,
        homeShots: stats.homeShots,
        awayShots: stats.awayShots,
        homeShotsOnTarget: stats.homeShotsOnTarget,
        awayShotsOnTarget: stats.awayShotsOnTarget,
        homeCorners: stats.homeCorners,
        awayCorners: stats.awayCorners,
        homeDangerousAttacks: stats.homeDangerousAttacks,
        awayDangerousAttacks: stats.awayDangerousAttacks,
        homePossession: stats.homePossession,
        awayPossession: stats.awayPossession,
        homeXg: stats.homeXg,
        awayXg: stats.awayXg,
        dataSource: "api-football",
        rawApiData: stats,
      });

      // Update analysis with fixture ID and status
      await updateAnalysisFixture(
        input.analysisId,
        ctx.user.id,
        input.fixtureId,
        "finished"
      );

      const finalStatsId = (insertResult as any)?.[0]?.insertId;

      // Now calculate validation
      const validation = calculateValidation(
        {
          homeProjectedShots: parseFloat(analysis.homeProjectedShots),
          awayProjectedShots: parseFloat(analysis.awayProjectedShots),
          homeProjectedShotsOnTarget: parseFloat(analysis.homeProjectedShotsOnTarget),
          awayProjectedShotsOnTarget: parseFloat(analysis.awayProjectedShotsOnTarget),
          homeProjectedCorners: parseFloat(analysis.homeProjectedCorners),
          awayProjectedCorners: parseFloat(analysis.awayProjectedCorners),
          homeProjectedGoals: parseFloat(analysis.homeProjectedGoals),
          awayProjectedGoals: parseFloat(analysis.awayProjectedGoals),
          projectedHomeGoals: analysis.projectedHomeGoals,
          projectedAwayGoals: analysis.projectedAwayGoals,
        },
        {
          homeGoals: stats.homeGoals,
          awayGoals: stats.awayGoals,
          homeShots: stats.homeShots,
          awayShots: stats.awayShots,
          homeShotsOnTarget: stats.homeShotsOnTarget,
          awayShotsOnTarget: stats.awayShotsOnTarget,
          homeCorners: stats.homeCorners,
          awayCorners: stats.awayCorners,
          homeDangerousAttacks: stats.homeDangerousAttacks,
          awayDangerousAttacks: stats.awayDangerousAttacks,
        },
        analysis.homeTeamName,
        analysis.awayTeamName
      );

      // Save validation result
      await saveValidationResult({
        analysisId: input.analysisId,
        finalMatchStatsId: finalStatsId,
        metricsValidation: validation.metrics,
        overallScore: validation.overallScore,
        overallClassification: validation.overallClassification,
        avgAbsoluteError: validation.avgAbsoluteError,
        avgPercentError: validation.avgPercentError,
        totalMetrics: validation.totalMetrics,
        excellentCount: validation.excellentCount,
        goodCount: validation.goodCount,
        mediumCount: validation.mediumCount,
        divergentCount: validation.divergentCount,
      });

      // Update analysis status to validated
      await updateAnalysisStatus(input.analysisId, "validated");

      return {
        stats,
        validation,
      };
    }),

  /**
   * Save manual match stats and validate
   */
  saveManualStats: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
        homeGoals: z.number().min(0),
        awayGoals: z.number().min(0),
        homeShots: z.number().min(0).optional(),
        awayShots: z.number().min(0).optional(),
        homeShotsOnTarget: z.number().min(0).optional(),
        awayShotsOnTarget: z.number().min(0).optional(),
        homeCorners: z.number().min(0).optional(),
        awayCorners: z.number().min(0).optional(),
        homeDangerousAttacks: z.number().min(0).optional(),
        awayDangerousAttacks: z.number().min(0).optional(),
        homePossession: z.number().min(0).max(100).optional(),
        awayPossession: z.number().min(0).max(100).optional(),
        homeXg: z.number().min(0).optional(),
        awayXg: z.number().min(0).optional(),
        homeFouls: z.number().min(0).optional(),
        awayFouls: z.number().min(0).optional(),
        homePasses: z.number().min(0).optional(),
        awayPasses: z.number().min(0).optional(),
        homeTackles: z.number().min(0).optional(),
        awayTackles: z.number().min(0).optional(),
        homeGkSaves: z.number().min(0).optional(),
        awayGkSaves: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const analysis = await getAnalysisById(input.analysisId, ctx.user.id);
      if (!analysis) {
        throw new Error("Análise não encontrada");
      }

      // Save final match stats
      const insertResult = await saveFinalMatchStats({
        analysisId: input.analysisId,
        homeGoals: input.homeGoals,
        awayGoals: input.awayGoals,
        homeShots: input.homeShots ?? null,
        awayShots: input.awayShots ?? null,
        homeShotsOnTarget: input.homeShotsOnTarget ?? null,
        awayShotsOnTarget: input.awayShotsOnTarget ?? null,
        homeCorners: input.homeCorners ?? null,
        awayCorners: input.awayCorners ?? null,
        homeDangerousAttacks: input.homeDangerousAttacks ?? null,
        awayDangerousAttacks: input.awayDangerousAttacks ?? null,
        homePossession: input.homePossession ?? null,
        awayPossession: input.awayPossession ?? null,
        homeXg: input.homeXg ?? null,
        awayXg: input.awayXg ?? null,
        dataSource: "manual",
      });

      // Update analysis status
      await updateAnalysisFixture(input.analysisId, ctx.user.id, null, "finished");

      const finalStatsId = (insertResult as any)?.[0]?.insertId;

      // Calculate validation
      const validation = calculateValidation(
        {
          homeProjectedShots: parseFloat(analysis.homeProjectedShots),
          awayProjectedShots: parseFloat(analysis.awayProjectedShots),
          homeProjectedShotsOnTarget: parseFloat(analysis.homeProjectedShotsOnTarget),
          awayProjectedShotsOnTarget: parseFloat(analysis.awayProjectedShotsOnTarget),
          homeProjectedCorners: parseFloat(analysis.homeProjectedCorners),
          awayProjectedCorners: parseFloat(analysis.awayProjectedCorners),
          homeProjectedGoals: parseFloat(analysis.homeProjectedGoals),
          awayProjectedGoals: parseFloat(analysis.awayProjectedGoals),
          projectedHomeGoals: analysis.projectedHomeGoals,
          projectedAwayGoals: analysis.projectedAwayGoals,
        },
        {
          homeGoals: input.homeGoals,
          awayGoals: input.awayGoals,
          homeShots: input.homeShots ?? null,
          awayShots: input.awayShots ?? null,
          homeShotsOnTarget: input.homeShotsOnTarget ?? null,
          awayShotsOnTarget: input.awayShotsOnTarget ?? null,
          homeCorners: input.homeCorners ?? null,
          awayCorners: input.awayCorners ?? null,
          homeDangerousAttacks: input.homeDangerousAttacks ?? null,
          awayDangerousAttacks: input.awayDangerousAttacks ?? null,
        },
        analysis.homeTeamName,
        analysis.awayTeamName
      );

      // Save validation result
      await saveValidationResult({
        analysisId: input.analysisId,
        finalMatchStatsId: finalStatsId,
        metricsValidation: validation.metrics,
        overallScore: validation.overallScore,
        overallClassification: validation.overallClassification,
        avgAbsoluteError: validation.avgAbsoluteError,
        avgPercentError: validation.avgPercentError,
        totalMetrics: validation.totalMetrics,
        excellentCount: validation.excellentCount,
        goodCount: validation.goodCount,
        mediumCount: validation.mediumCount,
        divergentCount: validation.divergentCount,
      });

      // Update analysis status to validated
      await updateAnalysisStatus(input.analysisId, "validated");

      return { validation };
    }),

  /**
   * Get validation result for an analysis
   */
  getResult: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ ctx, input }) => {
      const analysis = await getAnalysisById(input.analysisId, ctx.user.id);
      if (!analysis) {
        throw new Error("Análise não encontrada");
      }

      const finalStats = await getFinalMatchStatsByAnalysis(input.analysisId);
      const validationResult = await getValidationResultByAnalysis(input.analysisId);

      return {
        analysis,
        finalStats,
        validationResult,
      };
    }),

  /**
   * List analyses filtered by status
   */
  listByStatus: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "finished", "validated"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getUserAnalysesByStatus(ctx.user.id, input.status);
    }),
});
