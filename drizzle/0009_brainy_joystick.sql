CREATE TABLE `focus_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`sessionIndex` int NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 25,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `focus_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `estimatedPomodoros` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `completedPomodoros` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `focus_sessions_task_idx` ON `focus_sessions` (`taskId`,`completedAt`);--> statement-breakpoint
CREATE INDEX `focus_sessions_email_idx` ON `focus_sessions` (`email`,`completedAt`);