CREATE TABLE `habits` (
	`id` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`title` varchar(160) NOT NULL,
	`detail` text,
	`frequency` enum('daily','weekly','monthly','yearly') NOT NULL DEFAULT 'daily',
	`reminderTimes` text NOT NULL,
	`streak` int NOT NULL DEFAULT 0,
	`ifThenPlan` text,
	`isMicroGoal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `habits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`title` varchar(160) NOT NULL,
	`detail` text,
	`energy` enum('high','medium','low') NOT NULL DEFAULT 'medium',
	`priority` enum('high','medium') NOT NULL DEFAULT 'medium',
	`done` boolean NOT NULL DEFAULT false,
	`reschedules` int NOT NULL DEFAULT 0,
	`scheduledAt` timestamp,
	`ifThenPlan` text,
	`energyImpact` enum('recharge','balanced','drain'),
	`isMicroGoal` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `habits_email_updated_idx` ON `habits` (`email`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `tasks_email_schedule_idx` ON `tasks` (`email`,`scheduledAt`);