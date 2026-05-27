CREATE TABLE `cladding_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`design` varchar(255) NOT NULL,
	`width_mm` int NOT NULL,
	`height_mm` int NOT NULL,
	`price_per_unit` int NOT NULL,
	`description` text,
	`is_active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cladding_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`item_type` enum('cladding','cabinet') NOT NULL,
	`cladding_variant_id` int,
	`wall_width_mm` int,
	`wall_height_mm` int,
	`cabinet_width_mm` int,
	`cabinet_height_mm` int,
	`cabinet_depth_mm` int,
	`quantity_required` int,
	`unit_price` int,
	`total_price` int,
	`manual_price_override` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`client_name` varchar(255) NOT NULL,
	`client_email` varchar(320),
	`client_phone` varchar(20),
	`client_address` text,
	`status` enum('quoted','booked','commenced','completed','cancelled') NOT NULL DEFAULT 'quoted',
	`total_estimate` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
