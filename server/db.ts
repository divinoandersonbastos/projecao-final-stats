import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, analyses, teamStats, Analysis, TeamStats, finalMatchStats, modelValidationResults, InsertFinalMatchStats, InsertModelValidationResult } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new analysis record
 */
export async function createAnalysis(data: {
  userId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  analysisMode: "mode1" | "mode2";
  homeProjectedShots: number;
  awayProjectedShots: number;
  homeProjectedShotsOnTarget: number;
  awayProjectedShotsOnTarget: number;
  homeProjectedCorners: number;
  awayProjectedCorners: number;
  homeProjectedGoals: number;
  awayProjectedGoals: number;
  homeOffensiveConversion: number;
  homeDefensiveConversion: number;
  awayOffensiveConversion: number;
  awayDefensiveConversion: number;
  homePressureFactor: number;
  awayPressureFactor: number;
  projectedHomeGoals: number;
  projectedAwayGoals: number;
  rankingData: unknown;
  homeTeamDataJson: unknown;
  awayTeamDataJson: unknown;
  alternativeProjections: unknown;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(analyses).values({
    userId: data.userId,
    homeTeamId: data.homeTeamId,
    awayTeamId: data.awayTeamId,
    homeTeamName: data.homeTeamName,
    awayTeamName: data.awayTeamName,
    analysisMode: data.analysisMode,
    homeProjectedShots: data.homeProjectedShots.toString() as any,
    awayProjectedShots: data.awayProjectedShots.toString() as any,
    homeProjectedShotsOnTarget: data.homeProjectedShotsOnTarget.toString() as any,
    awayProjectedShotsOnTarget: data.awayProjectedShotsOnTarget.toString() as any,
    homeProjectedCorners: data.homeProjectedCorners.toString() as any,
    awayProjectedCorners: data.awayProjectedCorners.toString() as any,
    homeProjectedGoals: data.homeProjectedGoals.toString() as any,
    awayProjectedGoals: data.awayProjectedGoals.toString() as any,
    homeOffensiveConversion: data.homeOffensiveConversion.toString() as any,
    homeDefensiveConversion: data.homeDefensiveConversion.toString() as any,
    awayOffensiveConversion: data.awayOffensiveConversion.toString() as any,
    awayDefensiveConversion: data.awayDefensiveConversion.toString() as any,
    homePressureFactor: data.homePressureFactor.toString() as any,
    awayPressureFactor: data.awayPressureFactor.toString() as any,
    projectedHomeGoals: data.projectedHomeGoals,
    projectedAwayGoals: data.projectedAwayGoals,
    rankingData: data.rankingData as any,
    homeTeamDataJson: data.homeTeamDataJson as any,
    awayTeamDataJson: data.awayTeamDataJson as any,
    alternativeProjections: data.alternativeProjections as any,
  });

  return result;
}

/**
 * Get all analyses for a user, ordered by most recent
 */
export async function getUserAnalyses(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const results = await db
    .select({
      id: analyses.id,
      userId: analyses.userId,
      homeTeamName: analyses.homeTeamName,
      awayTeamName: analyses.awayTeamName,
      analysisMode: analyses.analysisMode,
      projectedHomeGoals: analyses.projectedHomeGoals,
      projectedAwayGoals: analyses.projectedAwayGoals,
      validationStatus: analyses.validationStatus,
      fixtureId: analyses.fixtureId,
      createdAt: analyses.createdAt,
      // Final match stats (from left join)
      finalHomeGoals: finalMatchStats.homeGoals,
      finalAwayGoals: finalMatchStats.awayGoals,
      // Ranking data
      rankingData: analyses.rankingData,
      // Validation score
      overallScore: modelValidationResults.overallScore,
      overallClassification: modelValidationResults.overallClassification,
    })
    .from(analyses)
    .leftJoin(finalMatchStats, eq(analyses.id, finalMatchStats.analysisId))
    .leftJoin(modelValidationResults, eq(analyses.id, modelValidationResults.analysisId))
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt));

  return results;
}

/**
 * Get a specific analysis by ID
 */
