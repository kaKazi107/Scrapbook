import { CategoryId } from './activity';

export type ExternalSource = 'itunes' | 'tvmaze' | 'osm';

export interface MetadataSearchResult {
  externalId: string;
  externalSource: ExternalSource;
  category: CategoryId;
  title: string;
  subtitle?: string;
  previewImageUrl?: string;
  fullImageUrl?: string;
  metadata: Record<string, string>;
}
