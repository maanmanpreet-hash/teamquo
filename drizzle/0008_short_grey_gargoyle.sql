ALTER TABLE `job_items` MODIFY COLUMN `item_type` enum('cladding','acoustic_panel','floating_cabinet') NOT NULL;--> statement-breakpoint
ALTER TABLE `job_items` ADD `wall_id` int;--> statement-breakpoint
ALTER TABLE `job_items` ADD `cabinet_height_from_floor_mm` int;