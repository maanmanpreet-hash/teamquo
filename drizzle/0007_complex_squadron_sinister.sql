CREATE TABLE `walls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`job_id` int NOT NULL,
	`wall_type` enum('regular','garage','custom') NOT NULL DEFAULT 'regular',
	`wall_name` varchar(255),
	`wall_width_mm` int,
	`wall_height_mm` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `walls_id` PRIMARY KEY(`id`)
);
