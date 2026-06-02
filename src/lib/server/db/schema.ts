import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, blob, unique, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	locale: text('locale', { enum: ['fr', 'en'] })
		.notNull()
		.default('fr'),
	passwordHash: text('password_hash'), // nullable: passkey-only users possible later
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		secretHash: blob('secret_hash', { mode: 'buffer' }).notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
	},
	(t) => [index('sessions_user_id').on(t.userId)]
);

export const households = sqliteTable('households', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	warnDays: integer('warn_days').notNull().default(3),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const memberships = sqliteTable(
	'memberships',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['admin', 'member'] }).notNull(),
		joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull()
	},
	(t) => [
		unique().on(t.householdId, t.userId),
		// The unique index leads with household_id, so user_id-only lookups (and the
		// cascade on user delete) are not covered by it.
		index('memberships_user_id').on(t.userId)
	]
);

export const invitations = sqliteTable(
	'invitations',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		tokenHash: blob('token_hash', { mode: 'buffer' }).notNull(),
		role: text('role', { enum: ['admin', 'member'] }).notNull(),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		usedAt: integer('used_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(t) => [
		index('invitations_token_hash').on(t.tokenHash), // accept-by-token lookup
		index('invitations_household_id').on(t.householdId), // list pending + cascade
		index('invitations_created_by').on(t.createdBy) // cascade on user delete
	]
);

export const credentials = sqliteTable(
	'credentials',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		credentialId: text('credential_id').notNull().unique(),
		publicKey: blob('public_key', { mode: 'buffer' }).notNull(),
		counter: integer('counter').notNull().default(0),
		transports: text('transports'),
		backedUp: integer('backed_up', { mode: 'boolean' }).notNull().default(false),
		deviceLabel: text('device_label'),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
	},
	(t) => [index('credentials_user_id').on(t.userId)]
);

export const foods = sqliteTable('foods', {
	id: text('id').primaryKey(),
	nameFr: text('name_fr').notNull(),
	nameEn: text('name_en').notNull(),
	subtitleFr: text('subtitle_fr'),
	subtitleEn: text('subtitle_en'),
	keywordsFr: text('keywords_fr'),
	keywordsEn: text('keywords_en'),
	category: text('category').notNull(),
	defaultLocation: text('default_location', { enum: ['pantry', 'fridge', 'freezer'] }).notNull()
});

export const shelfLives = sqliteTable(
	'shelf_lives',
	{
		id: text('id').primaryKey(),
		foodId: text('food_id')
			.notNull()
			.references(() => foods.id, { onDelete: 'cascade' }),
		location: text('location', { enum: ['pantry', 'fridge', 'freezer'] }).notNull(),
		basis: text('basis', { enum: ['purchase', 'opened', 'unspecified'] }).notNull(),
		min: integer('min').notNull(),
		max: integer('max').notNull(),
		unit: text('unit', { enum: ['hours', 'days', 'weeks', 'months', 'years'] }).notNull(),
		notRecommended: integer('not_recommended', { mode: 'boolean' }).notNull().default(false),
		tipsFr: text('tips_fr'),
		tipsEn: text('tips_en')
	},
	(t) => [index('shelf_lives_food_id').on(t.foodId)]
);

export const inventoryItems = sqliteTable(
	'inventory_items',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		// nullable + set-null on delete: keep household inventory if the member who
		// added an item is later deleted (attribution is lost, the item is not).
		addedBy: text('added_by').references(() => users.id, { onDelete: 'set null' }),
		kind: text('kind', { enum: ['packaged', 'fresh'] }).notNull(),
		barcode: text('barcode'), // no FK yet — products table is M3
		foodId: text('food_id').references(() => foods.id),
		customName: text('custom_name'),
		quantity: integer('quantity').notNull().default(1),
		location: text('location', { enum: ['pantry', 'fridge', 'freezer'] }).notNull(),
		addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
		useByDate: integer('use_by_date', { mode: 'timestamp' }),
		bestByDate: integer('best_by_date', { mode: 'timestamp' }),
		isEstimate: integer('is_estimate', { mode: 'boolean' }).notNull().default(false),
		status: text('status', { enum: ['active', 'consumed', 'discarded'] })
			.notNull()
			.default('active'),
		closedAt: integer('closed_at', { mode: 'timestamp' }),
		notes: text('notes'),
		effectiveDate: integer('effective_date', { mode: 'timestamp' }).generatedAlwaysAs(
			sql`coalesce(use_by_date, best_by_date)`,
			{ mode: 'stored' }
		)
	},
	(t) => [
		index('inv_household_status_eff').on(t.householdId, t.status, t.effectiveDate),
		index('inventory_items_food_id').on(t.foodId), // joined to foods on item load
		index('inventory_items_added_by').on(t.addedBy) // set-null cascade on user delete
	]
);

// Open Food Facts cache. DELIBERATELY there is NO foreign key from
// `inventory_items.barcode` to `products.barcode`: the cache is prunable
// independently and inventory history must never be cascade-deleted when a cache
// row is evicted. The relationship is purely logical and joined in app code.
export const products = sqliteTable('products', {
	barcode: text('barcode').primaryKey(), // normalized EAN-13/EAN-8
	name: text('name'), // OFF product_name (nullable)
	brand: text('brand'), // OFF brands (nullable)
	imagePath: text('image_path'), // relative path on the volume, nullable
	quantity: text('quantity'), // OFF quantity string e.g. "500 g"
	categories: text('categories'), // OFF categories_tags joined, nullable
	status: text('status', { enum: ['found', 'not_found'] }).notNull(),
	fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull()
});

// Web Push subscriptions, one row per user-device (endpoint is the device key).
// Pruned on 404/410 from the push service; `last_notified_on` makes the daily
// cron idempotent (safe to call twice/day).
export const pushSubscriptions = sqliteTable(
	'push_subscriptions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		endpoint: text('endpoint').notNull().unique(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		deviceLabel: text('device_label'),
		lastSuccessAt: integer('last_success_at', { mode: 'timestamp' }),
		failureCount: integer('failure_count').notNull().default(0),
		lastNotifiedOn: text('last_notified_on'), // 'YYYY-MM-DD'
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(t) => [index('push_subscriptions_user_id').on(t.userId)]
);
