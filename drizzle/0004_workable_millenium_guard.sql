CREATE TABLE `feature_usage_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`manualEmail` varchar(320),
	`feature` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feature_usage_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`manualEmail` varchar(320),
	`userName` varchar(160) NOT NULL,
	`type` enum('suggestion','question') NOT NULL,
	`message` text NOT NULL,
	`status` enum('new','read','resolved') NOT NULL DEFAULT 'new',
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`manualEmail` varchar(320) NOT NULL,
	`userName` varchar(160) NOT NULL,
	`plan` enum('pro','lifetime') NOT NULL,
	`amountEgp` int NOT NULL,
	`paymentMethod` enum('instapay','vodafone_cash') NOT NULL,
	`senderPhone` varchar(32) NOT NULL,
	`receiptKey` varchar(512) NOT NULL,
	`receiptUrl` varchar(1024) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedByUserId` int,
	`reviewNote` varchar(500),
	`reviewedAt` timestamp,
	`activatedAt` timestamp,
	`entitlementExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(120) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`type` enum('support','faq') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `feature_usage_events_feature_idx` ON `feature_usage_events` (`feature`,`createdAt`);--> statement-breakpoint
CREATE INDEX `feedback_submissions_status_idx` ON `feedback_submissions` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `subscription_requests_status_idx` ON `subscription_requests` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `subscription_requests_user_idx` ON `subscription_requests` (`manualEmail`,`status`);