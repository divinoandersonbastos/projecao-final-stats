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
});
