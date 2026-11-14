import { File } from 'expo-file-system';

import { supabase } from '@/services/supabase';

const BUCKET = 'entry-images';

export function isRemoteImageUri(uri?: string): boolean {
  return !!uri && /^https?:\/\//i.test(uri);
}

function guessContentType(extension: string): string {
  switch (extension.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.heic':
      return 'image/heic';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/**
 * Uploads a locally-stored photo to the `entry-images` Supabase bucket and
 * returns its public URL. Already-remote or missing files are returned as-is
 * (or null when upload fails, so the caller can fall back to the local path).
 */
export async function uploadImageToCloud(
  localUri: string,
  userId: string
): Promise<string | null> {
  if (!supabase) return null;
  if (isRemoteImageUri(localUri)) return localUri;

  try {
    const file = new File(localUri);
    if (!file.exists) return null;

    const bytes = await file.bytes();
    const extension = file.extension || '.jpg';
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}${extension}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: guessContentType(extension),
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('[cloud] Image upload failed, keeping local path:', err);
    return null;
  }
}

/** Deletes a previously uploaded photo from the bucket (best-effort). */
export async function deleteImageFromCloud(publicUrl: string): Promise<void> {
  if (!supabase || !publicUrl) return;

  try {
    const marker = `/object/public/${BUCKET}/`;
    const index = publicUrl.indexOf(marker);
    if (index === -1) return;

    const path = decodeURIComponent(publicUrl.substring(index + marker.length));
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.warn('[cloud] Image delete failed:', err);
  }
}
