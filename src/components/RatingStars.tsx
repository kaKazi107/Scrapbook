import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  rating?: number; // 0 to 5 (supports halfs like 4.5)
  onRatingChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
  showText?: boolean;
}

export function RatingStars({
  rating = 0,
  onRatingChange,
  size = 20,
  readOnly = false,
  showText = false,
}: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];

  const handlePress = (starIndex: number) => {
    if (readOnly || !onRatingChange) return;
    // Tapping the same rating clears or reduces it
    if (rating === starIndex) {
      onRatingChange(starIndex - 0.5);
    } else if (rating === starIndex - 0.5) {
      onRatingChange(0);
    } else {
      onRatingChange(starIndex);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {stars.map((star) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'star-outline';
          if (rating >= star) {
            iconName = 'star';
          } else if (rating >= star - 0.5) {
            iconName = 'star-half';
          }

          if (readOnly) {
            return (
              <Ionicons
                key={star}
                name={iconName}
                size={size}
                color="#F59E0B"
                style={{ marginRight: 2 }}
              />
            );
          }

          return (
            <TouchableOpacity
              key={star}
              onPress={() => handlePress(star)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons
                name={iconName}
                size={size}
                color={rating >= star - 0.5 ? '#F59E0B' : '#D1D5DB'}
                style={{ marginRight: 2 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {showText && rating > 0 && (
        <Text style={styles.ratingText}>{rating.toFixed(1)} / 5</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
