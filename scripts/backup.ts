#!/usr/bin/env bun
/**
 * Off-box SQLite backup (Coolify Scheduled Task → push the file off-box).
 *
 * Uses `VACUUM INTO` (a consistent online snapshot of the live WAL DB) — NEVER a
 * raw file copy. Opens the source READ-ONLY so it can run alongside the single
 * app writer without contention.
 *
 *   DATABASE_PATH=/app/data/garde-manger.db BACKUP_DIR=/app/data/backups bun run db:backup
 */
import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { backupDatabase } from '../src/lib/server/backup';

const dbPath = process.env.DATABASE_PATH ?? './data/garde-manger.db';
const backupDir = process.env.BACKUP_DIR ?? './data/backups';

mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = join(backupDir, `garde-manger-${stamp}.db`);

const sqlite = new Database(dbPath, { readonly: true });
try {
	backupDatabase(sqlite, dest);
	console.log(`Backup written to ${dest}`);
} finally {
	sqlite.close();
}
