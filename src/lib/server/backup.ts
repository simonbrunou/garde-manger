import type { Database } from 'bun:sqlite';

/**
 * Take a consistent online backup of a (possibly live, WAL-mode) SQLite database
 * using `VACUUM INTO`. This is the correct way to snapshot a running DB — it
 * reads a transactionally-consistent view and writes a fresh, defragmented file,
 * unlike a raw file copy which can capture a torn `-wal`/`-shm` state.
 *
 * `destPath` is operator-supplied (a scheduled-task argument), never user input;
 * single quotes are still escaped defensively since SQLite has no bound-parameter
 * form for the VACUUM INTO target.
 */
export function backupDatabase(sqlite: Database, destPath: string): void {
	const escaped = destPath.replace(/'/g, "''");
	sqlite.exec(`VACUUM INTO '${escaped}'`);
}