export async function getAnalysisById(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(analyses)
    .where(and(eq(analyses.id, id), eq(analyses.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Delete an analysis
 */
export async function deleteAnalysis(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .delete(analyses)
    .where(and(eq(analyses.id, id), eq(analyses.userId, userId)));
}

/**
 * Create or update team stats
 */
export async function upsertTeamStats(data: {
  userId: number;
  name: string;
  dangerousAttacksFor: number;
  dangerousAttacksAgainst: number;
  cornersFor: number;
  cornersAgainst: number;
  shotsFor: number;
  shotsAgainst: number;
  shotsOnTargetFor: number;
  shotsOnTargetAgainst: number;
  goalsFor: number;
  goalsAgainst: number;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.insert(teamStats).values({
    userId: data.userId,
    name: data.name,
    dangerousAttacksFor: data.dangerousAttacksFor.toString() as any,
    dangerousAttacksAgainst: data.dangerousAttacksAgainst.toString() as any,
    cornersFor: data.cornersFor.toString() as any,
    cornersAgainst: data.cornersAgainst.toString() as any,
    shotsFor: data.shotsFor.toString() as any,
    shotsAgainst: data.shotsAgainst.toString() as any,
    shotsOnTargetFor: data.shotsOnTargetFor.toString() as any,
    shotsOnTargetAgainst: data.shotsOnTargetAgainst.toString() as any,
    goalsFor: data.goalsFor.toString() as any,
    goalsAgainst: data.goalsAgainst.toString() as any,
  });
}

// ============================================================
// Post-Match Validation Helpers
// ============================================================


/**
 * Update analysis with fixture ID and validation status
 */
export async function updateAnalysisFixture(
  analysisId: number,
  userId: number,
  fixtureId: number | null,
  validationStatus: "pending" | "finished" | "validated"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(analyses)
    .set({
      fixtureId: fixtureId,
      validationStatus: validationStatus,
    })
    .where(and(eq(analyses.id, analysisId), eq(analyses.userId, userId)));
}

/**
 * Update only the validation status of an analysis
 */
export async function updateAnalysisStatus(
  analysisId: number,
  validationStatus: "pending" | "finished" | "validated"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(analyses)
    .set({ validationStatus })
    .where(eq(analyses.id, analysisId));
}

/**
 * Save final match stats from API or manual entry
 */
export async function saveFinalMatchStats(data: {
  analysisId: number;
  fixtureId?: number | null;
  homeGoals: number;
  awayGoals: number;
  homeShots?: number | null;
  awayShots?: number | null;
  homeShotsOnTarget?: number | null;
  awayShotsOnTarget?: number | null;
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeDangerousAttacks?: number | null;
  awayDangerousAttacks?: number | null;
  homePossession?: number | null;
  awayPossession?: number | null;
  homeXg?: number | null;
  awayXg?: number | null;
  dataSource: "api-football" | "manual" | "sportmonks";
  rawApiData?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(finalMatchStats).values({
    analysisId: data.analysisId,
    fixtureId: data.fixtureId ?? null,
    homeGoals: data.homeGoals,
    awayGoals: data.awayGoals,
    homeShots: data.homeShots ?? null,
    awayShots: data.awayShots ?? null,
    homeShotsOnTarget: data.homeShotsOnTarget ?? null,
    awayShotsOnTarget: data.awayShotsOnTarget ?? null,
    homeCorners: data.homeCorners ?? null,
    awayCorners: data.awayCorners ?? null,
    homeDangerousAttacks: data.homeDangerousAttacks ?? null,
    awayDangerousAttacks: data.awayDangerousAttacks ?? null,
    homePossession: data.homePossession?.toString() as any ?? null,
    awayPossession: data.awayPossession?.toString() as any ?? null,
    homeXg: data.homeXg?.toString() as any ?? null,
    awayXg: data.awayXg?.toString() as any ?? null,
    dataSource: data.dataSource,
    rawApiData: data.rawApiData as any ?? null,
  });

  return result;
}

/**
 * Get final match stats for an analysis
 */
export async function getFinalMatchStatsByAnalysis(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(finalMatchStats)
    .where(eq(finalMatchStats.analysisId, analysisId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Save model validation results
 */
export async function saveValidationResult(data: {
  analysisId: number;
  finalMatchStatsId: number;
  metricsValidation: unknown;
  overallScore: number;
  overallClassification: "excellent" | "good" | "medium" | "divergent";
  avgAbsoluteError: number;
  avgPercentError: number;
  totalMetrics: number;
  excellentCount: number;
  goodCount: number;
  mediumCount: number;
  divergentCount: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(modelValidationResults).values({
    analysisId: data.analysisId,
    finalMatchStatsId: data.finalMatchStatsId,
    metricsValidation: data.metricsValidation as any,
    overallScore: data.overallScore.toString() as any,
    overallClassification: data.overallClassification,
    avgAbsoluteError: data.avgAbsoluteError.toString() as any,
    avgPercentError: data.avgPercentError.toString() as any,
    totalMetrics: data.totalMetrics,
    excellentCount: data.excellentCount,
    goodCount: data.goodCount,
    mediumCount: data.mediumCount,
    divergentCount: data.divergentCount,
  });
}

/**
 * Get validation result for an analysis
 */
export async function getValidationResultByAnalysis(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(modelValidationResults)
    .where(eq(modelValidationResults.analysisId, analysisId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get analyses filtered by validation status
 */
export async function getUserAnalysesByStatus(userId: number, status?: "pending" | "finished" | "validated") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (status) {
    return await db
      .select()
      .from(analyses)
      .where(and(eq(analyses.userId, userId), eq(analyses.validationStatus, status)))
      .orderBy(desc(analyses.createdAt));
  }

  return await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt));
}

/**
 * Find the most recent analysis matching a pair of team names.
 * Uses LIKE for fuzzy matching since Sportmonks team names may differ slightly from user-entered names.
 * Returns the analysis with projected values and ranking data for live comparison.
 */
export async function findAnalysisByTeams(userId: number, homeTeamName: string, awayTeamName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try exact match first
  let result = await db
    .select()
    .from(analyses)
    .where(
      and(
        eq(analyses.userId, userId),
        like(analyses.homeTeamName, `%${homeTeamName}%`),
        like(analyses.awayTeamName, `%${awayTeamName}%`)
      )
    )
    .orderBy(desc(analyses.createdAt))
    .limit(1);

  // If no match, try reversed (away/home swapped)
  if (result.length === 0) {
    result = await db
      .select()
      .from(analyses)
      .where(
        and(
          eq(analyses.userId, userId),
          like(analyses.homeTeamName, `%${awayTeamName}%`),
          like(analyses.awayTeamName, `%${homeTeamName}%`)
        )
      )
      .orderBy(desc(analyses.createdAt))
      .limit(1);
  }

  return result.length > 0 ? result[0] : null;
}
