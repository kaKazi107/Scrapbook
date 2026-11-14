import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { ActivityEntry, CategoryId } from '@/types/activity';
import { CATEGORY_LIST } from '@/constants/categories';
import { searchEntries, deleteEntry, updateEntry, getAllEntries } from '@/services/db';
import { CategoryFilter } from '@/components/CategoryFilter';
import { EntryCard } from '@/components/EntryCard';
import { AddEditModal } from '@/components/AddEditModal';
import { deleteImageFromLocalStorage } from '@/services/storage';
import { BottomTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { syncNow } from '@/services/cloud/sync';

export default function ExploreScreen() {
  const isDark = useColorScheme() === 'dark';
  const db = useSQLiteContext();
  const { user, cloudEnabled, signOut } = useAuth();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [minRating, setMinRating] = useState<number>(0);

  const [searchResults, setSearchResults] = useState<ActivityEntry[]>([]);
  const [allEntries, setAllEntries] = useState<ActivityEntry[]>([]);

  const [editingEntry, setEditingEntry] = useState<ActivityEntry | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const runSearch = useCallback(async () => {
    try {
      const results = await searchEntries(db, query, selectedCategory, minRating);
      setSearchResults(results);
      const all = await getAllEntries(db);
      setAllEntries(all);
    } catch (err: any) {
      console.error('Error running search:', err);
    }
  }, [db, query, selectedCategory, minRating]);

  const syncInBackground = useCallback(async () => {
    if (!user?.id) return;
    const result = await syncNow(db, user.id);
    if (!result.error && (result.pushed > 0 || result.pulled > 0 || result.deleted > 0)) {
      await runSearch();
    }
  }, [db, user?.id, runSearch]);

  useFocusEffect(
    useCallback(() => {
      runSearch();
      syncInBackground();
    }, [runSearch, syncInBackground])
  );

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Your entries stay saved on this device. Cloud sync will stop until you sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleDelete = async (entry: ActivityEntry) => {
    Alert.alert('Delete Memory', 'Are you sure you want to delete this memory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (entry.imageUri) {
            await deleteImageFromLocalStorage(entry.imageUri);
          }
          await deleteEntry(db, entry.id);
          await runSearch();
          syncInBackground();
        },
      },
    ]);
  };

  const handleEdit = (entry: ActivityEntry) => {
    setEditingEntry(entry);
    setAddModalVisible(true);
  };

  // Compute insights / statistics
  const totalCount = allEntries.length;
  const categoryCounts: Record<string, number> = {};
  let totalRatingSum = 0;
  let ratedCount = 0;

  allEntries.forEach((e) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    if (e.rating) {
      totalRatingSum += e.rating;
      ratedCount += 1;
    }
  });

  const avgRating = ratedCount > 0 ? (totalRatingSum / ratedCount).toFixed(1) : 'N/A';

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
        <Text style={[styles.headerTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
          Explore & Insights
        </Text>

        {cloudEnabled && user ? (
          <TouchableOpacity
            onPress={handleSignOut}
            hitSlop={8}
            accessibilityLabel="Account"
            style={styles.accountBtn}
          >
            <Ionicons name="person-circle-outline" size={26} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Search Input Box */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderColor: isDark ? '#374151' : '#E5E7EB',
            },
          ]}
        >
          <Ionicons name="search" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#F9FAFB' : '#111827' }]}
            placeholder="Search movies, TV, places, notes..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

        {/* Rating Filter Pills */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>RATING</Text>
          <View style={styles.pillsRow}>
            {[0, 3, 4, 5].map((stars) => {
              const isSelected = minRating === stars;
              return (
                <TouchableOpacity
                  key={stars}
                  style={[
                    styles.ratingPill,
                    isSelected
                      ? { backgroundColor: '#F59E0B' }
                      : { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' },
                  ]}
                  onPress={() => setMinRating(stars)}
                >
                  <Ionicons
                    name="star"
                    size={12}
                    color={isSelected ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.ratingPillText,
                      { color: isSelected ? '#FFFFFF' : isDark ? '#D1D5DB' : '#374151' },
                    ]}
                  >
                    {stars === 0 ? 'All Ratings' : `${stars}+ Stars`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Insights / Stats Cards (when not actively querying) */}
        {query.length === 0 && minRating === 0 && selectedCategory === 'all' && (
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              Scrapbook Overview
            </Text>

            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' },
                ]}
              >
                <Ionicons name="journal" size={24} color="#3B82F6" />
                <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                  {totalCount}
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  Total Memories
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' },
                ]}
              >
                <Ionicons name="star" size={24} color="#F59E0B" />
                <Text style={[styles.statValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                  {avgRating}
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  Avg Rating
                </Text>
              </View>
            </View>

            {/* Breakdown by Category */}
            <View
              style={[
                styles.breakdownCard,
                { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' },
              ]}
            >
              <Text style={[styles.breakdownTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                Category Breakdown
              </Text>

              {CATEGORY_LIST.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                const color = isDark ? cat.darkColor : cat.color;

                return (
                  <View key={cat.id} style={styles.categoryRow}>
                    <View style={styles.catRowLeft}>
                      <Ionicons name={cat.icon as any} size={16} color={color} />
                      <Text style={[styles.catName, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                        {cat.label}
                      </Text>
                    </View>

                    <View style={styles.catRowRight}>
                      <View style={[styles.barTrack, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={[styles.catCount, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {count}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Cloud sync status */}
            <View
              style={[
                styles.breakdownCard,
                {
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                },
              ]}
            >
              <Ionicons
                name={cloudEnabled ? (user ? 'cloud-done' : 'cloud-offline-outline') : 'phone-portrait-outline'}
                size={22}
                color={cloudEnabled && user ? '#10B981' : isDark ? '#9CA3AF' : '#6B7280'}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.breakdownTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                  {cloudEnabled ? (user ? 'Cloud Sync On' : 'Cloud Sync Off') : 'Local Only'}
                </Text>
                <Text
                  style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12, lineHeight: 16 }}
                  numberOfLines={2}
                >
                  {cloudEnabled
                    ? user
                      ? `Synced as ${user.email ?? 'signed-in user'}`
                      : 'Sign in to sync across devices'
                    : 'Add Supabase credentials in .env.local to enable cloud sync'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Search Results List Header */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {query.length > 0 || minRating > 0 || selectedCategory !== 'all'
              ? 'Search Results'
              : 'Recent Entries'}
          </Text>
          <Text style={[styles.resultsCount, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {searchResults.length} items
          </Text>
        </View>

        {/* Results List */}
        {searchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={40} color={isDark ? '#4B5563' : '#D1D5DB'} />
            <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              No memories matched your query or filters.
            </Text>
          </View>
        ) : (
          searchResults.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => handleEdit(entry)}
              onDelete={() => handleDelete(entry)}
            />
          ))
        )}
      </ScrollView>

      {/* Edit Modal */}
      <AddEditModal
        visible={addModalVisible}
        entryToEdit={editingEntry}
        onClose={() => setAddModalVisible(false)}
        onSave={async (payload) => {
          if (editingEntry) {
            const previousImageUri = editingEntry.imageUri;
            await updateEntry(db, editingEntry.id, payload);
            if (previousImageUri && previousImageUri !== payload.imageUri) {
              await deleteImageFromLocalStorage(previousImageUri);
            }
            await runSearch();
            syncInBackground();
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  accountBtn: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  ratingPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  breakdownCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  catRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
  },
  catName: {
    fontSize: 13,
    fontWeight: '500',
  },
  catRowRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  catCount: {
    fontSize: 12,
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
