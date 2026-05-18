/**
 * Accuracy Router
 * Handles saving post-match comparison results and retrieving accuracy history/stats.
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  saveAccuracyRecord,
  getAccuracyRecords,
  getAccuracyStats,
  getAccuracyByCategory,
  getAccuracyRecordByAnalysisId,
} from '../db';
import { processRankingLines, computeAccuracyMetrics } from '../services/accuracy-service';
import { findAnalysisByTeams } from '../db';
import { getMatchDetail, LiveMatchDetail } from '../services/sportmonks-livescore';

const RankingLineSchema = z.object({
  line: z.string(),
  projection: z.number(),
  baseline: z.number(),
  confidenceIndex: z.number(),
  category: z.string(),
});

const LiveStatsSchema = z.object({
  homeGoals: z.number(),
  awayGoals: z.number(),
  homeShots: z.number().optional(),
  awayShots: z.number().optional(),
  homeCorners: z.number().optional(),
  awayCorners: z.number().optional(),
  homeShotsOnTarget: z.number().optional(),
  awayShotsOnTarget: z.number().optional(),
  homePossession: z.number().optional(),
  awayPossession: z.number().optional(),
});

export const accuracyRouter = router({
  /**
   * Save accuracy result for a finished match.
   * Calculates badges for all ranking lines and stores aggregate metrics.
   */
  saveResult: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      fixtureId: z.number().optional(),
      matchDate: z.string(),
      homeTeamName: z.string(),
      awayTeamName: z.string(),
      league: z.string().optional(),
      projectedHomeGoals: z.number(),
      projectedAwayGoals: z.number(),
      projections: z.object({
        homeShots: z.number().optional(),
        awayShots: z.number().optional(),
        homeCorners: z.number().optional(),
        awayCorners: z.number().optional(),
        homeShotsOnTarget: z.number().optional(),
        awayShotsOnTarget: z.number().optional(),
      }).optional(),
      rankingLines: z.array(RankingLineSchema),
      actualStats: LiveStatsSchema,
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Check if already saved for this analysis
      const existing = await getAccuracyRecordByAnalysisId(userId, input.analysisId);
      if (existing) {
        return { id: existing.id, alreadyExists: true };
      }

      // Process ranking lines to get badge results
      const badgeResults = processRankingLines(
        input.rankingLines,
        input.homeTeamName,
        input.awayTeamName,
        input.actualStats
      );

      const metrics = computeAccuracyMetrics(badgeResults);

      // Goal projection hit: exact score match
      const goalProjectionHit =
        input.actualStats.homeGoals === input.projectedHomeGoals &&
        input.actualStats.awayGoals === input.projectedAwayGoals
          ? 1 : 0;

      const goalDiff =
        Math.abs(input.actualStats.homeGoals - input.projectedHomeGoals) +
        Math.abs(input.actualStats.awayGoals - input.projectedAwayGoals);

      const id = await saveAccuracyRecord({
        userId,
        analysisId: input.analysisId,
        fixtureId: input.fixtureId,
        matchDate: input.matchDate,
        homeTeamName: input.homeTeamName,
        awayTeamName: input.awayTeamName,
        league: input.league,
        projectedHomeGoals: input.projectedHomeGoals,
        projectedAwayGoals: input.projectedAwayGoals,
        projectedHomeShots: input.projections?.homeShots?.toFixed(2),
        projectedAwayShots: input.projections?.awayShots?.toFixed(2),
        projectedHomeCorners: input.projections?.homeCorners?.toFixed(2),
        projectedAwayCorners: input.projections?.awayCorners?.toFixed(2),
        projectedHomeShotsOnTarget: input.projections?.homeShotsOnTarget?.toFixed(2),
        projectedAwayShotsOnTarget: input.projections?.awayShotsOnTarget?.toFixed(2),
        actualHomeGoals: input.actualStats.homeGoals,
        actualAwayGoals: input.actualStats.awayGoals,
        actualHomeShots: input.actualStats.homeShots,
        actualAwayShots: input.actualStats.awayShots,
        actualHomeCorners: input.actualStats.homeCorners,
        actualAwayCorners: input.actualStats.awayCorners,
        actualHomeShotsOnTarget: input.actualStats.homeShotsOnTarget,
        actualAwayShotsOnTarget: input.actualStats.awayShotsOnTarget,
        rankingLineResults: badgeResults,
        totalLines: metrics.totalLines,
        greenCount: metrics.greenCount,
        yellowCount: metrics.yellowCount,
        redCount: metrics.redCount,
        hitRate: metrics.hitRate.toFixed(2),
        goalProjectionHit,
        goalDiff,
        notes: input.notes,
      });

      return { id, alreadyExists: false };
    }),

  /**
   * Get accuracy history for the current user.
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input, ctx }) => {
      const records = await getAccuracyRecords(ctx.user.id, input.limit);
      return records.map(r => ({
        ...r,
        rankingLineResults: typeof r.rankingLineResults === 'string'
          ? JSON.parse(r.rankingLineResults)
          : r.rankingLineResults,
        hitRate: parseFloat(String(r.hitRate)),
        projectedHomeShots: r.projectedHomeShots ? parseFloat(String(r.projectedHomeShots)) : null,
        projectedAwayShots: r.projectedAwayShots ? parseFloat(String(r.projectedAwayShots)) : null,
        projectedHomeCorners: r.projectedHomeCorners ? parseFloat(String(r.projectedHomeCorners)) : null,
        projectedAwayCorners: r.projectedAwayCorners ? parseFloat(String(r.projectedAwayCorners)) : null,
      }));
    }),

  /**
   * Get aggregate accuracy statistics for the current user.
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const [stats, byCategory] = await Promise.all([
        getAccuracyStats(ctx.user.id),
        getAccuracyByCategory(ctx.user.id),
      ]);
      return { stats, byCategory };
    }),

  /**
   * Auto-save result for a finished Sportmonks fixture that has a matching analysis.
   * Fetches live stats from Sportmonks and processes badges automatically.
   */
  autoSaveFromFixture: protectedProcedure
    .input(z.object({
      fixtureId: z.number(),
      homeTeamName: z.string(),
      awayTeamName: z.string(),
      matchDate: z.string(),
      league: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Find matching analysis
      const analysis = await findAnalysisByTeams(userId, input.homeTeamName, input.awayTeamName);
      if (!analysis) {
        return { saved: false, reason: 'no_analysis' };
      }

      // Check if already saved
      const existing = await getAccuracyRecordByAnalysisId(userId, analysis.id);
      if (existing) {
        return { saved: false, reason: 'already_saved', id: existing.id };
      }

      // Fetch match detail from Sportmonks
      const matchDetail = await getMatchDetail(input.fixtureId);
      if (!matchDetail || (matchDetail as LiveMatchDetail).fixture.state !== 'FT') {
        return { saved: false, reason: 'match_not_finished' };
      }

      // Parse ranking data
      const rankingData = (typeof analysis.rankingData === 'string'
        ? JSON.parse(analysis.rankingData)
        : analysis.rankingData) as any[];

      const validStatuses = ['Forte', 'Média'];
      const rankingLines = (rankingData || [])
        .filter((line: any) => validStatuses.includes(line.status) && line.confidenceIndex >= 6.0)
        .slice(0, 8)
        .map((line: any) => ({
          line: line.line,
          projection: line.projection,
          baseline: line.baseline,
          confidenceIndex: line.confidenceIndex,
          category: line.category,
        }));

      if (rankingLines.length === 0) {
        return { saved: false, reason: 'no_ranking_lines' };
      }

      // Build actual stats from match detail (LiveMatchDetail structure)
      const detail = matchDetail as LiveMatchDetail;
      const actualStats = {
        homeGoals: detail.fixture.homeGoals ?? 0,
        awayGoals: detail.fixture.awayGoals ?? 0,
        homeShots: detail.stats?.totalShots?.home ?? undefined,
        awayShots: detail.stats?.totalShots?.away ?? undefined,
        homeCorners: detail.stats?.corners?.home ?? undefined,
        awayCorners: detail.stats?.corners?.away ?? undefined,
        homeShotsOnTarget: detail.stats?.shotsOnTarget?.home ?? undefined,
        awayShotsOnTarget: detail.stats?.shotsOnTarget?.away ?? undefined,
      };

      const badgeResults = processRankingLines(rankingLines, input.homeTeamName, input.awayTeamName, actualStats);
      const metrics = computeAccuracyMetrics(badgeResults);

      const goalProjectionHit =
        actualStats.homeGoals === analysis.projectedHomeGoals &&
        actualStats.awayGoals === analysis.projectedAwayGoals ? 1 : 0;

      const goalDiff =
        Math.abs(actualStats.homeGoals - analysis.projectedHomeGoals) +
        Math.abs(actualStats.awayGoals - analysis.projectedAwayGoals);

      const id = await saveAccuracyRecord({
        userId,
        analysisId: analysis.id,
        fixtureId: input.fixtureId,
        matchDate: input.matchDate,
        homeTeamName: input.homeTeamName,
        awayTeamName: input.awayTeamName,
        league: input.league,
        projectedHomeGoals: analysis.projectedHomeGoals,
        projectedAwayGoals: analysis.projectedAwayGoals,
        projectedHomeShots: parseFloat(analysis.homeProjectedShots as string).toFixed(2),
        projectedAwayShots: parseFloat(analysis.awayProjectedShots as string).toFixed(2),
        projectedHomeCorners: parseFloat(analysis.homeProjectedCorners as string).toFixed(2),
        projectedAwayCorners: parseFloat(analysis.awayProjectedCorners as string).toFixed(2),
        projectedHomeShotsOnTarget: parseFloat(analysis.homeProjectedShotsOnTarget as string).toFixed(2),
        projectedAwayShotsOnTarget: parseFloat(analysis.awayProjectedShotsOnTarget as string).toFixed(2),
        actualHomeGoals: actualStats.homeGoals,
        actualAwayGoals: actualStats.awayGoals,
        actualHomeShots: actualStats.homeShots,
        actualAwayShots: actualStats.awayShots,
        actualHomeCorners: actualStats.homeCorners,
        actualAwayCorners: actualStats.awayCorners,
        actualHomeShotsOnTarget: actualStats.homeShotsOnTarget,
        actualAwayShotsOnTarget: actualStats.awayShotsOnTarget,
        rankingLineResults: badgeResults,
        totalLines: metrics.totalLines,
        greenCount: metrics.greenCount,
        yellowCount: metrics.yellowCount,
        redCount: metrics.redCount,
        hitRate: metrics.hitRate.toFixed(2),
        goalProjectionHit,
        goalDiff,
      });

      return { saved: true, id };
    }),
});
