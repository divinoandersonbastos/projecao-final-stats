import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, analyses, teamStats, Analysis, TeamStats } from "../drizzle/schema";
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

  return await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, userId))
    .orderBy(desc(analyses.createdAt));
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
