CREATE TABLE `foods` (
	`id` text PRIMARY KEY NOT NULL,
	`name_fr` text NOT NULL,
	`name_en` text NOT NULL,
	`subtitle_fr` text,
	`subtitle_en` text,
	`keywords_fr` text,
	`keywords_en` text,
	`category` text NOT NULL,
	`default_location` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`added_by` text NOT NULL,
	`kind` text NOT NULL,
	`barcode` text,
	`food_id` text,
	`custom_name` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`location` text NOT NULL,
	`added_at` integer NOT NULL,
	`use_by_date` integer,
	`best_by_date` integer,
	`is_estimate` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`closed_at` integer,
	`notes` text,
	`effective_date` integer GENERATED ALWAYS AS (coalesce(use_by_date, best_by_date)) STORED,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inv_household_status_eff` ON `inventory_items` (`household_id`,`status`,`effective_date`);--> statement-breakpoint
CREATE TABLE `shelf_lives` (
	`id` text PRIMARY KEY NOT NULL,
	`food_id` text NOT NULL,
	`location` text NOT NULL,
	`basis` text NOT NULL,
	`min` integer NOT NULL,
	`max` integer NOT NULL,
	`unit` text NOT NULL,
	`not_recommended` integer DEFAULT false NOT NULL,
	`tips_fr` text,
	`tips_en` text,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade
);
