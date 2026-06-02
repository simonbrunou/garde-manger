CREATE INDEX `credentials_user_id` ON `credentials` (`user_id`);--> statement-breakpoint
CREATE INDEX `inventory_items_food_id` ON `inventory_items` (`food_id`);--> statement-breakpoint
CREATE INDEX `inventory_items_added_by` ON `inventory_items` (`added_by`);--> statement-breakpoint
CREATE INDEX `invitations_token_hash` ON `invitations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `invitations_household_id` ON `invitations` (`household_id`);--> statement-breakpoint
CREATE INDEX `invitations_created_by` ON `invitations` (`created_by`);--> statement-breakpoint
CREATE INDEX `memberships_user_id` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_id` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `shelf_lives_food_id` ON `shelf_lives` (`food_id`);