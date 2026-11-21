import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/services/supabase';
import {
  getEntriesForSync,
  getPendingDeletions,
  clearPendingDeletion,
  markEntrySynced,
  upsertEntryFromRemote,
  type RemoteEntryInput,
} from '@/services/db';
import { uploadImageToCloud, isRemoteImageUri } from '@/services/cloud/storage';
import type { ActivityEntry } from '@/types/activity';

export interface SyncSummary {
  pushed: number;
  pulled: number;
  deleted: number;
  error: string | null;
  skippedReason?: string;
}

function isCloudReady(): boolean {
  return supabase !== null;
}

function toRemotePayload(entry: ActivityEntry, userId: string, imageUrl: string | null) {
  return {
    user_id: userId,
    local_id: entry.id,
    category: entry.category,
    title: entry.title,
    subtitle: entry.subtitle ?? null,
    logged_date: entry.loggedDate,
    logged_time: entry.loggedTime ?? null,
    rating: entry.rating ?? null,
    note: entry.note ?? null,
    image_url: imageUrl,
    is_cover: entry.isCover ?? false,
    external_id: entry.externalId ?? null,
    external_source: entry.externalSource ?? null,
    metadata: entry.metadata ?? {},
    updated_at: new Date().toISOString(),
  };
}

function fromRemoteRow(row: any): RemoteEntryInput {
  return {
    remoteId: row.id as string,
    userId: row.user_id as string,
    category: row.category as string,
    title: row.title as string,
    subtitle: row.subtitle ?? undefined,
    loggedDate: row.logged_date as string,
    loggedTime: row.logged_time ?? undefined,
    rating: row.rating ?? undefined,
    note: row.note ?? undefined,
    imageUri: row.image_url ?? undefined,
    isCover: row.is_cover ?? false,
    externalId: row.external_id ?? undefined,
    externalSource: row.external_source ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Pushes local unsynced entries to Supabase. */
async function pushLocalEntries(db: SQLiteDatabase, userId: string): Promise<number> {
  if (!supabase) return 0;

  const pending = await getEntriesForSync(db);
  let pushed = 0;

  for (const entry of pending) {
    // Upload local camera/gallery photos once, then reference the public URL.
    let imageUrl: string | null = entry.imageUri ?? null;
    if (entry.imageUri && !isRemoteImageUri(entry.imageUri)) {
      const uploaded = await uploadImageToCloud(entry.imageUri, userId);
      if (uploaded) imageUrl = uploaded;
    }

    const payload = toRemotePayload(entry, userId, imageUrl);

    const { data, error } = await supabase
      .from('activity_entries')
      .upsert(payload, { onConflict: 'user_id,local_id' })
      .select('id, updated_at')
      .single();

    if (error) {
      // Abort the batch on the first failure; entries stay marked unsynced.
      throw new Error(`Push failed for "${entry.title}": ${error.message}`);
    }

    await markEntrySynced(db, entry.id, data.id, userId, data.updated_at);
    pushed += 1;
  }

  return pushed;
}

/** Deletes cloud rows for locally-deleted entries (tombstones). */
async function pushDeletions(db: SQLiteDatabase): Promise<number> {
  if (!supabase) return 0;

  const tombstones = await getPendingDeletions(db);
  let deleted = 0;

  for (const tombstone of tombstones) {
    const { error } = await supabase
      .from('activity_entries')
      .delete()
      .eq('id', tombstone.remoteId);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    await clearPendingDeletion(db, tombstone.remoteId);
    deleted += 1;
  }

  return deleted;
}

/** Pulls the user's remote entries and merges them into local SQLite. */
async function pullRemoteEntries(db: SQLiteDatabase): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from('activity_entries')
    .select('*')
    .order('updated_at', { ascending: true });

  if (error) {
    throw new Error(`Pull failed: ${error.message}`);
  }

  // Skip rows that are queued for local deletion (they're about to be removed).
  const tombstoned = new Set(
    (await getPendingDeletions(db)).map((d) => d.remoteId)
  );

  let pulled = 0;
  for (const row of data ?? []) {
    if (tombstoned.has(row.id)) continue;
    await upsertEntryFromRemote(db, fromRemoteRow(row));
    pulled += 1;
  }

  return pulled;
}

/**
 * Bidirectional sync: push local changes first (so local edits win), then pull
 * remote entries and merge. Safe to call frequently (e.g. on app focus).
 */
export async function syncNow(
  db: SQLiteDatabase,
  userId: string | undefined
): Promise<SyncSummary> {
  if (!isCloudReady()) {
    return { pushed: 0, pulled: 0, deleted: 0, error: null, skippedReason: 'Cloud not configured' };
  }
  if (!userId) {
    return { pushed: 0, pulled: 0, deleted: 0, error: null, skippedReason: 'Not signed in' };
  }

  try {
    const deleted = await pushDeletions(db);
    const pushed = await pushLocalEntries(db, userId);
    const pulled = await pullRemoteEntries(db);
    if (__DEV__ && (pushed || pulled || deleted)) {
      console.log(`[sync] pushed=${pushed} pulled=${pulled} deleted=${deleted}`);
    }
    return { pushed, pulled, deleted, error: null };
  } catch (err: any) {
    const message = err?.message ?? 'Sync failed';
    console.warn('[sync] failed:', message);
    return { pushed: 0, pulled: 0, deleted: 0, error: message };
  }
}
