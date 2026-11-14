import { CategoryId } from '@/types/activity';
import { MetadataSearchResult } from '@/types/metadata';

/**
 * Searches iTunes for Movies or Music.
 *
 * NOTE: iTunes `media=movie` returns 0 results for every query (API limitation).
 * For movies we search without a media filter and client-side filter for
 * `kind === "feature-movie"`. Music uses `media=music` which works correctly.
 * Keyless, free, reliable.
 */
export async function searchITunes(
  category: Extract<CategoryId, 'movie' | 'music'>,
  query: string,
  signal?: AbortSignal
): Promise<MetadataSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // Movies: no media filter (media=movie is broken), filter client-side
  // Music: media=music works correctly
  const mediaParam = category === 'music' ? '&media=music' : '';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}${mediaParam}&limit=20`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`iTunes search failed (${response.status})`);
  }

  const data = await response.json();
  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  // For movies, keep only actual feature-movie results
  const filteredResults =
    category === 'movie'
      ? data.results.filter((item: any) => item.kind === 'feature-movie')
      : data.results;

  return filteredResults.map((item: any) => {
    const rawArtwork: string = item.artworkUrl100 || item.artworkUrl60 || '';
    const fullArtwork = rawArtwork ? rawArtwork.replace(/\/\d+x\d+bb/g, '/600x600bb') : undefined;
    const previewArtwork = rawArtwork || undefined;

    if (category === 'movie') {
      // iTunes movie result shape:
      //   trackName = movie title
      //   artistName = director
      //   releaseDate = ISO date string
      //   primaryGenreName = genre
      //   artworkUrl100 = poster thumbnail
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
