import type { LatLng } from '../lib/geo';
import type { Weather } from '../lib/weather';

export type BindValue = string | number | boolean | null | Uint8Array;

/** Minimal surface of expo-sqlite's SQLiteDatabase that we use (lets tests swap in node:sqlite). */
export interface Queryable {
  runAsync(sql: string, params: BindValue[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params: BindValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: BindValue[]): Promise<T | null>;
}

export interface User {
  id: number;
  username: string;
  displayName: string;
  createdAt: number;
}

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  salt: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: number | null;
  created_at: number;
}

export interface Credentials {
  user: User;
  salt: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: number | null;
}

const toUser = (r: UserRow): User => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
  createdAt: r.created_at,
});

/* ----------------------------- users ----------------------------- */

export async function createUser(
  db: Queryable,
  username: string,
  displayName: string,
  salt: string,
  passwordHash: string,
  now = Date.now(),
): Promise<User> {
  const res = await db.runAsync(
    'INSERT INTO users (username, display_name, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    [username, displayName, salt, passwordHash, now],
  );
  return { id: res.lastInsertRowId, username, displayName, createdAt: now };
}

export async function getUserById(db: Queryable, id: number): Promise<User | null> {
  const row = await db.getFirstAsync<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  return row ? toUser(row) : null;
}

export async function getCredentials(db: Queryable, username: string): Promise<Credentials | null> {
  const row = await db.getFirstAsync<UserRow>('SELECT * FROM users WHERE username = ?', [username]);
  if (!row) return null;
  return {
    user: toUser(row),
    salt: row.salt,
    passwordHash: row.password_hash,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
  };
}

export async function recordFailedAttempt(
  db: Queryable,
  userId: number,
  lockedUntil: number | null,
  resetCounter: boolean,
): Promise<void> {
  if (resetCounter) {
    await db.runAsync('UPDATE users SET failed_attempts = 0, locked_until = ? WHERE id = ?', [lockedUntil, userId]);
  } else {
    await db.runAsync('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?', [userId]);
  }
}

export async function clearFailedAttempts(db: Queryable, userId: number): Promise<void> {
  await db.runAsync('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?', [userId]);
}

/** Deletes the user; walks are removed by ON DELETE CASCADE. Returns photo URIs to clean up. */
export async function deleteUser(db: Queryable, userId: number): Promise<string[]> {
  const photos = await db.getAllAsync<{ photo_uri: string }>(
    'SELECT photo_uri FROM walks WHERE user_id = ? AND photo_uri IS NOT NULL',
    [userId],
  );
  await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
  return photos.map((p) => p.photo_uri);
}

/* ----------------------------- walks ----------------------------- */

export interface WalkSummary {
  id: number;
  title: string;
  notes: string;
  startedAt: number;
  durationS: number;
  distanceM: number;
  photoUri: string | null;
}

export interface Walk extends WalkSummary {
  route: LatLng[];
  weather: Weather | null;
}

export interface NewWalk {
  title: string;
  notes: string;
  startedAt: number;
  durationS: number;
  distanceM: number;
  route: LatLng[];
  photoUri: string | null;
  weather: Weather | null;
}

interface SummaryRow {
  id: number;
  title: string;
  notes: string;
  started_at: number;
  duration_s: number;
  distance_m: number;
  photo_uri: string | null;
}

const toSummary = (r: SummaryRow): WalkSummary => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  startedAt: r.started_at,
  durationS: r.duration_s,
  distanceM: r.distance_m,
  photoUri: r.photo_uri,
});

export async function addWalk(db: Queryable, userId: number, w: NewWalk): Promise<number> {
  const res = await db.runAsync(
    `INSERT INTO walks (user_id, title, notes, started_at, duration_s, distance_m, route_json, photo_uri, weather_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      w.title,
      w.notes,
      w.startedAt,
      Math.round(w.durationS),
      w.distanceM,
      JSON.stringify(w.route),
      w.photoUri,
      w.weather ? JSON.stringify(w.weather) : null,
    ],
  );
  return res.lastInsertRowId;
}

/** List view deliberately omits route_json (can be large) to keep the list fast. */
export async function listWalks(db: Queryable, userId: number, search = ''): Promise<WalkSummary[]> {
  const term = search.trim();
  const rows = term
    ? await db.getAllAsync<SummaryRow>(
        `SELECT id, title, notes, started_at, duration_s, distance_m, photo_uri FROM walks
         WHERE user_id = ? AND (title LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\')
         ORDER BY started_at DESC`,
        [userId, `%${escapeLike(term)}%`, `%${escapeLike(term)}%`],
      )
    : await db.getAllAsync<SummaryRow>(
        `SELECT id, title, notes, started_at, duration_s, distance_m, photo_uri FROM walks
         WHERE user_id = ? ORDER BY started_at DESC`,
        [userId],
      );
  return rows.map(toSummary);
}

export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function getWalk(db: Queryable, userId: number, walkId: number): Promise<Walk | null> {
  const row = await db.getFirstAsync<SummaryRow & { route_json: string; weather_json: string | null }>(
    'SELECT * FROM walks WHERE id = ? AND user_id = ?',
    [walkId, userId],
  );
  if (!row) return null;
  return {
    ...toSummary(row),
    route: safeParse<LatLng[]>(row.route_json, []),
    weather: safeParse<Weather | null>(row.weather_json, null),
  };
}

export async function updateWalk(
  db: Queryable,
  userId: number,
  walkId: number,
  title: string,
  notes: string,
): Promise<boolean> {
  const res = await db.runAsync('UPDATE walks SET title = ?, notes = ? WHERE id = ? AND user_id = ?', [
    title,
    notes,
    walkId,
    userId,
  ]);
  return res.changes > 0;
}

export async function deleteWalk(db: Queryable, userId: number, walkId: number): Promise<string | null> {
  const row = await db.getFirstAsync<{ photo_uri: string | null }>(
    'SELECT photo_uri FROM walks WHERE id = ? AND user_id = ?',
    [walkId, userId],
  );
  if (!row) return null;
  await db.runAsync('DELETE FROM walks WHERE id = ? AND user_id = ?', [walkId, userId]);
  return row.photo_uri;
}

export interface Totals {
  walks: number;
  distanceM: number;
  durationS: number;
  longestM: number;
}

export async function getTotals(db: Queryable, userId: number): Promise<Totals> {
  const r = await db.getFirstAsync<{ n: number; d: number | null; t: number | null; m: number | null }>(
    'SELECT COUNT(*) AS n, SUM(distance_m) AS d, SUM(duration_s) AS t, MAX(distance_m) AS m FROM walks WHERE user_id = ?',
    [userId],
  );
  return { walks: r?.n ?? 0, distanceM: r?.d ?? 0, durationS: r?.t ?? 0, longestM: r?.m ?? 0 };
}

/** Distance walked since `sinceMs` (used for the "this week" card). */
export async function distanceSince(db: Queryable, userId: number, sinceMs: number): Promise<number> {
  const r = await db.getFirstAsync<{ d: number | null }>(
    'SELECT SUM(distance_m) AS d FROM walks WHERE user_id = ? AND started_at >= ?',
    [userId, sinceMs],
  );
  return r?.d ?? 0;
}

export async function exportUserData(db: Queryable, userId: number): Promise<string> {
  const user = await getUserById(db, userId);
  const summaries = await listWalks(db, userId);
  const walks: Walk[] = [];
  for (const s of summaries) {
    const w = await getWalk(db, userId, s.id);
    if (w) walks.push(w);
  }
  return JSON.stringify({ exportedAt: new Date().toISOString(), user, walks }, null, 2);
}

function safeParse<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
