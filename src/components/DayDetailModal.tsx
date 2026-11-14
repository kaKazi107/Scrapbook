import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityEntry } from '@/types/activity';
import { EntryCard } from './EntryCard';

interface DayDetailModalProps {
  visible: boolean;
  dateStr: string;
  entries: ActivityEntry[];
  onClose: () => void;
  onAddEntry: (dateStr: string) => void;
  onEditEntry: (entry: ActivityEntry) => void;
  onDeleteEntry: (entry: ActivityEntry) => void;
  onSetCover: (dateStr: string, entryId: string) => void;
}

export function DayDetailModal({
  visible,
  dateStr,
  entries,
  onClose,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onSetCover,
}: DayDetailModalProps) {
  const isDark = useColorScheme() === 'dark';

  if (!dateStr) return null;

  // Format date display (e.g., Nov 13, 2026)
  const dateObj = new Date(dateStr + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[
            styles.sheetContainer,
            { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.dateTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                {formattedDate}
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {entries.length === 0 ? 'No memories logged yet' : `${entries.length} items logged`}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close-circle" size={28} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          {/* Action Add Button */}
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
            onPress={() => {
              onClose();
              onAddEntry(dateStr);
            }}
          >
            <Ionicons name="add-circle" size={20} color="#3B82F6" />
            <Text style={styles.addBtnText}>Log something for this day</Text>
          </TouchableOpacity>

          {/* Entries list */}
          <ScrollView contentContainerStyle={styles.listContent}>
            {entries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="journal-outline" size={48} color={isDark ? '#4B5563' : '#D1D5DB'} />
                <Text style={[styles.emptyText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                  Keep track of what you watched, listened to, or visited on this day.
                </Text>
              </View>
            ) : (
              entries.map((entry) => (
                <View key={entry.id} style={styles.entryWrapper}>
                  <EntryCard
                    entry={entry}
                    showDate={false}
                    onEdit={() => {
                      onClose();
                      onEditEntry(entry);
                    }}
                    onDelete={() => {
                      Alert.alert('Delete Memory', 'Are you sure you want to delete this entry?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => onDeleteEntry(entry),
                        },
                      ]);
                    }}
                  />
                  {entries.length > 1 && (
                    <TouchableOpacity
                      style={styles.coverToggleBtn}
                      onPress={() => onSetCover(dateStr, entry.id)}
                    >
                      <Ionicons
                        name={entry.isCover ? 'star' : 'star-outline'}
                        size={14}
                        color={entry.isCover ? '#F59E0B' : isDark ? '#9CA3AF' : '#6B7280'}
                      />
                      <Text
                        style={[
                          styles.coverToggleText,
                          { color: entry.isCover ? '#F59E0B' : isDark ? '#9CA3AF' : '#6B7280' },
                        ]}
                      >
                        {entry.isCover ? 'Day Cover' : 'Set as Cover'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    minHeight: '40%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  addBtnText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  entryWrapper: {
    position: 'relative',
  },
  coverToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: 24,
    marginTop: -4,
    marginBottom: 8,
    gap: 4,
  },
  coverToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
