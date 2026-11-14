import { SQLiteDatabase } from 'expo-sqlite';
import { ActivityEntry, NewActivityEntry } from '@/types/activity';

/**
 * Adds a column to a table only when it does not already exist.
 * SQLite has no `ADD COLUMN IF NOT EXISTS`, so we inspect `PRAGMA table_info`.
 */
async function ensureColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

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

    -- Tombstones for entries deleted locally but not yet deleted in the cloud.
    -- Without these, a pull would resurrect the row right after a local delete.
    CREATE TABLE IF NOT EXISTS sync_deletions (
      remote_id TEXT PRIMARY KEY NOT NULL,
      deleted_at TEXT NOT NULL
    );
  `);

  // Stage B: cloud sync bookkeeping columns (added in-place for existing installs).
  await ensureColumn(db, 'activity_entries', 'remote_id', 'TEXT');
  await ensureColumn(db, 'activity_entries', 'user_id', 'TEXT');
  await ensureColumn(db, 'activity_entries', 'synced_at', 'TEXT');
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
  remote_id: string | null;
  user_id: string | null;
  synced_at: string | null;
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
    remoteId: row.remote_id || undefined,
    userId: row.user_id || undefined,
    syncedAt: row.synced_at || undefined,
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
  // Remember the cloud counterpart so sync can delete it instead of pulling it back.
  const rows = await db.getAllAsync<{ remote_id: string | null }>(
    `SELECT remote_id FROM activity_entries WHERE id = ?`,
    [id]
  );
  const remoteId = rows[0]?.remote_id;

  await db.runAsync(`DELETE FROM activity_entries WHERE id = ?`, [id]);

  if (remoteId) {
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_deletions (remote_id, deleted_at) VALUES (?, ?)`,
      [remoteId, new Date().toISOString()]
    );
  }
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

// ---------------------------------------------------------------------------
// Stage B: cloud sync helpers
// ---------------------------------------------------------------------------

/** Entries that are new or edited since their last successful sync. */
export async function getEntriesForSync(db: SQLiteDatabase): Promise<ActivityEntry[]> {
  const rows = await db.getAllAsync<RawDbRow>(
    `SELECT * FROM activity_entries
     WHERE synced_at IS NULL OR updated_at > synced_at
     ORDER BY updated_at ASC`
  );
  return rows.map(mapRowToEntry);
}

/** Marks a local entry as synced to its remote counterpart. */
export async function markEntrySynced(
  db: SQLiteDatabase,
  localId: string,
  remoteId: string,
  userId: string,
  syncedAt: string
): Promise<void> {
  // Align updated_at with the server timestamp. Otherwise a phone clock that
  // runs ahead of the server would make every row look "dirty" forever.
  await db.runAsync(
    `UPDATE activity_entries
     SET remote_id = ?, user_id = ?, synced_at = ?, updated_at = ?
     WHERE id = ?`,
    [remoteId, userId, syncedAt, syncedAt, localId]
  );
}

// ---------------------------------------------------------------------------
// Stage B: delete tombstones
// ---------------------------------------------------------------------------

/** Cloud ids that still need a delete pushed. */
export async function getPendingDeletions(
  db: SQLiteDatabase
): Promise<{ remoteId: string; deletedAt: string }[]> {
  const rows = await db.getAllAsync<{ remote_id: string; deleted_at: string }>(
    `SELECT remote_id, deleted_at FROM sync_deletions ORDER BY deleted_at ASC`
  );
  return rows.map((r) => ({ remoteId: r.remote_id, deletedAt: r.deleted_at }));
}

/** Drops a tombstone once the cloud row is gone. */
export async function clearPendingDeletion(
  db: SQLiteDatabase,
  remoteId: string
): Promise<void> {
  await db.runAsync(`DELETE FROM sync_deletions WHERE remote_id = ?`, [remoteId]);
}

export interface RemoteEntryInput {
  remoteId: string;
  userId: string;
  category: string;
  title: string;
  subtitle?: string;
  loggedDate: string;
  loggedTime?: string;
  rating?: number;
  note?: string;
  imageUri?: string;
  isCover?: boolean;
  externalId?: string;
  externalSource?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Inserts or updates a local row from a remote entry pulled during sync.
 * Local rows that were edited after the remote copy are left untouched so the
 * next push wins (simple last-write-wins reconciliation).
 */
export async function upsertEntryFromRemote(
  db: SQLiteDatabase,
  remote: RemoteEntryInput
): Promise<void> {
  const metadataStr = remote.metadata ? JSON.stringify(remote.metadata) : null;
  const existing = await db.getAllAsync<RawDbRow>(
    `SELECT * FROM activity_entries WHERE remote_id = ?`,
    [remote.remoteId]
  );

  if (existing.length > 0) {
    const local = existing[0];
    // Local has unsynced edits that are newer than the remote copy -> keep local.
    if (local.synced_at && local.updated_at > remote.updatedAt) {
      return;
    }

    await db.runAsync(
      `UPDATE activity_entries SET
        category = ?, title = ?, subtitle = ?, logged_date = ?, logged_time = ?,
        rating = ?, note = ?, image_uri = ?, is_cover = ?, external_id = ?,
        external_source = ?, metadata = ?, user_id = ?, synced_at = ?, updated_at = ?
      WHERE remote_id = ?`,
      [
        remote.category,
        remote.title,
        remote.subtitle || null,
        remote.loggedDate,
        remote.loggedTime || null,
        remote.rating ?? null,
        remote.note || null,
        remote.imageUri || null,
        remote.isCover ? 1 : 0,
        remote.externalId || null,
        remote.externalSource || null,
        metadataStr,
        remote.userId,
        remote.updatedAt,
        remote.updatedAt,
        remote.remoteId,
      ]
    );
    return;
  }

  const localId = `entry_${remote.remoteId}`;
  await db.runAsync(
    `INSERT INTO activity_entries (
      id, category, title, subtitle, logged_date, logged_time, rating, note,
      image_uri, is_cover, external_id, external_source, metadata,
      remote_id, user_id, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      localId,
      remote.category,
      remote.title,
      remote.subtitle || null,
      remote.loggedDate,
      remote.loggedTime || null,
      remote.rating ?? null,
      remote.note || null,
      remote.imageUri || null,
      remote.isCover ? 1 : 0,
      remote.externalId || null,
      remote.externalSource || null,
      metadataStr,
      remote.remoteId,
      remote.userId,
      remote.updatedAt,
      remote.createdAt,
      remote.updatedAt,
    ]
  );
}
