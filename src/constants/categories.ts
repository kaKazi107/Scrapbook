import { CategoryDef, CategoryId } from '@/types/activity';

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  movie: {
    id: 'movie',
    label: 'Movies',
    icon: 'film-outline',
    color: '#E53935', // Warm Red
    darkColor: '#EF5350',
    fields: [
      { key: 'director', label: 'Director', placeholder: 'e.g. Denis Villeneuve' },
      { key: 'year', label: 'Release Year', placeholder: 'e.g. 2024' },
      { key: 'genre', label: 'Genre', placeholder: 'e.g. Sci-Fi' },
    ],
  },
  tv: {
    id: 'tv',
    label: 'TV Shows',
    icon: 'tv-outline',
    color: '#8E24AA', // Purple
    darkColor: '#AB47BC',
    fields: [
      { key: 'season', label: 'Season', placeholder: 'e.g. S01' },
      { key: 'episode', label: 'Episode', placeholder: 'e.g. E04' },
      { key: 'network', label: 'Network / Service', placeholder: 'e.g. HBO, Netflix' },
    ],
  },
  music: {
    id: 'music',
    label: 'Music',
    icon: 'musical-notes-outline',
    color: '#1DB954', // Vibrant Green
    darkColor: '#1ED760',
    fields: [
      { key: 'artist', label: 'Artist', placeholder: 'e.g. Frank Ocean' },
      { key: 'album', label: 'Album / Single', placeholder: 'e.g. Blonde' },
    ],
  },
  restaurant: {
    id: 'restaurant',
    label: 'Food & Dining',
    icon: 'restaurant-outline',
    color: '#FB8C00', // Amber Orange
    darkColor: '#FFA726',
    fields: [
      { key: 'cuisine', label: 'Cuisine', placeholder: 'e.g. Japanese Ramen' },
      { key: 'dish', label: 'Dish Ordered', placeholder: 'e.g. Tonkotsu Ramen' },
      { key: 'priceRange', label: 'Price ($ to $$$$)', placeholder: 'e.g. $$' },
    ],
  },
  place: {
    id: 'place',
    label: 'Places & Travel',
    icon: 'map-outline',
    color: '#0288D1', // Cyan / Blue
    darkColor: '#29B6F6',
    fields: [
      { key: 'city', label: 'City / Neighborhood', placeholder: 'e.g. Kyoto, Japan' },
      { key: 'spotType', label: 'Spot Type', placeholder: 'e.g. Park, Museum, Viewpoint' },
    ],
  },
};

export const CATEGORY_LIST: CategoryDef[] = Object.values(CATEGORIES);
