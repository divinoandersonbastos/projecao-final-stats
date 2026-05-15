CREATE TABLE `finalMatchStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`fixtureId` int,
	`homeGoals` int NOT NULL,
	`awayGoals` int NOT NULL,
	`homeShots` int,
	`awayShots` int,
	`homeShotsOnTarget` int,
	`awayShotsOnTarget` int,
	`homeCorners` int,
	`awayCorners` int,
	`homeDangerousAttacks` int,
	`awayDangerousAttacks` int,
	`homePossession` decimal(5,2),
	`awayPossession` decimal(5,2),
	`homeXg` decimal(5,2),
	`awayXg` decimal(5,2),
	`dataSource` enum('api-football','manual') NOT NULL DEFAULT 'manual',
	`rawApiData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `finalMatchStats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modelValidationResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`finalMatchStatsId` int NOT NULL,
	`metricsValidation` json NOT NULL,
	`overallScore` decimal(5,2) NOT NULL,
	`overallClassification` enum('excellent','good','medium','divergent') NOT NULL,
	`avgAbsoluteError` decimal(10,4) NOT NULL,
	`avgPercentError` decimal(10,4) NOT NULL,
	`totalMetrics` int NOT NULL,
	`excellentCount` int NOT NULL,
	`goodCount` int NOT NULL,
	`mediumCount` int NOT NULL,
	`divergentCount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `modelValidationResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analyses` ADD `fixtureId` int;--> statement-breakpoint
ALTER TABLE `analyses` ADD `validationStatus` enum('pending','finished','validated') DEFAULT 'pending' NOT NULL;