import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	displayName: text('display_name').notNull(),
	locale: text('locale', { enum: ['fr', 'en'] })
		.notNull()
		.default('fr'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
