import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Team statistics table - stores individual team data for analysis
 */
export const teamStats = mysqlTable("teamStats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  dangerousAttacksFor: decimal("dangerousAttacksFor", { precision: 10, scale: 2 }).notNull(),
  dangerousAttacksAgainst: decimal("dangerousAttacksAgainst", { precision: 10, scale: 2 }).notNull(),
  cornersFor: decimal("cornersFor", { precision: 10, scale: 2 }).notNull(),
  cornersAgainst: decimal("cornersAgainst", { precision: 10, scale: 2 }).notNull(),
  shotsFor: decimal("shotsFor", { precision: 10, scale: 2 }).notNull(),
  shotsAgainst: decimal("shotsAgainst", { precision: 10, scale: 2 }).notNull(),
  shotsOnTargetFor: decimal("shotsOnTargetFor", { precision: 10, scale: 2 }).notNull(),
  shotsOnTargetAgainst: decimal("shotsOnTargetAgainst", { precision: 10, scale: 2 }).notNull(),
  goalsFor: decimal("goalsFor", { precision: 10, scale: 2 }).notNull(),
  goalsAgainst: decimal("goalsAgainst", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamStats = typeof teamStats.$inferSelect;
export type InsertTeamStats = typeof teamStats.$inferInsert;

/**
 * Analysis table - stores complete match projections and calculations
 */
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  homeTeamId: int("homeTeamId").notNull(),
  awayTeamId: int("awayTeamId").notNull(),
  homeTeamName: varchar("homeTeamName", { length: 255 }).notNull(),
  awayTeamName: varchar("awayTeamName", { length: 255 }).notNull(),
  analysisMode: mysqlEnum("analysisMode", ["mode1", "mode2"]).default("mode2").notNull(),
  
  // Projected values
  homeProjectedShots: decimal("homeProjectedShots", { precision: 10, scale: 2 }).notNull(),
  awayProjectedShots: decimal("awayProjectedShots", { precision: 10, scale: 2 }).notNull(),
  homeProjectedShotsOnTarget: decimal("homeProjectedShotsOnTarget", { precision: 10, scale: 2 }).notNull(),
  awayProjectedShotsOnTarget: decimal("awayProjectedShotsOnTarget", { precision: 10, scale: 2 }).notNull(),
  homeProjectedCorners: decimal("homeProjectedCorners", { precision: 10, scale: 2 }).notNull(),
  awayProjectedCorners: decimal("awayProjectedCorners", { precision: 10, scale: 2 }).notNull(),
  homeProjectedGoals: decimal("homeProjectedGoals", { precision: 10, scale: 2 }).notNull(),
  awayProjectedGoals: decimal("awayProjectedGoals", { precision: 10, scale: 2 }).notNull(),
  
  // Conversion rates
  homeOffensiveConversion: decimal("homeOffensiveConversion", { precision: 10, scale: 4 }).notNull(),
  homeDefensiveConversion: decimal("homeDefensiveConversion", { precision: 10, scale: 4 }).notNull(),
  awayOffensiveConversion: decimal("awayOffensiveConversion", { precision: 10, scale: 4 }).notNull(),
  awayDefensiveConversion: decimal("awayDefensiveConversion", { precision: 10, scale: 4 }).notNull(),
  
  // Pressure factors
  homePressureFactor: decimal("homePressureFactor", { precision: 10, scale: 4 }).notNull(),
  awayPressureFactor: decimal("awayPressureFactor", { precision: 10, scale: 4 }).notNull(),
  
  // Final projection
  projectedHomeGoals: int("projectedHomeGoals").notNull(),
  projectedAwayGoals: int("projectedAwayGoals").notNull(),
  
  // Original team data (for reference)
  homeTeamDataJson: json("homeTeamDataJson").notNull(),
  awayTeamDataJson: json("awayTeamDataJson").notNull(),
  
  // Ranking data (stored as JSON for flexibility)
  rankingData: json("rankingData").notNull(),
  
  // Alternative projections
  alternativeProjections: json("alternativeProjections").notNull(),

  // Post-match validation fields
  fixtureId: int("fixtureId"),
  validationStatus: mysqlEnum("validationStatus", ["pending", "finished", "validated"]).default("pending").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

/**
 * Final match stats - stores real post-match statistics from API-Football
 */
export const finalMatchStats = mysqlTable("finalMatchStats", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  fixtureId: int("fixtureId"),

  // Real match results
  homeGoals: int("homeGoals").notNull(),
  awayGoals: int("awayGoals").notNull(),
  homeShots: int("homeShots"),
  awayShots: int("awayShots"),
  homeShotsOnTarget: int("homeShotsOnTarget"),
  awayShotsOnTarget: int("awayShotsOnTarget"),
  homeCorners: int("homeCorners"),
  awayCorners: int("awayCorners"),
  homeDangerousAttacks: int("homeDangerousAttacks"),
  awayDangerousAttacks: int("awayDangerousAttacks"),
  homePossession: decimal("homePossession", { precision: 5, scale: 2 }),
  awayPossession: decimal("awayPossession", { precision: 5, scale: 2 }),
  homeXg: decimal("homeXg", { precision: 5, scale: 2 }),
  awayXg: decimal("awayXg", { precision: 5, scale: 2 }),

  // Source of data
  dataSource: mysqlEnum("dataSource", ["api-football", "manual", "sportmonks"]).default("manual").notNull(),

  // Raw API response for reference
  rawApiData: json("rawApiData"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinalMatchStats = typeof finalMatchStats.$inferSelect;
export type InsertFinalMatchStats = typeof finalMatchStats.$inferInsert;

/**
 * Model validation results - stores comparison between projection and real results
 */
export const modelValidationResults = mysqlTable("modelValidationResults", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysisId").notNull(),
  finalMatchStatsId: int("finalMatchStatsId").notNull(),

  // Per-metric validation (stored as JSON array for flexibility)
  // Each entry: { metric, projected, actual, absoluteError, percentError, classification }
  metricsValidation: json("metricsValidation").notNull(),

  // Overall model score (0-100)
  overallScore: decimal("overallScore", { precision: 5, scale: 2 }).notNull(),
  overallClassification: mysqlEnum("overallClassification", ["excellent", "good", "medium", "divergent"]).notNull(),

  // Summary stats
  avgAbsoluteError: decimal("avgAbsoluteError", { precision: 10, scale: 4 }).notNull(),
  avgPercentError: decimal("avgPercentError", { precision: 10, scale: 4 }).notNull(),
  totalMetrics: int("totalMetrics").notNull(),
  excellentCount: int("excellentCount").notNull(),
  goodCount: int("goodCount").notNull(),
  mediumCount: int("mediumCount").notNull(),
  divergentCount: int("divergentCount").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ModelValidationResult = typeof modelValidationResults.$inferSelect;
export type InsertModelValidationResult = typeof modelValidationResults.$inferInsert;

/**
 * Fixtures calendar - stores match schedule from API-Football
 */
export const fixtures = mysqlTable("fixtures", {
  id: int("id").autoincrement().primaryKey(),
  apiFixtureId: int("apiFixtureId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  time: varchar("time", { length: 5 }).notNull(), // HH:MM
  timezone: varchar("timezone", { length: 64 }).default("America/Sao_Paulo").notNull(),
  country: varchar("country", { length: 128 }).notNull(),
  countryCode: varchar("countryCode", { length: 512 }),
  league: varchar("league", { length: 255 }).notNull(),
  leagueId: int("leagueId").notNull(),
  season: int("season"),
  round: varchar("round", { length: 128 }),
  homeTeam: varchar("homeTeam", { length: 255 }).notNull(),
  homeTeamId: int("homeTeamId").notNull(),
  awayTeam: varchar("awayTeam", { length: 255 }).notNull(),
  awayTeamId: int("awayTeamId").notNull(),
  homeLogo: varchar("homeLogo", { length: 512 }),
  awayLogo: varchar("awayLogo", { length: 512 }),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  status: mysqlEnum("status", ["scheduled", "live", "halftime", "finished", "postponed", "cancelled", "unknown"]).default("scheduled").notNull(),
  statusShort: varchar("statusShort", { length: 10 }),
  elapsed: int("elapsed"),
  hasAnalysis: int("hasAnalysis").default(0).notNull(), // 0 or 1
  analysisId: int("analysisId"),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fixture = typeof fixtures.$inferSelect;
export type InsertFixture = typeof fixtures.$inferInsert;

/**
 * Daily match quality - caches quality scores for fixtures
 */
export const dailyMatchQuality = mysqlTable("dailyMatchQuality", {
  id: int("id").autoincrement().primaryKey(),
  fixtureId: int("fixtureId").notNull(),
  matchDate: varchar("matchDate", { length: 10 }).notNull(), // YYYY-MM-DD
  homeTeam: varchar("homeTeam", { length: 255 }).notNull(),
  awayTeam: varchar("awayTeam", { length: 255 }).notNull(),
  homeTeamId: int("homeTeamId").notNull(),
  awayTeamId: int("awayTeamId").notNull(),
  league: varchar("league", { length: 255 }).notNull(),
  country: varchar("country", { length: 128 }).notNull(),
  time: varchar("time", { length: 5 }),
  
  // Quality scores (0-10)
  qualityScore: decimal("qualityScore", { precision: 4, scale: 2 }).notNull(),
  qualityLabel: mysqlEnum("qualityLabel", ["excellent", "good", "acceptable", "caution", "avoid"]).notNull(),
  
  // Individual criteria scores (0-10)
  dataAvailabilityScore: decimal("dataAvailabilityScore", { precision: 4, scale: 2 }).notNull(),
  homeAwayScore: decimal("homeAwayScore", { precision: 4, scale: 2 }).notNull(),
  offensiveVolumeScore: decimal("offensiveVolumeScore", { precision: 4, scale: 2 }).notNull(),
  defensiveVolumeScore: decimal("defensiveVolumeScore", { precision: 4, scale: 2 }).notNull(),
  competitiveBalanceScore: decimal("competitiveBalanceScore", { precision: 4, scale: 2 }).notNull(),
  contextRiskScore: decimal("contextRiskScore", { precision: 4, scale: 2 }).notNull(),
  
  // Best statistical blocks (JSON array of strings)
  bestBlocksJson: json("bestBlocksJson").notNull(),
  // Alerts (JSON array of strings)
  alertsJson: json("alertsJson").notNull(),
  // Explanation text
  explanation: text("explanation"),
  
  // Projected stats used for calculation
  projectedStatsJson: json("projectedStatsJson"),
  
  // Sportmonks IDs for reference
  sportmonksHomeTeamId: int("sportmonksHomeTeamId"),
  sportmonksAwayTeamId: int("sportmonksAwayTeamId"),
  sportmonksSeasonId: int("sportmonksSeasonId"),
  
  userId: int("userId").notNull(),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export type DailyMatchQuality = typeof dailyMatchQuality.$inferSelect;
export type InsertDailyMatchQuality = typeof dailyMatchQuality.$inferInsert;

/**
 * Accuracy records - stores post-match comparison results between projections and real outcomes
 * Used to build the model accuracy dashboard
 */
export const accuracyRecords = mysqlTable("accuracyRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  analysisId: int("analysisId").notNull(),

  // Match identification
  fixtureId: int("fixtureId"),
  matchDate: varchar("matchDate", { length: 10 }).notNull(), // YYYY-MM-DD
  homeTeamName: varchar("homeTeamName", { length: 255 }).notNull(),
  awayTeamName: varchar("awayTeamName", { length: 255 }).notNull(),
  league: varchar("league", { length: 255 }),

  // Projected values
  projectedHomeGoals: int("projectedHomeGoals").notNull(),
  projectedAwayGoals: int("projectedAwayGoals").notNull(),
  projectedHomeShots: decimal("projectedHomeShots", { precision: 6, scale: 2 }),
  projectedAwayShots: decimal("projectedAwayShots", { precision: 6, scale: 2 }),
  projectedHomeCorners: decimal("projectedHomeCorners", { precision: 6, scale: 2 }),
  projectedAwayCorners: decimal("projectedAwayCorners", { precision: 6, scale: 2 }),
  projectedHomeShotsOnTarget: decimal("projectedHomeShotsOnTarget", { precision: 6, scale: 2 }),
  projectedAwayShotsOnTarget: decimal("projectedAwayShotsOnTarget", { precision: 6, scale: 2 }),

  // Actual values (from Sportmonks post-match)
  actualHomeGoals: int("actualHomeGoals").notNull(),
  actualAwayGoals: int("actualAwayGoals").notNull(),
  actualHomeShots: int("actualHomeShots"),
  actualAwayShots: int("actualAwayShots"),
  actualHomeCorners: int("actualHomeCorners"),
  actualAwayCorners: int("actualAwayCorners"),
  actualHomeShotsOnTarget: int("actualHomeShotsOnTarget"),
  actualAwayShotsOnTarget: int("actualAwayShotsOnTarget"),

  // Ranking lines comparison (JSON array of badge results)
  // Each entry: { line, projection, baseline, confidenceIndex, category, actualValue, badge: 'green'|'yellow'|'red', hit: boolean }
  rankingLineResults: json("rankingLineResults").notNull(),

  // Aggregate accuracy metrics
  totalLines: int("totalLines").notNull().default(0),
  greenCount: int("greenCount").notNull().default(0),   // confirmed
  yellowCount: int("yellowCount").notNull().default(0), // partial / close
  redCount: int("redCount").notNull().default(0),       // not confirmed
  hitRate: decimal("hitRate", { precision: 5, scale: 2 }).notNull().default("0"), // 0-100%

  // Goal accuracy
  goalProjectionHit: int("goalProjectionHit").default(0), // 1 if exact score, 0 otherwise
  goalDiff: int("goalDiff"), // |projected - actual| total goals

  // Notes
  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccuracyRecord = typeof accuracyRecords.$inferSelect;
export type InsertAccuracyRecord = typeof accuracyRecords.$inferInsert;
