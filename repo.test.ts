/**
 * Runs the REAL SQL (schema + repository) against Node's built-in SQLite through a tiny adapter
 * that mimics expo-sqlite's async API. This verifies queries, constraints, cascade deletes, etc.
 */
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../src/db/schema';
import * as repo from '../src/db/repo';

function makeDb(): repo.Queryable {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA_SQL);
  return {
    async runAsync(sql, params) {
      const r = db.prepare(sql).run(...(params as any[]));
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async getAllAsync<T>(sql: string, params: repo.BindValue[]) {
      return db.prepare(sql).all(...(params as any[])) as T[];
    },
    async getFirstAsync<T>(sql: string, params: repo.BindValue[]) {
      return (db.prepare(sql).get(...(params as any[])) as T | undefined) ?? null;
    },
  };
}

const walk = (o: Partial<repo.NewWalk> = {}): repo.NewWalk => ({
  title: 'Law Hill loop', notes: 'Windy', startedAt: 1_000, durationS: 1800, distanceM: 2500,
  route: [{ latitude: 56.46, longitude: -2.97, timestamp: 1 }], photoUri: null, weather: null, ...o,
});

let db: repo.Queryable;
let uid: number;
beforeEach(async () => {
  db = makeDb();
  uid = (await repo.createUser(db, 'alice', 'Alice', 'salt', 'hash')).id;
});

describe('users', () => {
  it('creates, fetches and reads credentials', async () => {
    expect((await repo.getUserById(db, uid))?.displayName).toBe('Alice');
    const c = await repo.getCredentials(db, 'alice');
    expect(c?.passwordHash).toBe('hash');
    expect(await repo.getCredentials(db, 'nobody')).toBeNull();
  });
  it('enforces unique usernames', async () => {
    await expect(repo.createUser(db, 'alice', 'Alice2', 's', 'h')).rejects.toThrow();
  });
  it('tracks failed attempts and lockout, then clears them', async () => {
    await repo.recordFailedAttempt(db, uid, null, false);
    await repo.recordFailedAttempt(db, uid, null, false);
    expect((await repo.getCredentials(db, 'alice'))?.failedAttempts).toBe(2);
    await repo.recordFailedAttempt(db, uid, 99_999, true);
    const c = await repo.getCredentials(db, 'alice');
    expect(c?.failedAttempts).toBe(0);
    expect(c?.lockedUntil).toBe(99_999);
    await repo.clearFailedAttempts(db, uid);
    expect((await repo.getCredentials(db, 'alice'))?.lockedUntil).toBeNull();
  });
  it('is safe against SQL injection in parameters', async () => {
    expect(await repo.getCredentials(db, "alice' OR '1'='1")).toBeNull();
  });
});

describe('walks CRUD', () => {
  it('adds and reads back a walk including route + weather JSON', async () => {
    const weather = { temperatureC: 9, windKmh: 12, code: 3, description: 'Overcast', fetchedAt: 1 };
    const id = await repo.addWalk(db, uid, walk({ weather }));
    const w = await repo.getWalk(db, uid, id);
    expect(w?.title).toBe('Law Hill loop');
    expect(w?.route).toHaveLength(1);
    expect(w?.weather?.description).toBe('Overcast');
  });
  it('lists newest first and omits route data from summaries', async () => {
    await repo.addWalk(db, uid, walk({ title: 'old', startedAt: 1 }));
    await repo.addWalk(db, uid, walk({ title: 'new', startedAt: 2 }));
    const list = await repo.listWalks(db, uid);
    expect(list.map((w) => w.title)).toEqual(['new', 'old']);
    expect((list[0] as any).route).toBeUndefined();
  });
  it('searches title and notes, and escapes LIKE wildcards', async () => {
    await repo.addWalk(db, uid, walk({ title: 'Riverside', notes: 'ducks' }));
    await repo.addWalk(db, uid, walk({ title: '100% hill', notes: '' }));
    expect((await repo.listWalks(db, uid, 'duck')).map((w) => w.title)).toEqual(['Riverside']);
    expect((await repo.listWalks(db, uid, '%')).map((w) => w.title)).toEqual(['100% hill']);
    expect(await repo.listWalks(db, uid, 'zzz')).toEqual([]);
  });
  it('updates title/notes', async () => {
    const id = await repo.addWalk(db, uid, walk());
    expect(await repo.updateWalk(db, uid, id, 'Renamed', 'n2')).toBe(true);
    expect((await repo.getWalk(db, uid, id))?.title).toBe('Renamed');
  });
  it('deletes a walk and returns its photo uri for cleanup', async () => {
    const id = await repo.addWalk(db, uid, walk({ photoUri: 'file:///p.jpg' }));
    expect(await repo.deleteWalk(db, uid, id)).toBe('file:///p.jpg');
    expect(await repo.getWalk(db, uid, id)).toBeNull();
    expect(await repo.deleteWalk(db, uid, id)).toBeNull();
  });
  it('tolerates corrupt route JSON', async () => {
    const id = await repo.addWalk(db, uid, walk());
    await db.runAsync("UPDATE walks SET route_json = '{oops' WHERE id = ?", [id]);
    expect((await repo.getWalk(db, uid, id))?.route).toEqual([]);
  });
});

describe('data isolation between users', () => {
  it('one user cannot read, edit or delete another user’s walks', async () => {
    const bob = (await repo.createUser(db, 'bob', 'Bob', 's', 'h')).id;
    const id = await repo.addWalk(db, uid, walk());
    expect(await repo.getWalk(db, bob, id)).toBeNull();
    expect(await repo.updateWalk(db, bob, id, 'hacked', '')).toBe(false);
    expect(await repo.deleteWalk(db, bob, id)).toBeNull();
    expect(await repo.listWalks(db, bob)).toEqual([]);
    expect(await repo.getWalk(db, uid, id)).not.toBeNull();
  });
});

describe('stats, export, account deletion', () => {
  it('computes totals and since-date distance', async () => {
    await repo.addWalk(db, uid, walk({ distanceM: 1000, durationS: 600, startedAt: 10 }));
    await repo.addWalk(db, uid, walk({ distanceM: 3000, durationS: 1200, startedAt: 20 }));
    expect(await repo.getTotals(db, uid)).toEqual({ walks: 2, distanceM: 4000, durationS: 1800, longestM: 3000 });
    expect(await repo.distanceSince(db, uid, 15)).toBe(3000);
    expect(await repo.getTotals(db, 9999)).toEqual({ walks: 0, distanceM: 0, durationS: 0, longestM: 0 });
  });
  it('exports user data as JSON without password material', async () => {
    await repo.addWalk(db, uid, walk());
    const json = await repo.exportUserData(db, uid);
    const parsed = JSON.parse(json);
    expect(parsed.walks).toHaveLength(1);
    expect(json).not.toMatch(/hash|salt/i);
  });
  it('deleting a user cascades to walks and returns photo URIs', async () => {
    await repo.addWalk(db, uid, walk({ photoUri: 'file:///a.jpg' }));
    await repo.addWalk(db, uid, walk());
    expect(await repo.deleteUser(db, uid)).toEqual(['file:///a.jpg']);
    expect(await repo.getUserById(db, uid)).toBeNull();
    expect((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM walks', []))?.n).toBe(0);
  });
});
