/**
 * Livescore Router
 * Provides real-time match data for the "Ao Vivo" module
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  getInplayFixtures,
  getTodayFixtures,
  getMatchDetail,
  getFixturesByDate,
} from '../services/sportmonks-livescore';
import { findAnalysisByTeams } from '../db';

export const livescoreRouter = router({
  /**
   * Get today's fixtures grouped by status (live, upcoming, finished)
   */
  getTodayFixtures: protectedProcedure
    .query(async () => {
      const result = await getTodayFixtures();
      return result;
    }),

  /**
   * Get only live (inplay) fixtures
   */
  getInplay: protectedProcedure
    .query(async () => {
      const fixtures = await getInplayFixtures();
      return fixtures;
    }),

  /**
   * Get full match detail with stats and events
   */
  getMatchDetail: protectedProcedure
    .input(z.object({ fixtureId: z.number() }))
    .query(async ({ input }) => {
      const detail = await getMatchDetail(input.fixtureId);
      return detail;
    }),

  /**
   * Get fixtures for a specific date
   */
  getByDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const fixtures = await getFixturesByDate(input.date);
      return fixtures;
    }),

  /**
   * Get projection comparison for a live match.
   * Finds the most recent analysis matching the fixture's teams and returns
   * projected values + ranking data for real-time comparison badges.
   */
  getProjectionComparison: protectedProcedure
    .input(z.object({
      homeTeamName: z.string(),
      awayTeamName: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const analysis = await findAnalysisByTeams(userId, input.homeTeamName, input.awayTeamName);

      if (!analysis) {
        return null;
      }

      // Parse ranking data to extract suggestion lines
      const rankingData = (typeof analysis.rankingData === 'string'
        ? JSON.parse(analysis.rankingData)
        : analysis.rankingData) as any[];

      // Filter ranking lines: "Forte" or "Média" status with confidence >= 6.0
      const validStatuses = ['Forte', 'Média'];

      // Build projection summary
      return {
        analysisId: analysis.id,
        homeTeamName: analysis.homeTeamName,
        awayTeamName: analysis.awayTeamName,
        projectedHomeGoals: analysis.projectedHomeGoals,
        projectedAwayGoals: analysis.projectedAwayGoals,
        projections: {
          homeShots: parseFloat(analysis.homeProjectedShots as string),
          awayShots: parseFloat(analysis.awayProjectedShots as string),
          homeShotsOnTarget: parseFloat(analysis.homeProjectedShotsOnTarget as string),
          awayShotsOnTarget: parseFloat(analysis.awayProjectedShotsOnTarget as string),
          homeCorners: parseFloat(analysis.homeProjectedCorners as string),
          awayCorners: parseFloat(analysis.awayProjectedCorners as string),
          homeGoals: parseFloat(analysis.homeProjectedGoals as string),
          awayGoals: parseFloat(analysis.awayProjectedGoals as string),
        },
        rankingLines: (rankingData || []).filter((line: any) =>
          validStatuses.includes(line.status) && line.confidenceIndex >= 6.0
        ).slice(0, 8).map((line: any) => ({
          line: line.line,
          projection: line.projection,
          baseline: line.baseline,
          confidenceIndex: line.confidenceIndex,
          category: line.category,
        })),
        createdAt: analysis.createdAt,
      };
    }),
});
