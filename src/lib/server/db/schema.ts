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

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	secretHash: blob('secret_hash', { mode: 'buffer' }).notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

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
	(t) => [unique().on(t.householdId, t.userId)]
);

export const invitations = sqliteTable('invitations', {
	id: text('id').primaryKey(),
	householdId: text('household_id')
		.notNull()
		.references(() => households.id, { onDelete: 'cascade' }),
	tokenHash: blob('token_hash', { mode: 'buffer' }).notNull(),
	role: text('role', { enum: ['admin', 'member'] }).notNull(),
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	usedAt: integer('used_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const credentials = sqliteTable('credentials', {
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
});

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

export const shelfLives = sqliteTable('shelf_lives', {
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
});

export const inventoryItems = sqliteTable(
	'inventory_items',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id, { onDelete: 'cascade' }),
		addedBy: text('added_by')
			.notNull()
			.references(() => users.id),
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
	(t) => [index('inv_household_status_eff').on(t.householdId, t.status, t.effectiveDate)]
);
