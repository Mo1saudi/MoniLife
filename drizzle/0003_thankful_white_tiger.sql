CREATE TABLE `notification_campaign_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`deviceId` int NOT NULL,
	`expoTicketId` varchar(80),
	`status` enum('queued','accepted','failed','invalid_token') NOT NULL DEFAULT 'queued',
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_campaign_deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_campaign_delivery_unique` UNIQUE(`campaignId`,`deviceId`)
);
--> statement-breakpoint
CREATE TABLE `notification_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` varchar(500) NOT NULL,
	`category` enum('announcement','promotion','usage_tip','rating_reminder','habit_tip','task_tip') NOT NULL,
	`audience` enum('all_opted_in','manual_users','oauth_users') NOT NULL DEFAULT 'all_opted_in',
	`status` enum('draft','scheduled','sending','sent','failed','cancelled') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`scheduleCronTaskUid` varchar(65),
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_campaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_campaigns_task_uid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE TABLE `notification_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`manualEmail` varchar(320),
	`expoPushToken` varchar(255) NOT NULL,
	`platform` varchar(16) NOT NULL,
	`optedIn` boolean NOT NULL DEFAULT true,
	`active` boolean NOT NULL DEFAULT true,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_devices_token_unique` UNIQUE(`expoPushToken`)
);
--> statement-breakpoint
CREATE INDEX `notification_campaign_deliveries_campaign_idx` ON `notification_campaign_deliveries` (`campaignId`,`status`);--> statement-breakpoint
CREATE INDEX `notification_campaigns_status_idx` ON `notification_campaigns` (`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `notification_devices_active_idx` ON `notification_devices` (`active`,`optedIn`);