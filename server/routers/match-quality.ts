/**
 * Match Quality Router
 * Provides endpoints for calculating and retrieving match quality scores
 * Uses Sportmonks API directly to get fixtures from covered leagues only
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc.js';
import { getDb } from '../db.js';
import { dailyMatchQuality } from '../../drizzle/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { getTeamStats, getFixturesByDate, getAvailableLeagues } from '../services/sportmonks-service.js';
import { calculateMatchQuality, type FixtureContext, type MatchQualityResult } from '../services/match-quality-service.js';

export const matchQualityRouter = router({
  /**
   * Get top matches for a specific date (from cache)
   */
  getTopMatches: protectedProcedure
    .input(z.object({
      date: z.string(), // YYYY-MM-DD
      minScore: z.number().optional().default(0),
      blockFilter: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Check cache
      const cached = await db
        .select()
        .from(dailyMatchQuality)
        .where(
          and(
            eq(dailyMatchQuality.matchDate, input.date),
            eq(dailyMatchQuality.userId, ctx.user.id)
          )
        )
        .orderBy(desc(dailyMatchQuality.qualityScore));

      if (cached.length > 0) {
        let filteredResults = cached;

        // Apply min score filter
        if (input.minScore > 0) {
          filteredResults = filteredResults.filter((r: any) => parseFloat(String(r.qualityScore)) >= input.minScore);
        }

        // Apply block filter
        if (input.blockFilter) {
          filteredResults = filteredResults.filter((r: any) => {
            const blocks = r.bestBlocksJson as string[];
            return blocks.includes(input.blockFilter!);
          });
        }

        return filteredResults.map((r: any) => ({
          id: r.id,
          fixtureId: r.fixtureId,
          matchDate: r.matchDate,
          homeTeam: r.homeTeam,
          awayTeam: r.awayTeam,
          homeTeamId: r.homeTeamId,
          awayTeamId: r.awayTeamId,
          league: r.league,
          country: r.country,
          time: r.time,
          qualityScore: parseFloat(String(r.qualityScore)),
          qualityLabel: r.qualityLabel,
          dataAvailabilityScore: parseFloat(String(r.dataAvailabilityScore)),
          homeAwayScore: parseFloat(String(r.homeAwayScore)),
          offensiveVolumeScore: parseFloat(String(r.offensiveVolumeScore)),
          defensiveVolumeScore: parseFloat(String(r.defensiveVolumeScore)),
          competitiveBalanceScore: parseFloat(String(r.competitiveBalanceScore)),
          contextRiskScore: parseFloat(String(r.contextRiskScore)),
          bestBlocks: r.bestBlocksJson as string[],
          alerts: r.alertsJson as string[],
          explanation: r.explanation,
          projectedStats: r.projectedStatsJson,
        }));
      }

      return [];
    }),

  /**
   * Calculate quality for fixtures on a specific date
   * Fetches fixtures directly from Sportmonks (only covered leagues)
   * Then fetches team stats and calculates quality scores
   */
  calculateForDate: protectedProcedure
    .input(z.object({
      date: z.string(), // YYYY-MM-DD
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Delete old cache for this date
      await db
        .delete(dailyMatchQuality)
        .where(
          and(
            eq(dailyMatchQuality.matchDate, input.date),
            eq(dailyMatchQuality.userId, ctx.user.id)
          )
        );

      // Step 1: Get available leagues and their current seasons
      const leagues = await getAvailableLeagues();
      const leagueSeasonMap = new Map<number, { name: string; seasonId: number }>();
      for (const league of leagues) {
        if (league.currentSeasonId) {
          leagueSeasonMap.set(league.id, { name: league.name, seasonId: league.currentSeasonId });
        }
      }

      // Step 2: Get fixtures from Sportmonks for this date (only covered leagues)
      const fixtures = await getFixturesByDate(input.date);

      // Filter only scheduled/not-started fixtures (state short_name = 'NS')
      // Also include fixtures that haven't started yet based on time
      const relevantFixtures = fixtures.filter(f => {
        const stateShort = f.state?.short_name?.toUpperCase();
        return stateShort === 'NS' || stateShort === 'TBA' || stateShort === 'POSTP';
      });

      if (relevantFixtures.length === 0) {
        // If no scheduled games, include all fixtures from today
        // (might be that all games already started/finished)
        // Show all fixtures for analysis
      }

      const fixturesToAnalyze = relevantFixtures.length > 0 ? relevantFixtures : fixtures;

      const results: Array<{
        fixtureId: number;
        homeTeam: string;
        awayTeam: string;
        league: string;
        quality: MatchQualityResult;
      }> = [];

      // Step 3: For each fixture, get team stats and calculate quality
      for (const fixture of fixturesToAnalyze.slice(0, 20)) {
        try {
          const home = fixture.participants.find(p => p.meta?.location === 'home');
          const away = fixture.participants.find(p => p.meta?.location === 'away');

          if (!home || !away) continue;

          const leagueInfo = leagueSeasonMap.get(fixture.leagueId);
          if (!leagueInfo) continue; // Skip if league not in subscription

          const seasonId = leagueInfo.seasonId;

          // Get team stats using the Sportmonks team IDs directly (no search needed!)
          const [homeStats, awayStats] = await Promise.all([
            getTeamStats(home.id, seasonId).catch(() => null),
            getTeamStats(away.id, seasonId).catch(() => null),
          ]);

          // Determine context
          const isKnockout = fixture.name?.toLowerCase().includes('final') ||
            fixture.name?.toLowerCase().includes('semi') ||
            fixture.name?.toLowerCase().includes('quarter') || false;

          const leagueName = fixture.league?.name || leagueInfo.name;
          const isCup = leagueName.toLowerCase().includes('cup') ||
            leagueName.toLowerCase().includes('copa') ||
            leagueName.toLowerCase().includes('libertadores');

          const context: FixtureContext = {
            isKnockout,
            isFriendly: false,
            isPreseason: false,
            leagueType: isCup ? 'cup' : 'league',
            round: fixture.leg || undefined,
          };

          const quality = calculateMatchQuality(
            homeStats,
            awayStats,
            context,
            home.name,
            away.name
          );

          // Extract time from startingAt
          const startTime = fixture.startingAt ? new Date(fixture.startingAt) : null;
          const timeStr = startTime ? `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}` : null;

          results.push({
            fixtureId: fixture.id,
            homeTeam: home.name,
            awayTeam: away.name,
            league: leagueName,
            quality,
          });

          // Save to cache
          await db.insert(dailyMatchQuality).values({
            fixtureId: fixture.id,
            matchDate: input.date,
            homeTeam: home.name,
            awayTeam: away.name,
            homeTeamId: home.id,
            awayTeamId: away.id,
            league: leagueName,
            country: fixture.league?.country_id ? String(fixture.league.country_id) : 'Unknown',
            time: timeStr,
            qualityScore: quality.qualityScore.toFixed(2),
            qualityLabel: quality.qualityLabel,
            dataAvailabilityScore: quality.criteria.dataAvailability.toFixed(2),
            homeAwayScore: quality.criteria.homeAwayCoherence.toFixed(2),
            offensiveVolumeScore: quality.criteria.offensiveVolume.toFixed(2),
            defensiveVolumeScore: quality.criteria.defensiveVolume.toFixed(2),
            competitiveBalanceScore: quality.criteria.competitiveBalance.toFixed(2),
            contextRiskScore: quality.criteria.contextRisk.toFixed(2),
            bestBlocksJson: quality.bestBlocks,
            alertsJson: quality.alerts,
            explanation: quality.explanation,
            projectedStatsJson: quality.projectedStats,
            sportmonksHomeTeamId: home.id,
            sportmonksAwayTeamId: away.id,
            sportmonksSeasonId: seasonId,
            userId: ctx.user.id,
          });
        } catch (error) {
          console.error(`Error calculating quality for fixture ${fixture.id}:`, error);
          // Continue with next fixture
        }
      }

      return {
        total: results.length,
        results: results
          .sort((a, b) => b.quality.qualityScore - a.quality.qualityScore)
          .map(r => ({
            fixtureId: r.fixtureId,
            homeTeam: r.homeTeam,
            awayTeam: r.awayTeam,
            league: r.league,
            qualityScore: r.quality.qualityScore,
            qualityLabel: r.quality.qualityLabel,
            bestBlocks: r.quality.bestBlocks,
            alerts: r.quality.alerts,
            explanation: r.quality.explanation,
          })),
      };
    }),

  /**
   * Get quality detail for a single fixture
   */
  getDetail: protectedProcedure
    .input(z.object({ fixtureId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [result] = await db
        .select()
        .from(dailyMatchQuality)
        .where(
          and(
            eq(dailyMatchQuality.fixtureId, input.fixtureId),
            eq(dailyMatchQuality.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!result) return null;

      return {
        id: result.id,
        fixtureId: result.fixtureId,
        homeTeam: result.homeTeam,
        awayTeam: result.awayTeam,
        qualityScore: parseFloat(String(result.qualityScore)),
        qualityLabel: result.qualityLabel,
        criteria: {
          dataAvailability: parseFloat(String(result.dataAvailabilityScore)),
          homeAwayCoherence: parseFloat(String(result.homeAwayScore)),
          offensiveVolume: parseFloat(String(result.offensiveVolumeScore)),
          defensiveVolume: parseFloat(String(result.defensiveVolumeScore)),
          competitiveBalance: parseFloat(String(result.competitiveBalanceScore)),
          contextRisk: parseFloat(String(result.contextRiskScore)),
        },
        bestBlocks: result.bestBlocksJson as string[],
        alerts: result.alertsJson as string[],
        explanation: result.explanation,
        projectedStats: result.projectedStatsJson,
      };
    }),
});
