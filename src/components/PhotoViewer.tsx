import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PhotoViewerProps {
  visible: boolean;
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Full-screen, swipeable viewer for an entry's personal photos.
 * Doubles as the "inside" gallery when a poster is kept as the cover.
 */
export function PhotoViewer({ visible, photos, initialIndex = 0, onClose }: PhotoViewerProps) {
  const { width, height } = Dimensions.get('window');
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  if (!visible || photos.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(item, i) => `${item}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: 'center' }}>
              <Image
                source={{ uri: item }}
                style={{ width, height: height * 0.8 }}
                contentFit="contain"
              />
            </View>
          )}
        />

        <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Text style={styles.counter}>
              {photos.length > 1 ? `${index + 1} / ${photos.length}` : ''}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close photos">
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  counter: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '600',
  },
});
