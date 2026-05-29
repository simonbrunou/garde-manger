CREATE TABLE `products` (
	`barcode` text PRIMARY KEY NOT NULL,
	`name` text,
	`brand` text,
	`image_path` text,
	`quantity` text,
	`categories` text,
	`status` text NOT NULL,
	`fetched_at` integer NOT NULL
);
