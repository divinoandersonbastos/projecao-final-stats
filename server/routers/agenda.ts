import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { fixtures } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  fetchFixturesFromApi,
  fetchLiveFixturesFromApi,
  groupFixturesByLeague,
  filterByStatus,
  filterBySearch,
  AgendaFixture,
  FixtureStatus,
} from "../services/agenda-service";

export const agendaRouter = router({
  /**
   * Get fixtures for a specific date (fetches from API-Football and caches in DB)
   */
  getByDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ input, ctx }) => {
      const { date } = input;
      const userId = ctx.user.id;

      // Check if we have cached fixtures for this date
      const db = await getDb();
      if (!db) return { fixtures: [], groups: [], fromCache: false, total: 0, error: "Database não disponível" };

      const cached = await db
        .select()
        .from(fixtures)
        .where(and(eq(fixtures.date, date), eq(fixtures.userId, userId)));

      if (cached.length > 0) {
        // Return cached data, mapped to AgendaFixture format
        const agendaFixtures: AgendaFixture[] = cached.map((f) => ({
          apiFixtureId: f.apiFixtureId,
          date: f.date,
          time: f.time,
          timezone: f.timezone,
          country: f.country,
          countryCode: f.countryCode || null,
          league: f.league,
          leagueId: f.leagueId,
          season: f.season || null,
          round: f.round || null,
          homeTeam: f.homeTeam,
          homeTeamId: f.homeTeamId,
          awayTeam: f.awayTeam,
          awayTeamId: f.awayTeamId,
          homeLogo: f.homeLogo || null,
          awayLogo: f.awayLogo || null,
          homeScore: f.homeScore,
          awayScore: f.awayScore,
          status: f.status as FixtureStatus,
          statusShort: f.statusShort || "",
          elapsed: f.elapsed,
        }));

        return {
          fixtures: agendaFixtures,
          groups: groupFixturesByLeague(agendaFixtures),
          fromCache: true,
          total: agendaFixtures.length,
        };
      }

      // Fetch from API
      try {
        const apiFixtures = await fetchFixturesFromApi(date);

        // Save to DB cache in batches of 50 to avoid query size limits
        if (apiFixtures.length > 0) {
          const BATCH_SIZE = 10;
          for (let i = 0; i < apiFixtures.length; i += BATCH_SIZE) {
            const batch = apiFixtures.slice(i, i + BATCH_SIZE);
            const insertData = batch.map((f) => ({
              apiFixtureId: f.apiFixtureId,
              date: f.date,
              time: f.time,
              timezone: f.timezone,
              country: f.country,
              countryCode: f.countryCode,
              league: f.league,
              leagueId: f.leagueId,
              season: f.season,
              round: f.round,
              homeTeam: f.homeTeam,
              homeTeamId: f.homeTeamId,
              awayTeam: f.awayTeam,
              awayTeamId: f.awayTeamId,
              homeLogo: f.homeLogo,
              awayLogo: f.awayLogo,
              homeScore: f.homeScore,
              awayScore: f.awayScore,
              status: f.status,
              statusShort: f.statusShort,
              elapsed: f.elapsed,
              hasAnalysis: 0,
              userId,
            }));
            await db.insert(fixtures).values(insertData);
          }
        }

        return {
          fixtures: apiFixtures,
          groups: groupFixturesByLeague(apiFixtures),
          fromCache: false,
          total: apiFixtures.length,
        };
      } catch (error: any) {
        return {
          fixtures: [],
          groups: [],
          fromCache: false,
          total: 0,
          error: error.message || "Não foi possível carregar a agenda.",
        };
      }
    }),

  /**
   * Sync/refresh fixtures for a date (force re-fetch from API)
   */
  sync: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(async ({ input, ctx }) => {
      const { date } = input;
      const userId = ctx.user.id;

      // Delete old cached data for this date
      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      await db
        .delete(fixtures)
        .where(and(eq(fixtures.date, date), eq(fixtures.userId, userId)));

      // Fetch fresh from API
      const apiFixtures = await fetchFixturesFromApi(date);

      // Save to DB in batches of 50
      if (apiFixtures.length > 0) {
        const BATCH_SIZE = 10;
        for (let i = 0; i < apiFixtures.length; i += BATCH_SIZE) {
          const batch = apiFixtures.slice(i, i + BATCH_SIZE);
          const insertData = batch.map((f) => ({
            apiFixtureId: f.apiFixtureId,
            date: f.date,
            time: f.time,
            timezone: f.timezone,
            country: f.country,
            countryCode: f.countryCode,
            league: f.league,
            leagueId: f.leagueId,
            season: f.season,
            round: f.round,
            homeTeam: f.homeTeam,
            homeTeamId: f.homeTeamId,
            awayTeam: f.awayTeam,
            awayTeamId: f.awayTeamId,
            homeLogo: f.homeLogo,
            awayLogo: f.awayLogo,
            homeScore: f.homeScore,
            awayScore: f.awayScore,
            status: f.status,
            statusShort: f.statusShort,
            elapsed: f.elapsed,
            hasAnalysis: 0,
            userId,
          }));
          await db.insert(fixtures).values(insertData);
        }
      }

      return {
        fixtures: apiFixtures,
        groups: groupFixturesByLeague(apiFixtures),
        total: apiFixtures.length,
      };
    }),

  /**
   * Get live fixtures (real-time)
   */
  getLive: protectedProcedure.query(async () => {
    try {
      const liveFixtures = await fetchLiveFixturesFromApi();
      return {
        fixtures: liveFixtures,
        groups: groupFixturesByLeague(liveFixtures),
        total: liveFixtures.length,
      };
    } catch (error: any) {
      return {
        fixtures: [],
        groups: [],
        total: 0,
        error: error.message,
      };
    }
  }),

  /**
   * Get fixture details by API fixture ID
   */
  getDetails: protectedProcedure
    .input(z.object({ apiFixtureId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { apiFixtureId } = input;
      const userId = ctx.user.id;

      // Check local DB first
      const db = await getDb();
      if (!db) return null;

      const [local] = await db
        .select()
        .from(fixtures)
        .where(and(eq(fixtures.apiFixtureId, apiFixtureId), eq(fixtures.userId, userId)))
        .limit(1);

      if (local) {
        return {
          apiFixtureId: local.apiFixtureId,
          date: local.date,
          time: local.time,
          timezone: local.timezone,
          country: local.country,
          countryCode: local.countryCode,
          league: local.league,
          leagueId: local.leagueId,
          season: local.season,
          round: local.round,
          homeTeam: local.homeTeam,
          homeTeamId: local.homeTeamId,
          awayTeam: local.awayTeam,
          awayTeamId: local.awayTeamId,
          homeLogo: local.homeLogo,
          awayLogo: local.awayLogo,
          homeScore: local.homeScore,
          awayScore: local.awayScore,
          status: local.status as FixtureStatus,
          statusShort: local.statusShort || "",
          elapsed: local.elapsed,
          hasAnalysis: local.hasAnalysis === 1,
          analysisId: local.analysisId,
        };
      }

      return null;
    }),

  /**
   * Mark a fixture as having an analysis created
   */
  linkAnalysis: protectedProcedure
    .input(z.object({ apiFixtureId: z.number(), analysisId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { apiFixtureId, analysisId } = input;
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      await db
        .update(fixtures)
        .set({ hasAnalysis: 1, analysisId })
        .where(and(eq(fixtures.apiFixtureId, apiFixtureId), eq(fixtures.userId, userId)));

      return { success: true };
    }),
});
