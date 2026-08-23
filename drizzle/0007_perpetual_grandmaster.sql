CREATE TABLE `user_badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`badge` varchar(120) NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_badges_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_badges_email_badge_unique` UNIQUE(`email`,`badge`)
);
--> statement-breakpoint
CREATE TABLE `user_gamification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`xpPoints` int NOT NULL DEFAULT 0,
	`level` int NOT NULL DEFAULT 1,
	`completedTasks` int NOT NULL DEFAULT 0,
	`habitDays` int NOT NULL DEFAULT 0,
	`financeDays` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_gamification_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_gamification_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `weekly_analytics_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`persona` enum('gentle','strict') NOT NULL DEFAULT 'gentle',
	`payload` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekly_analytics_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_analytics_snapshot_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `weekly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`weekStart` timestamp NOT NULL,
	`weekEnd` timestamp NOT NULL,
	`persona` enum('gentle','strict') NOT NULL,
	`score` int NOT NULL,
	`summary` text NOT NULL,
	`metrics` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `weekly_reports_email_created_idx` ON `weekly_reports` (`email`,`createdAt`);