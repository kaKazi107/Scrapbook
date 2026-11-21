import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityEntry, CategoryId, NewActivityEntry } from '@/types/activity';
import { MetadataSearchResult, ExternalSource } from '@/types/metadata';
import { CATEGORY_LIST, CATEGORIES } from '@/constants/categories';
import { RatingStars } from './RatingStars';
import { MetadataSearchSheet } from './MetadataSearchSheet';
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCover, setIsCover] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [externalId, setExternalId] = useState<string | undefined>();
  const [externalSource, setExternalSource] = useState<ExternalSource | undefined>();
  const [searchSheetVisible, setSearchSheetVisible] = useState(false);
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
        setPhotos(entryToEdit.photos ?? []);
        setIsCover(entryToEdit.isCover || false);
        setMetadata(entryToEdit.metadata || {});
        setExternalId(entryToEdit.externalId);
        setExternalSource(entryToEdit.externalSource as ExternalSource | undefined);
      } else {
        const defaultDate = initialDate || toLocalDateString();
        setCategory('movie');
        setTitle('');
        setSubtitle('');
        setLoggedDate(defaultDate);
        setRating(0);
        setNote('');
        setImageUri(undefined);
        setPhotos([]);
        setIsCover(true); // default first entry of day as cover
        setMetadata({});
        setExternalId(undefined);
        setExternalSource(undefined);
      }
    }
  }, [visible, entryToEdit, initialDate]);

  const activeCategoryDef = CATEGORIES[category];

  const handleCategoryChange = (newCategory: CategoryId) => {
    if (newCategory === category) return;
    // Clear auto-filled identifiers from a different category
    setExternalId(undefined);
    setExternalSource(undefined);
    setCategory(newCategory);
  };

  const handleSelectMetadataResult = (result: MetadataSearchResult) => {
    setTitle(result.title);
    setSubtitle(result.subtitle || '');
    setExternalId(result.externalId);
    setExternalSource(result.externalSource);

    // Merge auto-filled fields into metadata (keeps any manual edits for other keys)
    setMetadata((prev) => ({ ...prev, ...result.metadata }));

    // Only set the poster if the user hasn't already picked a personal photo
    if (result.fullImageUrl && !imageUri) {
      setImageUri(result.fullImageUrl);
    }

    setSearchSheetVisible(false);
  };

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

  /** Adds one or more personal photos (poster/cover stays untouched). */
  const handleAddPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleAddPhotoFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });

    if (!result.canceled && result.assets?.length) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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

      // Persist any newly picked photos; already-stored ones are returned as-is.
      const permanentPhotos: string[] = [];
      for (const photo of photos) {
        permanentPhotos.push(
          photo.startsWith('http') ? photo : await saveImageToLocalStorage(photo)
        );
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
        photos: permanentPhotos,
        isCover,
        externalId,
        externalSource,
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
                  onPress={() => handleCategoryChange(cat.id)}
                >
                  <Ionicons name={cat.icon as any} size={16} color={isSelected ? '#FFFFFF' : catColor} />
                  <Text style={[styles.catOptionText, { color: isSelected ? '#FFFFFF' : isDark ? '#D1D5DB' : '#374151' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cover / poster */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>COVER (POSTER)</Text>
          <View style={styles.photoContainer}>
            {imageUri ? (
              <View style={styles.imagePreviewWrapper}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(undefined)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Always available, so an auto-filled poster can be replaced with your own photo. */}
            <View style={[styles.photoButtonsRow, imageUri ? styles.photoButtonsRowSpaced : null]}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                onPress={handlePickImage}
              >
                <Ionicons name="images-outline" size={20} color={activeCategoryDef.color} />
                <Text style={[styles.photoBtnText, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                  {imageUri ? 'Replace' : 'Gallery'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                onPress={handleTakeImage}
              >
                <Ionicons name="camera-outline" size={20} color={activeCategoryDef.color} />
                <Text style={[styles.photoBtnText, { color: isDark ? '#D1D5DB' : '#374151' }]}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Personal photos (kept alongside the poster) */}
          <Text style={[styles.sectionLabel, { color: isDark ? '#9CA3AF' : '#4B5563' }]}>
            PHOTOS{photos.length > 0 ? ` (${photos.length})` : ''}
          </Text>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosStrip}
            >
              {photos.map((photo, index) => (
                <View key={`${photo}-${index}`} style={styles.photoThumbWrapper}>
                  <Image source={{ uri: photo }} style={styles.photoThumb} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(index)}
                    accessibilityLabel="Remove photo"
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={[styles.photoButtonsRow, photos.length > 0 ? styles.photoButtonsRowSpaced : null]}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
              onPress={handleAddPhotos}
            >
              <Ionicons name="add-circle-outline" size={20} color={activeCategoryDef.color} />
              <Text style={[styles.photoBtnText, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                Add photos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
              onPress={handleAddPhotoFromCamera}
            >
              <Ionicons name="camera-outline" size={20} color={activeCategoryDef.color} />
              <Text style={[styles.photoBtnText, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                Shoot
              </Text>
            </TouchableOpacity>
          </View>

          {/* Auto-fill from metadata provider */}
          <TouchableOpacity
            style={[
              styles.autoFillBtn,
              {
                backgroundColor: isDark ? activeCategoryDef.darkColor + '22' : activeCategoryDef.color + '14',
                borderColor: isDark ? activeCategoryDef.darkColor + '55' : activeCategoryDef.color + '44',
              },
            ]}
            onPress={() => setSearchSheetVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="sparkles-outline"
              size={18}
              color={isDark ? activeCategoryDef.darkColor : activeCategoryDef.color}
            />
            <View style={styles.autoFillTextWrap}>
              <Text
                style={[
                  styles.autoFillTitle,
                  { color: isDark ? activeCategoryDef.darkColor : activeCategoryDef.color },
                ]}
              >
                Search {activeCategoryDef.label} to auto-fill
              </Text>
              <Text style={[styles.autoFillHint, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                {externalSource ? `Linked via ${externalSource.toUpperCase()}` : 'Poster, title, and details'}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? activeCategoryDef.darkColor : activeCategoryDef.color}
            />
          </TouchableOpacity>

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

        <MetadataSearchSheet
          visible={searchSheetVisible}
          category={category}
          initialQuery={title}
          onClose={() => setSearchSheetVisible(false)}
          onSelectResult={handleSelectMetadataResult}
        />
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
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  autoFillTextWrap: {
    flex: 1,
  },
  autoFillTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  autoFillHint: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
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
  photoButtonsRowSpaced: {
    marginTop: 12,
  },
  photosStrip: {
    gap: 10,
    paddingVertical: 2,
  },
  photoThumbWrapper: {
    position: 'relative',
  },
  photoThumb: {
    width: 78,
    height: 78,
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
