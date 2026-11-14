import { CategoryId } from '@/types/activity';
import { MetadataSearchResult } from '@/types/metadata';

/**
 * Searches OpenStreetMap Nominatim API for places and restaurants/dining.
 * Respects OSM usage policy with a custom User-Agent.
 */
export async function searchOpenStreetMap(
  category: Extract<CategoryId, 'restaurant' | 'place'>,
  query: string,
  signal?: AbortSignal
): Promise<MetadataSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    cleanQuery
  )}&format=jsonv2&addressdetails=1&extratags=1&limit=12`;

  const response = await fetch(url, {
    signal,
    headers: {
      'User-Agent': 'ScrapbookMobileApp/1.0 (local-personal-diary-app)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`OSM search failed (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => {
    const rawName = item.name || (item.display_name ? item.display_name.split(',')[0] : cleanQuery);
    const address = item.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      address.country ||
      '';
    const country = address.country || '';
    const extratags = item.extratags || {};

    const cuisine = extratags.cuisine ? extratags.cuisine.replace(/;/g, ', ') : '';
    const spotType = item.type || item.class || 'Spot';

    const locationSubtitle = [city, country !== city ? country : ''].filter(Boolean).join(', ');

    const metadata: Record<string, string> = {
      ...(city ? { city } : {}),
      ...(item.lat ? { lat: String(item.lat) } : {}),
      ...(item.lon ? { lon: String(item.lon) } : {}),
    };

    if (category === 'restaurant') {
      if (cuisine) metadata.cuisine = cuisine;
    } else {
      if (spotType) metadata.spotType = spotType;
    }

    return {
      externalId: String(item.place_id || Math.random()),
      externalSource: 'osm',
      category,
      title: rawName,
      subtitle: locationSubtitle || item.display_name || undefined,
      previewImageUrl: undefined,
      fullImageUrl: undefined,
      metadata,
    };
  });
}
