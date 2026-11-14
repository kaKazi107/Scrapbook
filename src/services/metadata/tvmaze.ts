import { MetadataSearchResult } from '@/types/metadata';

/**
 * Searches TVMaze API for TV Shows (`https://api.tvmaze.com/search/shows?q=...`).
 * Keyless, fast, no auth required.
 */
export async function searchTVMaze(
  query: string,
  signal?: AbortSignal
): Promise<MetadataSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const url = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(cleanQuery)}`;
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`TVMaze search failed (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.slice(0, 15).map((item: any) => {
    const show = item.show || {};
    const name = show.name || cleanQuery;
    const network = show.network?.name || show.webChannel?.name || '';
    const year = show.premiered ? show.premiered.substring(0, 4) : '';
    const genres = Array.isArray(show.genres) ? show.genres.join(', ') : '';

    let mediumImg: string | undefined = show.image?.medium;
    let originalImg: string | undefined = show.image?.original;

    // Normalize HTTP -> HTTPS if needed
    if (mediumImg && mediumImg.startsWith('http://')) {
      mediumImg = mediumImg.replace('http://', 'https://');
    }
    if (originalImg && originalImg.startsWith('http://')) {
      originalImg = originalImg.replace('http://', 'https://');
    }

    const subtitleParts = [network, year].filter(Boolean);

    return {
      externalId: String(show.id || Math.random()),
      externalSource: 'tvmaze',
      category: 'tv',
      title: name,
      subtitle: subtitleParts.join(' • ') || undefined,
      previewImageUrl: mediumImg || originalImg,
      fullImageUrl: originalImg || mediumImg,
      metadata: {
        ...(network ? { network } : {}),
        ...(year ? { year } : {}),
        ...(genres ? { genre: genres } : {}),
      },
    };
  });
}
