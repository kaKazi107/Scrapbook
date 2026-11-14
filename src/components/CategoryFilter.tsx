import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_LIST } from '@/constants/categories';
import { CategoryId } from '@/types/activity';
import { useColorScheme } from 'react-native';

interface CategoryFilterProps {
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (category: CategoryId | 'all') => void;
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.pill,
          selectedCategory === 'all'
            ? { backgroundColor: isDark ? '#FFFFFF' : '#111827' }
            : { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
        ]}
        onPress={() => onSelectCategory('all')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="apps-outline"
          size={16}
          color={selectedCategory === 'all' ? (isDark ? '#111827' : '#FFFFFF') : isDark ? '#9CA3AF' : '#6B7280'}
        />
        <Text
          style={[
            styles.pillText,
            selectedCategory === 'all'
              ? { color: isDark ? '#111827' : '#FFFFFF', fontWeight: '700' }
              : { color: isDark ? '#9CA3AF' : '#4B5563' },
          ]}
        >
          All
        </Text>
      </TouchableOpacity>

      {CATEGORY_LIST.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const color = isDark ? cat.darkColor : cat.color;

        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.pill,
              isSelected
                ? { backgroundColor: color }
                : { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
            ]}
            onPress={() => onSelectCategory(cat.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={isSelected ? '#FFFFFF' : color}
            />
            <Text
              style={[
                styles.pillText,
                isSelected
                  ? { color: '#FFFFFF', fontWeight: '700' }
                  : { color: isDark ? '#D1D5DB' : '#374151' },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
