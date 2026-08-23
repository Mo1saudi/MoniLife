CREATE TABLE `in_app_advertisements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` varchar(500) NOT NULL,
	`ctaLabel` varchar(80) NOT NULL,
	`placement` enum('home','tasks','habits','finance') NOT NULL,
	`destinationUrl` varchar(1024),
	`active` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `in_app_advertisements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `in_app_advertisements_active_idx` ON `in_app_advertisements` (`active`,`placement`,`startsAt`);