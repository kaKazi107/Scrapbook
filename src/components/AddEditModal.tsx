import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityEntry, CategoryId, NewActivityEntry } from '@/types/activity';
import { CATEGORY_LIST, CATEGORIES } from '@/constants/categories';
import { RatingStars } from './RatingStars';
import { saveImageToLocalStorage } from '@/services/storage';
import { toLocalDateString, isValidDateString } from '@/utils/date';

interface AddEditModalProps {
  visible: boolean;
  initialDate?: string;
  entryToEdit?: ActivityEntry | null;
  onClose: () => void;
  onSave: (entry: NewActivityEntry | Partial<ActivityEntry>, isEdit: boolean) => Promise<void>;
}

export function AddEditModal({
  visible,
  initialDate,
  entryToEdit,
  onClose,
  onSave,
}: AddEditModalProps) {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<CategoryId>('movie');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [loggedDate, setLoggedDate] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [isCover, setIsCover] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (entryToEdit) {
        setCategory(entryToEdit.category);
        setTitle(entryToEdit.title);
        setSubtitle(entryToEdit.subtitle || '');
        setLoggedDate(entryToEdit.loggedDate);
        setRating(entryToEdit.rating || 0);
        setNote(entryToEdit.note || '');
        setImageUri(entryToEdit.imageUri);
        setIsCover(entryToEdit.isCover || false);
        setMetadata(entryToEdit.metadata || {});
      } else {
        const defaultDate = initialDate || toLocalDateString();
        setCategory('movie');
        setTitle('');
        setSubtitle('');
        setLoggedDate(defaultDate);
        setRating(0);
        setNote('');
        setImageUri(undefined);
        setIsCover(true); // default first entry of day as cover
        setMetadata({});
      }
    }
  }, [visible, entryToEdit, initialDate]);

  const activeCategoryDef = CATEGORIES[category];

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setImageUri(selectedUri);
    }
  };

  const handleTakeImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setImageUri(selectedUri);
    }
  };

  const handleMetadataChange = (key: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your memory/activity.');
      return;
    }

    // Validate Date format YYYY-MM-DD
    if (!isValidDateString(loggedDate)) {
      Alert.alert('Invalid Date', 'Please use a valid YYYY-MM-DD calendar date.');
      return;
    }

    try {
      setSubmitting(true);
      let permanentImageUri = imageUri;
      if (imageUri && !imageUri.startsWith('http')) {
        permanentImageUri = await saveImageToLocalStorage(imageUri);
      }

      // Clean empty metadata keys
      const cleanMetadata: Record<string, string> = {};
      Object.entries(metadata).forEach(([k, v]) => {
        if (v && v.trim()) cleanMetadata[k] = v.trim();
      });

      const payload = {
        category,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        loggedDate,
        rating: rating > 0 ? rating : undefined,
        note: note.trim() || undefined,
        imageUri: permanentImageUri,
        isCover,
        metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined,
      };

      await onSave(payload, !!entryToEdit);
      onClose();
    } catch (err: any) {
      Alert.alert('Error Saving', err?.message || 'Failed to save entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FFFFFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: isDark ? '#374151' : '#E5E7EB',
              paddingTop: insets.top > 0 ? insets.top + 8 : 16,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Cancel</Text>
          </TouchableOpacity>

          <Text style={[styles.modalTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {entryToEdit ? 'Edit Memory' : 'Log Activity'}
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            disabled={submitting}
            style={[styles.saveBtn, { backgroundColor: activeCategoryDef.color }]}
          >
            <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Category Selector */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>CATEGORY</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_LIST.map((cat) => {
              const isSelected = category === cat.id;
              const catColor = isDark ? cat.darkColor : cat.color;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catOption,
                    {
                      backgroundColor: isSelected ? catColor : isDark ? '#1F2937' : '#F3F4F6',
                      borderColor: isSelected ? catColor : isDark ? '#374151' : '#E5E7EB',
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons name={cat.icon as any} size={16} color={isSelected ? '#FFFFFF' : catColor} />
                  <Text style={[styles.catOptionText, { color: isSelected ? '#FFFFFF' : isDark ? '#D1D5DB' : '#374151' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Photo/Cover Picker */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>POSTER / PHOTO</Text>
          <View style={styles.photoContainer}>
            {imageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(undefined)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtonsRow}>
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                  onPress={handlePickImage}
                >
                  <Ionicons name="images-outline" size={20} color={activeCategoryDef.color} />
                  <Text style={[styles.photoBtnText, { color: isDark ? '#D1D5DB' : '#374151' }]}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                  onPress={handleTakeImage}
                >
                  <Ionicons name="camera-outline" size={20} color={activeCategoryDef.color} />
                  <Text style={[styles.photoBtnText, { color: isDark ? '#D1D5DB' : '#374151' }]}>Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Core Info Inputs */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>DETAILS</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: isDark ? '#F9FAFB' : '#111827', borderColor: isDark ? '#374151' : '#E5E7EB' },
            ]}
            placeholder="Title (e.g. Dune Part 2, Ramen Nagi)"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[
              styles.input,
              { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: isDark ? '#F9FAFB' : '#111827', borderColor: isDark ? '#374151' : '#E5E7EB' },
            ]}
            placeholder="Subtitle (e.g. Director, Artist, Location)"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={subtitle}
            onChangeText={setSubtitle}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: isDark ? '#F9FAFB' : '#111827', borderColor: isDark ? '#374151' : '#E5E7EB' },
                ]}
                value={loggedDate}
                onChangeText={setLoggedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Rating */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>RATING</Text>
          <View style={styles.ratingBox}>
            <RatingStars rating={rating} onRatingChange={setRating} size={28} showText />
          </View>

          {/* Category-Specific Metadata Fields */}
          {activeCategoryDef.fields.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>
                {activeCategoryDef.label.toUpperCase()} EXTRAS
              </Text>
              {activeCategoryDef.fields.map((field) => (
                <TextInput
                  key={field.key}
                  style={[
                    styles.input,
                    { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: isDark ? '#F9FAFB' : '#111827', borderColor: isDark ? '#374151' : '#E5E7EB' },
                  ]}
                  placeholder={field.placeholder}
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={metadata[field.key] || ''}
                  onChangeText={(val) => handleMetadataChange(field.key, val)}
                />
              ))}
            </>
          )}

          {/* Note / Memory Journal */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>MEMORY / NOTE</Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: isDark ? '#F9FAFB' : '#111827', borderColor: isDark ? '#374151' : '#E5E7EB' },
            ]}
            placeholder="Write a memory, thought, or review of this experience..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
            textAlignVertical="top"
          />

          {/* Set as Day Cover Toggle */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIsCover(!isCover)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isCover ? 'checkbox' : 'square-outline'}
              size={22}
              color={isCover ? activeCategoryDef.color : isDark ? '#9CA3AF' : '#6B7280'}
            />
            <Text style={[styles.checkboxLabel, { color: isDark ? '#F9FAFB' : '#111827' }]}>
              Feature as Cover Poster for {loggedDate}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  catOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  photoContainer: {
    marginVertical: 4,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 100,
    height: 130,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingBox: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 90,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
