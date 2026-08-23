ALTER TABLE `notification_campaign_deliveries` ADD `linkClickToken` varchar(36);--> statement-breakpoint
ALTER TABLE `notification_campaign_deliveries` ADD `linkClickedAt` timestamp;--> statement-breakpoint
ALTER TABLE `notification_campaign_deliveries` ADD CONSTRAINT `notification_campaign_click_token_unique` UNIQUE(`linkClickToken`);