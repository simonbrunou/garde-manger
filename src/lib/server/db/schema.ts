import { sqliteTable, text, integer, blob, unique } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	locale: text('locale', { enum: ['fr', 'en'] }).notNull().default('fr'),
	passwordHash: text('password_hash'), // nullable: passkey-only users possible later
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	secretHash: blob('secret_hash', { mode: 'buffer' }).notNull(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const households = sqliteTable('households', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	warnDays: integer('warn_days').notNull().default(3),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const memberships = sqliteTable('memberships', {
	id: text('id').primaryKey(),
	householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	role: text('role', { enum: ['admin', 'member'] }).notNull(),
	joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull()
}, (t) => [unique().on(t.householdId, t.userId)]);

export const invitations = sqliteTable('invitations', {
	id: text('id').primaryKey(),
	householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
	tokenHash: blob('token_hash', { mode: 'buffer' }).notNull(),
	role: text('role', { enum: ['admin', 'member'] }).notNull(),
	createdBy: text('created_by').notNull().references(() => users.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	usedAt: integer('used_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const credentials = sqliteTable('credentials', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
	credentialId: text('credential_id').notNull().unique(),
	publicKey: blob('public_key', { mode: 'buffer' }).notNull(),
	counter: integer('counter').notNull().default(0),
	transports: text('transports'),
	backedUp: integer('backed_up', { mode: 'boolean' }).notNull().default(false),
	deviceLabel: text('device_label'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
});
