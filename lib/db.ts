import { createClient, Client } from '@libsql/client';

let _db: Client | null = null;

function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

export async function initDb() {
  await getDb().executeMultiple(`
    CREATE TABLE IF NOT EXISTS notices (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      provider   TEXT NOT NULL,
      article_no TEXT NOT NULL,
      title      TEXT NOT NULL,
      url        TEXT NOT NULL,
      date       TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(provider, article_no)
    );
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint   TEXT NOT NULL UNIQUE,
      p256dh     TEXT NOT NULL,
      auth       TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export type Notice = {
  id: number;
  provider: string;
  article_no: string;
  title: string;
  url: string;
  date: string | null;
  created_at: string;
};

export type PushSubscription = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export async function getNotices(
  category: string,
  page: number,
  limit: number,
  query?: string
): Promise<{ notices: Notice[]; total: number }> {
  const db = getDb();
  const offset = (page - 1) * limit;

  // Build WHERE clause from category + query
  const conditions: string[] = [];
  const args: (string | null)[] = [];

  if (category !== 'all') {
    conditions.push('provider = ?');
    args.push(category);
  }
  if (query) {
    conditions.push('title LIKE ?');
    args.push(`%${query}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rowsResult, countResult] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM notices ${whereClause} ORDER BY CASE WHEN date IS NULL THEN 1 ELSE 0 END, date DESC LIMIT ${limit} OFFSET ${offset}`,
      args,
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM notices ${whereClause}`,
      args,
    }),
  ]);

  const notices = rowsResult.rows.map((r) => ({
    id: r.id as number,
    provider: r.provider as string,
    article_no: r.article_no as string,
    title: r.title as string,
    url: r.url as string,
    date: r.date as string | null,
    created_at: r.created_at as string,
  }));

  const total = (countResult.rows[0].count as number) ?? 0;
  return { notices, total };
}

export async function insertNotice(
  provider: string,
  article_no: string,
  title: string,
  url: string,
  date: string | null
): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT OR IGNORE INTO notices (provider, article_no, title, url, date) VALUES (?, ?, ?, ?, ?)`,
    args: [provider, article_no, title, url, date ?? null],
  });
  // Backfill date for existing rows that were inserted before date extraction was implemented
  if ((result.rowsAffected ?? 0) === 0 && date) {
    await db.execute({
      sql: `UPDATE notices SET date = ? WHERE provider = ? AND article_no = ? AND date IS NULL`,
      args: [date, provider, article_no],
    });
  }
  return (result.rowsAffected ?? 0) > 0;
}

export async function getAllSubscriptions(): Promise<PushSubscription[]> {
  const result = await getDb().execute(`SELECT * FROM push_subscriptions`);
  return result.rows.map((r) => ({
    id: r.id as number,
    endpoint: r.endpoint as string,
    p256dh: r.p256dh as string,
    auth: r.auth as string,
    created_at: r.created_at as string,
  }));
}

export async function upsertSubscription(
  endpoint: string,
  p256dh: string,
  auth: string
): Promise<void> {
  await getDb().execute({
    sql: `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
          VALUES (?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [endpoint, p256dh, auth],
  });
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await getDb().execute({
    sql: `DELETE FROM push_subscriptions WHERE endpoint = ?`,
    args: [endpoint],
  });
}
