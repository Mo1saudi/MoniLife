CREATE TABLE `manual_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`birthDate` date NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`secondaryContact` varchar(255),
	`pinSalt` varchar(64) NOT NULL,
	`pinHash` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manual_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `manual_profiles_email_unique` UNIQUE(`email`)
);
