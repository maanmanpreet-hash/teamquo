CREATE TABLE `operators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stage_transitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`from_stage` enum('quoting','procurement','installation','invoicing'),
	`to_stage` enum('quoting','procurement','installation','invoicing') NOT NULL,
	`transitioned_by` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stage_transitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `operator_name` varchar(255);--> statement-breakpoint
ALTER TABLE `jobs` ADD `stage` enum('quoting','procurement','installation','invoicing') DEFAULT 'quoting' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `stage_status` varchar(100) DEFAULT 'in_progress';