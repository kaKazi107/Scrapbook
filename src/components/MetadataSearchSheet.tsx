import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryId } from '@/types/activity';
import { MetadataSearchResult } from '@/types/metadata';
import { searchMetadata } from '@/services/metadata';
import { CATEGORIES } from '@/constants/categories';

interface MetadataSearchSheetProps {
  visible: boolean;
  category: CategoryId;
  initialQuery?: string;
  onClose: () => void;
  onSelectResult: (result: MetadataSearchResult) => void;
}

export function MetadataSearchSheet({
  visible,
  category,
  initialQuery = '',
  onClose,
  onSelectResult,
}: MetadataSearchSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const categoryDef = CATEGORIES[category];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MetadataSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setResults([]);
        setLoading(false);
        setErrorMsg(null);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await searchMetadata(category, searchTerm, controller.signal);
        setResults(res);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setErrorMsg('Could not fetch results. Check your network or enter details manually.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  useEffect(() => {
    if (visible) {
      setQuery(initialQuery);
      setErrorMsg(null);
      if (initialQuery.trim()) {
        performSearch(initialQuery);
      } else {
        setResults([]);
      }
    } else {
      setQuery('');
      setResults([]);
      setErrorMsg(null);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    }
  }, [visible, initialQuery, performSearch]);

  const handleQueryChange = (text: string) => {
    setQuery(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const debounceDelay = category === 'restaurant' || category === 'place' ? 600 : 400;

    debounceTimerRef.current = setTimeout(() => {
      performSearch(text);
    }, debounceDelay);
  };

  const renderSourceLabel = (source: string) => {
    switch (source) {
      case 'itunes':
        return 'iTunes';
      case 'tvmaze':
        return 'TVMaze';
      case 'osm':
        return 'OpenStreetMap';
      default:
        return source.toUpperCase();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 20,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
            <View style={styles.titleRow}>
              <Ionicons
                name={categoryDef.icon as any}
                size={20}
                color={isDark ? categoryDef.darkColor : categoryDef.color}
              />
              <Text style={[styles.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                Search {categoryDef.label}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? '#111827' : '#F3F4F6',
                borderColor: isDark ? '#374151' : '#E5E7EB',
              },
            ]}
          >
            <Ionicons name="search" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <TextInput
              style={[styles.searchInput, { color: isDark ? '#F9FAFB' : '#111827' }]}
              placeholder={`Search ${categoryDef.label.toLowerCase()} to auto-fill...`}
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={query}
              onChangeText={handleQueryChange}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS !== 'ios' && (
              <TouchableOpacity onPress={() => handleQueryChange('')}>
                <Ionicons name="close-circle" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Error Banner */}
          {errorMsg && (
            <View style={[styles.errorBanner, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <Ionicons name="alert-circle-outline" size={18} color={isDark ? '#FCA5A5' : '#DC2626'} />
              <Text style={[styles.errorText, { color: isDark ? '#FECACA' : '#991B1B' }]}>
                {errorMsg}
              </Text>
            </View>
          )}

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={categoryDef.color} />
              <Text style={[styles.loadingText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                Searching {categoryDef.label}...
              </Text>
            </View>
          )}

          {/* Results List */}
          {!loading && (
            <FlatList
              data={results}
              keyExtractor={(item, index) => `${item.externalSource}_${item.externalId}_${index}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: isDark ? '#111827' : '#F9FAFB',
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                    },
                  ]}
                  onPress={() => onSelectResult(item)}
                  activeOpacity={0.7}
                >
                  {/* Poster / Thumbnail Preview */}
                  {item.previewImageUrl ? (
                    <Image
                      source={{ uri: item.previewImageUrl }}
                      style={styles.thumbnail}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View
                      style={[
                        styles.placeholderThumbnail,
                        { backgroundColor: categoryDef.color + '20' },
                      ]}
                    >
                      <Ionicons
                        name={categoryDef.icon as any}
                        size={24}
                        color={categoryDef.color}
                      />
                    </View>
                  )}

                  {/* Result Details */}
                  <View style={styles.resultInfo}>
                    <Text
                      style={[styles.resultTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    {item.subtitle ? (
                      <Text
                        style={[styles.resultSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </Text>
                    ) : null}

                    {/* Source Tag */}
                    <View style={styles.sourceRow}>
                      <View style={[styles.sourceBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                        <Text style={[styles.sourceText, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
                          {renderSourceLabel(item.externalSource)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !loading && query.trim().length > 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={36} color={isDark ? '#4B5563' : '#9CA3AF'} />
                    <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                      No matching {categoryDef.label.toLowerCase()} found. Try another search or enter details manually.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="sparkles-outline" size={36} color={isDark ? '#4B5563' : '#D1D5DB'} />
                    <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                      Type a title or place name to auto-fill details, posters, and credits.
                    </Text>
                  </View>
                )
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '50%',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
    gap: 8,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  thumbnail: {
    width: 50,
    height: 70,
    borderRadius: 8,
  },
  placeholderThumbnail: {
    width: 50,
    height: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  resultSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
