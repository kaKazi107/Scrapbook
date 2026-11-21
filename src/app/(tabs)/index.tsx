import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';

import { ActivityEntry, CategoryId, NewActivityEntry } from '@/types/activity';
import { toLocalDateString } from '@/utils/date';
import {
  getAllEntries,
  getEntriesByDate,
  insertEntry,
  updateEntry,
  deleteEntry,
  setDayCover,
} from '@/services/db';
import { CategoryFilter } from '@/components/CategoryFilter';
import { CalendarGrid } from '@/components/CalendarGrid';
import { EntryCard } from '@/components/EntryCard';
import { AddEditModal } from '@/components/AddEditModal';
import { DayDetailModal } from '@/components/DayDetailModal';
import { PhotoViewer } from '@/components/PhotoViewer';
import { deleteImageFromLocalStorage } from '@/services/storage';
import { BottomTabInset } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { syncNow } from '@/services/cloud/sync';

export default function HomeScreen() {
  const isDark = useColorScheme() === 'dark';
  const db = useSQLiteContext();
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>();
  const [editingEntry, setEditingEntry] = useState<ActivityEntry | null>(null);

  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedDayDateStr, setSelectedDayDateStr] = useState<string>('');
  const [dayEntries, setDayEntries] = useState<ActivityEntry[]>([]);

  // Personal photo gallery
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openPhotos = (entry: ActivityEntry, index = 0) => {
    if (!entry.photos || entry.photos.length === 0) return;
    setViewerPhotos(entry.photos);
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllEntries(db);
      setEntries(data);
    } catch (err: any) {
      console.error('Failed loading entries:', err);
    } finally {
      setLoading(false);
    }
  }, [db]);

  /** Pushes/pulls cloud changes, then refreshes local UI if anything moved. */
  const syncInBackground = useCallback(async () => {
    if (!user?.id) return;
    const result = await syncNow(db, user.id);
    if (!result.error && (result.pushed > 0 || result.pulled > 0 || result.deleted > 0)) {
      await loadData();
      if (dayModalVisible && selectedDayDateStr) {
        const refreshed = await getEntriesByDate(db, selectedDayDateStr);
        setDayEntries(refreshed);
      }
    }
  }, [db, user?.id, loadData, dayModalVisible, selectedDayDateStr]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      syncInBackground();
    }, [loadData, syncInBackground])
  );

  // Filtered entries for timeline
  const filteredEntries = entries.filter((e) => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    return true;
  });

  // Handle Day Selection on Calendar
  const handleSelectDate = async (dateStr: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedDayDateStr(dateStr);
    const dayData = await getEntriesByDate(db, dateStr);
    setDayEntries(dayData);
    setDayModalVisible(true);
  };

  // Open Add Modal
  const handleOpenAdd = (dateStr?: string) => {
    setEditingEntry(null);
    setModalInitialDate(dateStr || toLocalDateString());
    setAddModalVisible(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (entry: ActivityEntry) => {
    setEditingEntry(entry);
    setAddModalVisible(true);
  };

  // Handle Save (Add or Update)
  const handleSaveEntry = async (
    payload: NewActivityEntry | Partial<ActivityEntry>,
    isEdit: boolean
  ) => {
    if (isEdit && editingEntry) {
      const previousImageUri = editingEntry.imageUri;
      await updateEntry(db, editingEntry.id, payload);

      // Delete stale local image if it was replaced or removed
      if (previousImageUri && previousImageUri !== payload.imageUri) {
        await deleteImageFromLocalStorage(previousImageUri);
      }
    } else {
      await insertEntry(db, payload as NewActivityEntry);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await loadData();
    if (dayModalVisible && selectedDayDateStr) {
      const updatedDayData = await getEntriesByDate(db, selectedDayDateStr);
      setDayEntries(updatedDayData);
    }
    syncInBackground();
  };

  // Handle Delete Entry
  const handleDeleteEntry = async (entry: ActivityEntry) => {
    try {
      if (entry.imageUri) {
        await deleteImageFromLocalStorage(entry.imageUri);
      }
      // Clean up local photo files
      if (entry.photos && entry.photos.length > 0) {
        for (const photo of entry.photos) {
          await deleteImageFromLocalStorage(photo);
        }
      }
      await deleteEntry(db, entry.id);
      await loadData();
      if (dayModalVisible && selectedDayDateStr) {
        const updatedDayData = await getEntriesByDate(db, selectedDayDateStr);
        setDayEntries(updatedDayData);
      }
      syncInBackground();
    } catch (err: any) {
      Alert.alert('Error', 'Failed to delete memory.');
    }
  };

  // Handle Set Cover
  const handleSetCover = async (dateStr: string, entryId: string) => {
    await setDayCover(db, dateStr, entryId);
    await loadData();
    const updatedDayData = await getEntriesByDate(db, dateStr);
    setDayEntries(updatedDayData);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
        <View style={styles.brandContainer}>
          <Ionicons name="journal" size={24} color="#3B82F6" />
          <Text style={[styles.brandTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            Scrapbook
          </Text>
        </View>

        {/* Toggle Switch View Mode */}
        <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#1F2937' : '#E5E7EB' }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'calendar' && {
                backgroundColor: isDark ? '#374151' : '#FFFFFF',
              },
            ]}
            onPress={() => setViewMode('calendar')}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={viewMode === 'calendar' ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'timeline' && {
                backgroundColor: isDark ? '#374151' : '#FFFFFF',
              },
            ]}
            onPress={() => setViewMode('timeline')}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'timeline' ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills */}
      <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : viewMode === 'calendar' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <CalendarGrid
            currentDate={currentDate}
            entries={entries}
            selectedCategory={selectedCategory}
            onMonthChange={setCurrentDate}
            onSelectDate={handleSelectDate}
            onAddForDate={handleOpenAdd}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredEntries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles-outline" size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
              <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                No memories logged for this filter yet. Tap + to add one!
              </Text>
            </View>
          ) : (
            filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => handleOpenEdit(entry)}
                onPressPhotos={() => openPhotos(entry)}
                onDelete={() => {
                  Alert.alert('Delete Memory', 'Are you sure you want to delete this memory?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeleteEntry(entry) },
                  ]);
                }}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Floating Action Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => handleOpenAdd()}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modals */}
      <AddEditModal
        visible={addModalVisible}
        initialDate={modalInitialDate}
        entryToEdit={editingEntry}
        onClose={() => setAddModalVisible(false)}
        onSave={handleSaveEntry}
      />

      <DayDetailModal
        visible={dayModalVisible}
        dateStr={selectedDayDateStr}
        entries={dayEntries}
        onClose={() => setDayModalVisible(false)}
        onAddEntry={handleOpenAdd}
        onEditEntry={handleOpenEdit}
        onDeleteEntry={handleDeleteEntry}
        onSetCover={handleSetCover}
      />

      <PhotoViewer
        visible={viewerVisible}
        photos={viewerPhotos}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 20,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: BottomTabInset + 8,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
});
