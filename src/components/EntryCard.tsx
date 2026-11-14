import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityEntry } from '@/types/activity';
import { CATEGORIES } from '@/constants/categories';
import { RatingStars } from './RatingStars';

interface EntryCardProps {
  entry: ActivityEntry;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

export function EntryCard({ entry, onPress, onEdit, onDelete, showDate = true }: EntryCardProps) {
  const isDark = useColorScheme() === 'dark';
  const category = CATEGORIES[entry.category] || CATEGORIES.movie;
  const categoryColor = isDark ? category.darkColor : category.color;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderColor: isDark ? '#374151' : '#E5E7EB',
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {/* Artwork Poster / Image if available */}
      {entry.imageUri ? (
        <Image source={{ uri: entry.imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholderImage, { backgroundColor: categoryColor + '20' }]}>
          <Ionicons name={category.icon as any} size={36} color={categoryColor} />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Header Row: Category Badge & Actions */}
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: categoryColor + '18' }]}>
            <Ionicons name={category.icon as any} size={12} color={categoryColor} />
            <Text style={[styles.badgeText, { color: categoryColor }]}>{category.label}</Text>
          </View>

          <View style={styles.actionButtons}>
            {onEdit && (
              <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="pencil-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity onPress={onDelete} style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]} numberOfLines={2}>
          {entry.title}
        </Text>
        {entry.subtitle ? (
          <Text style={[styles.subtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]} numberOfLines={1}>
            {entry.subtitle}
          </Text>
        ) : null}

        {/* Rating & Date */}
        <View style={styles.metaRow}>
          {entry.rating ? <RatingStars rating={entry.rating} readOnly size={14} /> : <View />}
          {showDate && (
            <Text style={[styles.dateText, { color: isDark ? '#9CA3AF' : '#9CA3AF' }]}>
              {entry.loggedDate}
            </Text>
          )}
        </View>

        {/* Note snippet */}
        {entry.note ? (
          <Text style={[styles.noteText, { color: isDark ? '#D1D5DB' : '#4B5563' }]} numberOfLines={3}>
            "{entry.note}"
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: 105,
    alignSelf: 'stretch',
    minHeight: 125,
  },
  placeholderImage: {
    width: 105,
    alignSelf: 'stretch',
    minHeight: 125,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 16,
  },
});
