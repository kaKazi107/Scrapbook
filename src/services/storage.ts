import { Directory, File, Paths } from 'expo-file-system';

const IMAGES_DIR_NAME = 'entry-images';

function getImagesDirectory(): Directory {
  const dir = new Directory(Paths.document, IMAGES_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Copies a temporary image (returned by the image picker / camera) into the app's
 * permanent document directory so it survives cache cleanups.
 */
export async function saveImageToLocalStorage(tempUri: string): Promise<string> {
  if (!tempUri) return tempUri;

  try {
    const dir = getImagesDirectory();

    // Already stored inside our permanent images directory?
    if (tempUri.startsWith(dir.uri)) {
      return tempUri;
    }

    const source = new File(tempUri);
    const extension = source.extension || '.jpg';
    const fileName = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${extension}`;
    const destination = new File(dir, fileName);

    await source.copy(destination, { overwrite: true });

    return destination.uri;
  } catch (error) {
    console.warn('Could not persist image locally, keeping original uri:', error);
    return tempUri;
  }
}

/**
 * Deletes a previously persisted image. Only touches files inside our own
 * document directory so images from other sources are never removed.
 */
export async function deleteImageFromLocalStorage(imageUri?: string): Promise<void> {
  if (!imageUri) return;

  try {
    const dir = getImagesDirectory();
    if (!imageUri.startsWith(dir.uri)) return;

    const file = new File(imageUri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn('Could not delete image from local storage:', error);
  }
}
