import { CategoryId } from '@/types/activity';
import { MetadataSearchResult } from '@/types/metadata';

/**
 * Searches iTunes for Movies (`media=movie`) or Music (`media=music`).
 * Keyless, free, reliable.
 */
export async function searchITunes(
  category: Extract<CategoryId, 'movie' | 'music'>,
  query: string,
  signal?: AbortSignal
): Promise<MetadataSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const mediaParam = category === 'movie' ? 'movie' : 'music';
  const entityParam = category === 'movie' ? '&entity=movie' : '';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=${mediaParam}${entityParam}&limit=15`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`iTunes search failed (${response.status})`);
  }

  const data = await response.json();
  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.map((item: any) => {
    const rawArtwork: string = item.artworkUrl100 || item.artworkUrl60 || '';
    const fullArtwork = rawArtwork ? rawArtwork.replace(/\/\d+x\d+bb/g, '/600x600bb') : undefined;
    const previewArtwork = rawArtwork || undefined;

    if (category === 'movie') {
      const director = item.artistName || '';
      const year = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
      const genre = item.primaryGenreName || '';

      const subtitleParts = [director, year].filter(Boolean);

      return {
        externalId: String(item.trackId || item.collectionId || Math.random()),
        externalSource: 'itunes',
        category: 'movie',
        title: item.trackName || item.collectionName || cleanQuery,
        subtitle: subtitleParts.join(' • ') || undefined,
        previewImageUrl: previewArtwork,
        fullImageUrl: fullArtwork,
        metadata: {
          ...(director ? { director } : {}),
          ...(year ? { year } : {}),
          ...(genre ? { genre } : {}),
        },
      };
    } else {
      // Music
      const artist = item.artistName || '';
      const album = item.collectionName || '';
      const track = item.trackName || item.collectionName || cleanQuery;
      const releaseYear = item.releaseDate ? item.releaseDate.substring(0, 4) : '';

      return {
        externalId: String(item.trackId || item.collectionId || Math.random()),
        externalSource: 'itunes',
        category: 'music',
        title: track,
        subtitle: [artist, album].filter(Boolean).join(' • ') || artist || undefined,
        previewImageUrl: previewArtwork,
        fullImageUrl: fullArtwork,
        metadata: {
          ...(artist ? { artist } : {}),
          ...(album ? { album } : {}),
          ...(releaseYear ? { year: releaseYear } : {}),
        },
      };
    }
  });
}
