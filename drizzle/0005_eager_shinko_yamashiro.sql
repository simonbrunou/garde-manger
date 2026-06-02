PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`added_by` text,
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
	FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_inventory_items`("id", "household_id", "added_by", "kind", "barcode", "food_id", "custom_name", "quantity", "location", "added_at", "use_by_date", "best_by_date", "is_estimate", "status", "closed_at", "notes") SELECT "id", "household_id", "added_by", "kind", "barcode", "food_id", "custom_name", "quantity", "location", "added_at", "use_by_date", "best_by_date", "is_estimate", "status", "closed_at", "notes" FROM `inventory_items`;--> statement-breakpoint
DROP TABLE `inventory_items`;--> statement-breakpoint
ALTER TABLE `__new_inventory_items` RENAME TO `inventory_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `inv_household_status_eff` ON `inventory_items` (`household_id`,`status`,`effective_date`);--> statement-breakpoint
CREATE TABLE `__new_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`token_hash` blob NOT NULL,
	`role` text NOT NULL,
	`created_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_invitations`("id", "household_id", "token_hash", "role", "created_by", "expires_at", "used_at", "created_at") SELECT "id", "household_id", "token_hash", "role", "created_by", "expires_at", "used_at", "created_at" FROM `invitations`;--> statement-breakpoint
DROP TABLE `invitations`;--> statement-breakpoint
ALTER TABLE `__new_invitations` RENAME TO `invitations`;