import { SQLiteDatabase } from 'expo-sqlite';
import { ActivityEntry, NewActivityEntry } from '@/types/activity';

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS activity_entries (
      id TEXT PRIMARY KEY NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      logged_date TEXT NOT NULL,
      logged_time TEXT,
      rating REAL,
      note TEXT,
      image_uri TEXT,
      is_cover INTEGER DEFAULT 0,
      external_id TEXT,
      external_source TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_logged_date ON activity_entries(logged_date);
    CREATE INDEX IF NOT EXISTS idx_entries_category ON activity_entries(category);
  `);
}

interface RawDbRow {
  id: string;
  category: string;
  title: string;
  subtitle: string | null;
  logged_date: string;
  logged_time: string | null;
  rating: number | null;
  note: string | null;
  image_uri: string | null;
  is_cover: number;
  external_id: string | null;
  external_source: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToEntry(row: RawDbRow): ActivityEntry {
  let parsedMetadata: Record<string, any> | undefined;
  if (row.metadata) {
    try {
      parsedMetadata = JSON.parse(row.metadata);
    } catch {
      parsedMetadata = undefined;
    }
  }

  return {
    id: row.id,
    category: row.category as any,
    title: row.title,
    subtitle: row.subtitle || undefined,
    loggedDate: row.logged_date,
    loggedTime: row.logged_time || undefined,
    rating: row.rating !== null ? row.rating : undefined,
    note: row.note || undefined,
    imageUri: row.image_uri || undefined,
    isCover: row.is_cover === 1,
    externalId: row.external_id || undefined,
    externalSource: row.external_source || undefined,
    metadata: parsedMetadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllEntries(db: SQLiteDatabase): Promise<ActivityEntry[]> {
  const rows = await db.getAllAsync<RawDbRow>(
    `SELECT * FROM activity_entries ORDER BY logged_date DESC, created_at DESC`
  );
  return rows.map(mapRowToEntry);
}

export async function getEntriesByDate(db: SQLiteDatabase, dateStr: string): Promise<ActivityEntry[]> {
  const rows = await db.getAllAsync<RawDbRow>(
    `SELECT * FROM activity_entries WHERE logged_date = ? ORDER BY is_cover DESC, created_at DESC`,
    [dateStr]
  );
  return rows.map(mapRowToEntry);
}

export async function getEntriesForMonth(db: SQLiteDatabase, yearMonthStr: string): Promise<ActivityEntry[]> {
  // yearMonthStr e.g. "2026-11"
  const rows = await db.getAllAsync<RawDbRow>(
    `SELECT * FROM activity_entries WHERE logged_date LIKE ? ORDER BY logged_date ASC, is_cover DESC`,
    [`${yearMonthStr}-%`]
  );
  return rows.map(mapRowToEntry);
}

export async function insertEntry(db: SQLiteDatabase, entry: NewActivityEntry): Promise<ActivityEntry> {
  const id = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  const metadataStr = entry.metadata ? JSON.stringify(entry.metadata) : null;
  const isCoverVal = entry.isCover ? 1 : 0;

  // If this entry is cover, reset existing covers for this date
  if (entry.isCover) {
    await db.runAsync(`UPDATE activity_entries SET is_cover = 0 WHERE logged_date = ?`, [entry.loggedDate]);
  }

  await db.runAsync(
    `INSERT INTO activity_entries (
      id, category, title, subtitle, logged_date, logged_time, rating, note, image_uri, is_cover, external_id, external_source, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.category,
      entry.title,
      entry.subtitle || null,
      entry.loggedDate,
      entry.loggedTime || null,
      entry.rating ?? null,
      entry.note || null,
      entry.imageUri || null,
      isCoverVal,
      entry.externalId || null,
      entry.externalSource || null,
      metadataStr,
      now,
      now,
    ]
  );

  return {
    ...entry,
    id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateEntry(db: SQLiteDatabase, id: string, entry: Partial<ActivityEntry>): Promise<void> {
  const existingRows = await db.getAllAsync<RawDbRow>(`SELECT * FROM activity_entries WHERE id = ?`, [id]);
  if (existingRows.length === 0) return;

  const current = mapRowToEntry(existingRows[0]);
  const updated: ActivityEntry = {
    ...current,
    ...entry,
    updatedAt: new Date().toISOString(),
  };

  if (entry.isCover && updated.loggedDate) {
    await db.runAsync(`UPDATE activity_entries SET is_cover = 0 WHERE logged_date = ?`, [updated.loggedDate]);
  }

  const metadataStr = updated.metadata ? JSON.stringify(updated.metadata) : null;

  await db.runAsync(
    `UPDATE activity_entries SET
      category = ?,
      title = ?,
      subtitle = ?,
      logged_date = ?,
      logged_time = ?,
      rating = ?,
      note = ?,
      image_uri = ?,
      is_cover = ?,
      external_id = ?,
      external_source = ?,
      metadata = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      updated.category,
      updated.title,
      updated.subtitle || null,
      updated.loggedDate,
      updated.loggedTime || null,
      updated.rating ?? null,
      updated.note || null,
      updated.imageUri || null,
      updated.isCover ? 1 : 0,
      updated.externalId || null,
      updated.externalSource || null,
      metadataStr,
      updated.updatedAt,
      id,
    ]
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM activity_entries WHERE id = ?`, [id]);
}

export async function setDayCover(db: SQLiteDatabase, loggedDate: string, entryId: string): Promise<void> {
  await db.runAsync(`UPDATE activity_entries SET is_cover = 0 WHERE logged_date = ?`, [loggedDate]);
  await db.runAsync(`UPDATE activity_entries SET is_cover = 1 WHERE id = ?`, [entryId]);
}

export async function searchEntries(
  db: SQLiteDatabase,
  query: string,
  categoryId?: string,
  minRating?: number
): Promise<ActivityEntry[]> {
  let sql = `SELECT * FROM activity_entries WHERE 1=1`;
  const params: any[] = [];

  if (query.trim().length > 0) {
    sql += ` AND (title LIKE ? OR subtitle LIKE ? OR note LIKE ? OR metadata LIKE ?)`;
    const term = `%${query.trim()}%`;
    params.push(term, term, term, term);
  }

  if (categoryId && categoryId !== 'all') {
    sql += ` AND category = ?`;
    params.push(categoryId);
  }

  if (minRating !== undefined && minRating > 0) {
    sql += ` AND rating >= ?`;
    params.push(minRating);
  }

  sql += ` ORDER BY logged_date DESC, created_at DESC`;

  const rows = await db.getAllAsync<RawDbRow>(sql, params);
  return rows.map(mapRowToEntry);
}
