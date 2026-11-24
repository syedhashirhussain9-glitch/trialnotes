import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens the database once and reuses it (avoids repeated open cost / lock contention). */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('trailnotes.db');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync(SCHEMA_SQL);
      return db;
    })();
    dbPromise.catch(() => {
      dbPromise = null; // allow retry after a failed open
    });
  }
  return dbPromise;
}
