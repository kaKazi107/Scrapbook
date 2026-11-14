export type CategoryId = 'movie' | 'tv' | 'music' | 'restaurant' | 'place';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  icon: string; // Ionicons icon name
  color: string;
  darkColor: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
  }[];
}

export interface ActivityEntry {
  id: string;
  category: CategoryId;
  title: string;
  subtitle?: string;
  loggedDate: string; // YYYY-MM-DD
  loggedTime?: string; // HH:mm
  rating?: number; // 0.5 to 5.0
  note?: string;
  imageUri?: string;
  isCover?: boolean; // If true, preferred thumbnail for this date
  externalId?: string;
  externalSource?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type NewActivityEntry = Omit<ActivityEntry, 'id' | 'createdAt' | 'updatedAt'>;
