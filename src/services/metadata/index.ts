import { CategoryId } from '@/types/activity';
import { MetadataSearchResult } from '@/types/metadata';
import { searchITunes } from './itunes';
import { searchTVMaze } from './tvmaze';
import { searchOpenStreetMap } from './osm';

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Unified metadata search entrypoint for all 5 categories.
 * Handles timeouts and routes to keyless providers (iTunes, TVMaze, OSM).
 */
export async function searchMetadata(
  category: CategoryId,
  query: string,
  callerSignal?: AbortSignal
): Promise<MetadataSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // Setup timeout controller combined with optional caller signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), DEFAULT_TIMEOUT_MS);

  // Link caller signal if provided
  if (callerSignal) {
    callerSignal.addEventListener('abort', () => timeoutController.abort());
  }

  try {
    switch (category) {
      case 'movie':
      case 'music':
        return await searchITunes(category, cleanQuery, timeoutController.signal);
      case 'tv':
        return await searchTVMaze(cleanQuery, timeoutController.signal);
      case 'restaurant':
      case 'place':
        return await searchOpenStreetMap(category, cleanQuery, timeoutController.signal);
      default:
        return [];
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
