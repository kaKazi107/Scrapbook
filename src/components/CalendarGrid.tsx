import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ActivityEntry, CategoryId } from '@/types/activity';
import { CATEGORIES } from '@/constants/categories';
import { toLocalDateString } from '@/utils/date';

interface CalendarGridProps {
  currentDate: Date; // Active month/year
  entries: ActivityEntry[];
  selectedCategory: CategoryId | 'all';
  onMonthChange: (newDate: Date) => void;
  onSelectDate: (dateStr: string) => void;
  onAddForDate: (dateStr: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({
  currentDate,
  entries,
  selectedCategory,
  onMonthChange,
  onSelectDate,
  onAddForDate,
}: CalendarGridProps) {
  const isDark = useColorScheme() === 'dark';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = useMemo(() => toLocalDateString(), []);

  // Group entries by YYYY-MM-DD
  const entriesByDate = useMemo(() => {
    const map: Record<string, ActivityEntry[]> = {};
    entries.forEach((e) => {
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return;
      if (!map[e.loggedDate]) {
        map[e.loggedDate] = [];
      }
      map[e.loggedDate].push(e);
    });
    return map;
  }, [entries, selectedCategory]);

  // Generate calendar days matrix
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${prevYear}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill grid to 35 or 42
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const mStr = String(nextMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${nextYear}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [year, month, firstDayOfWeek, daysInMonth, todayStr]);

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    onMonthChange(new Date());
  };

  return (
    <View style={styles.container}>
      {/* Month Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={isDark ? '#F3F4F6' : '#1F2937'} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleToday} activeOpacity={0.7} style={styles.monthTitleBtn}>
          <Text style={[styles.monthTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {monthName}
          </Text>
          <Text style={styles.todayBadge}>Today</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#F3F4F6' : '#1F2937'} />
        </TouchableOpacity>
      </View>

      {/* Weekday Row */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={[styles.weekdayText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {calendarDays.map((cell) => {
          const dayEntries = entriesByDate[cell.dateStr] || [];
          const hasEntries = dayEntries.length > 0;

          // Pick cover entry (isCover === true or first entry with image)
          const coverEntry =
            dayEntries.find((e) => e.isCover) || dayEntries.find((e) => e.imageUri) || dayEntries[0];

          return (
            <TouchableOpacity
              key={cell.dateStr}
              style={[
                styles.dayCell,
                {
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                },
                !cell.isCurrentMonth && { opacity: 0.35 },
                cell.isToday && { borderColor: '#3B82F6', borderWidth: 2 },
              ]}
              onPress={() => onSelectDate(cell.dateStr)}
              onLongPress={() => onAddForDate(cell.dateStr)}
              activeOpacity={0.7}
            >
              {/* Image poster background/thumbnail if available */}
              {hasEntries && coverEntry?.imageUri ? (
                <Image
                  source={{ uri: coverEntry.imageUri }}
                  style={styles.cellImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="disk"
                />
              ) : null}

              {/* Overlay shading for text readability if image exists */}
              {hasEntries && coverEntry?.imageUri && <View style={styles.imageOverlay} />}

              {/* Day Number Header */}
              <View style={styles.cellTop}>
                <Text
                  style={[
                    styles.dayNumberText,
                    {
                      color: hasEntries && coverEntry?.imageUri
                        ? '#FFFFFF'
                        : cell.isToday
                        ? '#3B82F6'
                        : isDark
                        ? '#F9FAFB'
                        : '#111827',
                      fontWeight: cell.isToday || hasEntries ? '700' : '500',
                    },
                  ]}
                >
                  {cell.dayNumber}
                </Text>

                {/* Counter Badge if > 1 item */}
                {dayEntries.length > 1 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>+{dayEntries.length - 1}</Text>
                  </View>
                )}
              </View>

              {/* Bottom Category Dots / Indicators */}
              <View style={styles.cellBottom}>
                {hasEntries && (
                  <View style={styles.dotsRow}>
                    {dayEntries.slice(0, 3).map((entry, idx) => {
                      const cat = CATEGORIES[entry.category] || CATEGORIES.movie;
                      const dotColor = isDark ? cat.darkColor : cat.color;
                      return (
                        <View
                          key={entry.id || idx}
                          style={[
                            styles.dot,
                            { backgroundColor: coverEntry?.imageUri ? '#FFFFFF' : dotColor },
                          ]}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  navBtn: {
    padding: 8,
    borderRadius: 8,
  },
  monthTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 7 columns
    aspectRatio: 0.85,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 4,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 1,
  },
  cellImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
  },
  cellTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  dayNumberText: {
    fontSize: 12,
  },
  countBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  cellBottom: {
    alignItems: 'center',
    zIndex: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
