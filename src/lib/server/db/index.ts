import { env } from '$env/dynamic/private';
import { createDb, runMigrations } from './client';

const DATABASE_PATH = env.DATABASE_PATH ?? './data/garde-manger.db';

export const { db, sqlite } = createDb(DATABASE_PATH);
runMigrations(db);

export * from './schema';
