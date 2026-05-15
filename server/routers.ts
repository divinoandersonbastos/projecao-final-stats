import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { calculateProjections, TeamData } from "./calculations";
import { createAnalysis, getUserAnalyses, getAnalysisById, deleteAnalysis } from "./db";
import { importRouter } from "./routers/import";
import { pdfImportRouter } from "./routers/pdf-import";
import { validationRouter } from "./routers/validation";

export const appRouter = router({
  system: systemRouter,
  import: importRouter,
  pdfImport: pdfImportRouter,
  validation: validationRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  analysis: router({
    /**
     * Create a new analysis
     */
    create: protectedProcedure
      .input(
        z.object({
          homeTeamName: z.string().min(1, "Nome do time mandante obrigatório"),
          awayTeamName: z.string().min(1, "Nome do time visitante obrigatório"),
          analysisMode: z.enum(["mode1", "mode2"]).default("mode2"),
          homeTeam: z.object({
            dangerousAttacksFor: z.number().min(0),
            dangerousAttacksAgainst: z.number().min(0),
            cornersFor: z.number().min(0),
            cornersAgainst: z.number().min(0),
            shotsFor: z.number().min(0),
            shotsAgainst: z.number().min(0),
            shotsOnTargetFor: z.number().min(0),
            shotsOnTargetAgainst: z.number().min(0),
            goalsFor: z.number().min(0),
            goalsAgainst: z.number().min(0),
          }),
          awayTeam: z.object({
            dangerousAttacksFor: z.number().min(0),
            dangerousAttacksAgainst: z.number().min(0),
            cornersFor: z.number().min(0),
            cornersAgainst: z.number().min(0),
            shotsFor: z.number().min(0),
            shotsAgainst: z.number().min(0),
            shotsOnTargetFor: z.number().min(0),
            shotsOnTargetAgainst: z.number().min(0),
            goalsFor: z.number().min(0),
            goalsAgainst: z.number().min(0),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Prepare team data
        const homeTeamData: TeamData = {
          name: input.homeTeamName,
          ...input.homeTeam,
        };

        const awayTeamData: TeamData = {
          name: input.awayTeamName,
          ...input.awayTeam,
        };

        // Calculate projections
        const projections = calculateProjections(homeTeamData, awayTeamData);

        // Generate alternative projections
        const alternativeProjections = [
          { home: projections.projectedHomeGoals, away: projections.projectedAwayGoals },
          { home: projections.projectedHomeGoals + 1, away: projections.projectedAwayGoals },
          { home: projections.projectedHomeGoals, away: projections.projectedAwayGoals + 1 },
          { home: projections.projectedHomeGoals - 1, away: projections.projectedAwayGoals },
          { home: projections.projectedHomeGoals, away: projections.projectedAwayGoals - 1 },
        ].filter(p => p.home >= 0 && p.away >= 0);

        // Save to database
        const insertResult = await createAnalysis({
          userId: ctx.user.id,
          homeTeamId: 1, // Placeholder
          awayTeamId: 2, // Placeholder
          homeTeamName: input.homeTeamName,
          awayTeamName: input.awayTeamName,
          analysisMode: input.analysisMode,
          homeProjectedShots: projections.homeProjectedShots,
          awayProjectedShots: projections.awayProjectedShots,
          homeProjectedShotsOnTarget: projections.homeProjectedShotsOnTarget,
          awayProjectedShotsOnTarget: projections.awayProjectedShotsOnTarget,
          homeProjectedCorners: projections.homeProjectedCorners,
          awayProjectedCorners: projections.awayProjectedCorners,
          homeProjectedGoals: projections.homeProjectedGoals,
          awayProjectedGoals: projections.awayProjectedGoals,
          homeOffensiveConversion: projections.homeOffensiveConversion,
          homeDefensiveConversion: projections.homeDefensiveConversion,
          awayOffensiveConversion: projections.awayOffensiveConversion,
          awayDefensiveConversion: projections.awayDefensiveConversion,
          homePressureFactor: projections.homePressureFactor,
          awayPressureFactor: projections.awayPressureFactor,
          projectedHomeGoals: projections.projectedHomeGoals,
          projectedAwayGoals: projections.projectedAwayGoals,
          rankingData: projections.rankingLines,
          homeTeamDataJson: input.homeTeam,
          awayTeamDataJson: input.awayTeam,
          alternativeProjections: alternativeProjections,
        });

        // Extract analysis ID from insert result
        const analysisId = (insertResult as any)?.[0]?.insertId || 1;

        return {
          ...projections,
          analysisId,
        };
      }),

    /**
     * Get all analyses for the current user
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserAnalyses(ctx.user.id);
    }),

    /**
     * Get a specific analysis by ID
     */
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const analysis = await getAnalysisById(input.id, ctx.user.id);
        if (!analysis) {
          throw new Error("Análise não encontrada");
        }
        // Parse ranking data if it's a string
        const rankingData = typeof analysis.rankingData === 'string' 
          ? JSON.parse(analysis.rankingData) 
          : analysis.rankingData;
        return {
          ...analysis,
          rankingData,
        };
      }),

    /**
     * Delete an analysis
     */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteAnalysis(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
