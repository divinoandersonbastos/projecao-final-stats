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
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;
