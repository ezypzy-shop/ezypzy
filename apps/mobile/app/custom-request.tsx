import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Camera,
  ImageIcon,
  Link as LinkIcon,
  Truck,
  MapPin,
  Plus,
  Trash2,
  X,
  ShoppingBag,
  Store,
  ChevronRight,
  CheckCircle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '@/utils/useUpload';
import { useCartStore, useUserStore } from '@/lib/store';
import { createCustomOrder, fetchBusinesses } from '@/lib/api';

type InputMethod = 'list' | 'photo' | 'link';

type ListItem = {
  id: string;
  name: string;
  quantity: string;
};

type Business = {
  id: number;
  name: string;
  image: string;
  type: string;
  order_mode?: 'catalog' | 'custom' | 'both';
};

export default function CustomRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useUserStore();
  const [upload, { loading: uploadLoading }] = useUpload();
  const { addCustomOrder } = useCartStore();

  // Input method selection
  const [selectedMethod, setSelectedMethod] = useState<InputMethod | null>(null);

  // Business selection
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [showBusinessPicker, setShowBusinessPicker] = useState(false);

  // Manual list state
  const [listItems, setListItems] = useState<ListItem[]>([
    { id: '1', name: '', quantity: '1' },
  ]);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Photo upload state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [photoNotes, setPhotoNotes] = useState('');

  // Link/URL state
  const [orderLink, setOrderLink] = useState('');
  const [linkNotes, setLinkNotes] = useState('');

  // Delivery preference
  const [deliveryPreference, setDeliveryPreference] = useState<'delivery' | 'pickup'>('delivery');

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    // If business_id is passed, pre-select it
    if (params.business_id && businesses.length > 0) {
      const business = businesses.find(b => b.id === Number(params.business_id));
      if (business) {
        setSelectedBusiness(business);
      }
    }
  }, [params.business_id, businesses]);

  const loadBusinesses = async () => {
    try {
      const data = await fetchBusinesses();
      // Filter to only show businesses that accept custom orders
      const customOrderBusinesses = data.filter(
        (b: Business) => b.order_mode === 'custom' || b.order_mode === 'both' || !b.order_mode
      );
      setBusinesses(customOrderBusinesses);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  // List item handlers
  const addListItem = () => {
    setListItems([
      ...listItems,
      { id: Date.now().toString(), name: '', quantity: '1' },
    ]);
  };

  const updateListItem = (id: string, field: 'name' | 'quantity', value: string) => {
    setListItems(items =>
      items.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeListItem = (id: string) => {
    if (listItems.length > 1) {
      setListItems(items => items.filter(item => item.id !== id));
    }
  };

  // Photo handlers
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      for (const asset of result.assets) {
        const uploadResult = await upload({ reactNativeAsset: asset });
        if (uploadResult.url) {
          setUploadedImages(prev => [...prev, uploadResult.url!]);
        }
      }
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uploadResult = await upload({ reactNativeAsset: result.assets[0] });
      if (uploadResult.url) {
        setUploadedImages(prev => [...prev, uploadResult.url!]);
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Build description based on input method
  const buildDescription = (): string => {
    if (selectedMethod === 'list') {
      const itemsList = listItems
        .filter(item => item.name.trim())
        .map(item => `${item.quantity}x ${item.name}`)
        .join('\n');
      return additionalNotes
        ? `Shopping List:\n${itemsList}\n\nNotes: ${additionalNotes}`
        : `Shopping List:\n${itemsList}`;
    } else if (selectedMethod === 'photo') {
      return photoNotes || 'Please see attached photos for my shopping list';
    } else if (selectedMethod === 'link') {
      return `Order from link: ${orderLink}\n\n${linkNotes ? `Notes: ${linkNotes}` : ''}`;
    }
    return '';
  };

  // Validation
  const isValid = (): boolean => {
    if (!selectedBusiness) return false;

    if (selectedMethod === 'list') {
      return listItems.some(item => item.name.trim().length > 0);
    } else if (selectedMethod === 'photo') {
      return uploadedImages.length > 0;
    } else if (selectedMethod === 'link') {
      return orderLink.trim().length > 0;
    }
    return false;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!isValid() || !selectedBusiness) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const description = buildDescription();
      const imageUrl = uploadedImages.length > 0 ? uploadedImages[0] : undefined;

      // Save to server if user is logged in
      if (user?.id) {
        await createCustomOrder({
          user_id: user.id,
          business_id: selectedBusiness.id,
          description,
          image_url: imageUrl,
          delivery_preference: deliveryPreference,
        });
      }

      // Add to local cart state
      addCustomOrder({
        business_id: selectedBusiness.id,
        business_name: selectedBusiness.name,
        business_image: selectedBusiness.image,
        description,
        image_url: imageUrl,
        delivery_preference: deliveryPreference,
      });

      Alert.alert(
        'Request Submitted! 🎉',
        deliveryPreference === 'delivery'
          ? "Your shopping list has been sent. You'll get the estimate when items are delivered."
          : "Your shopping list has been sent. You'll get the estimate when you pickup.",
        [
          { text: 'View Cart', onPress: () => router.push('/(modals)/cart') },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMethodSelector = () => (
    <View style={styles.methodSelector}>
      <Text style={styles.sectionTitle}>How would you like to add your order?</Text>

      <TouchableOpacity
        style={[styles.methodCard, selectedMethod === 'list' && styles.methodCardSelected]}
        onPress={() => setSelectedMethod('list')}
      >
        <View style={[styles.methodIcon, selectedMethod === 'list' && styles.methodIconSelected]}>
          <FileText size={24} color={selectedMethod === 'list' ? '#ffffff' : '#f97316'} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>Type Your List</Text>
          <Text style={styles.methodSubtitle}>Add items one by one with quantities</Text>
        </View>
        {selectedMethod === 'list' && <CheckCircle size={20} color="#f97316" />}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.methodCard, selectedMethod === 'photo' && styles.methodCardSelected]}
        onPress={() => setSelectedMethod('photo')}
      >
        <View style={[styles.methodIcon, selectedMethod === 'photo' && styles.methodIconSelected]}>
          <Camera size={24} color={selectedMethod === 'photo' ? '#ffffff' : '#f97316'} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>Upload Photo</Text>
          <Text style={styles.methodSubtitle}>Take or upload a photo of your list</Text>
        </View>
        {selectedMethod === 'photo' && <CheckCircle size={20} color="#f97316" />}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.methodCard, selectedMethod === 'link' && styles.methodCardSelected]}
        onPress={() => setSelectedMethod('link')}
      >
        <View style={[styles.methodIcon, selectedMethod === 'link' && styles.methodIconSelected]}>
          <LinkIcon size={24} color={selectedMethod === 'link' ? '#ffffff' : '#f97316'} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={styles.methodTitle}>Share Order Link</Text>
          <Text style={styles.methodSubtitle}>Paste a link from another website</Text>
        </View>
        {selectedMethod === 'link' && <CheckCircle size={20} color="#f97316" />}
      </TouchableOpacity>
    </View>
  );

  const renderListInput = () => (
    <View style={styles.inputSection}>
      <Text style={styles.sectionTitle}>Your Shopping List</Text>

      {listItems.map((item, index) => (
        <View key={item.id} style={styles.listItemRow}>
          <View style={styles.quantityInputContainer}>
            <TextInput
              style={styles.quantityInput}
              placeholder="Qty"
              placeholderTextColor="#9ca3af"
              value={item.quantity}
              onChangeText={value => updateListItem(item.id, 'quantity', value)}
              keyboardType="numeric"
            />
          </View>
          <TextInput
            style={styles.itemNameInput}
            placeholder={`Item ${index + 1} (e.g., Milk 1L, Bread)`}
            placeholderTextColor="#9ca3af"
            value={item.name}
            onChangeText={value => updateListItem(item.id, 'name', value)}
          />
          {listItems.length > 1 && (
            <TouchableOpacity
              style={styles.removeItemButton}
              onPress={() => removeListItem(item.id)}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addItemButton} onPress={addListItem}>
        <Plus size={18} color="#f97316" />
        <Text style={styles.addItemText}>Add Another Item</Text>
      </TouchableOpacity>

      <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Any special instructions, brand preferences, etc."
        placeholderTextColor="#9ca3af"
        value={additionalNotes}
        onChangeText={setAdditionalNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );

  const renderPhotoInput = () => (
    <View style={styles.inputSection}>
      <Text style={styles.sectionTitle}>Upload Your List</Text>
      <Text style={styles.sectionSubtitle}>
        Take a photo or upload an image of your shopping list
      </Text>

      {uploadedImages.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagePreviewScroll}
        >
          {uploadedImages.map((uri, index) => (
            <View key={index} style={styles.imagePreviewContainer}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <X size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {uploadLoading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator color="#f97316" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      <View style={styles.photoButtons}>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handleTakePhoto}
          disabled={uploadLoading}
        >
          <Camera size={24} color="#f97316" />
          <Text style={styles.photoButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickImage}
          disabled={uploadLoading}
        >
          <ImageIcon size={24} color="#f97316" />
          <Text style={styles.photoButtonText}>From Gallery</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Any details about the photo or special requests"
        placeholderTextColor="#9ca3af"
        value={photoNotes}
        onChangeText={setPhotoNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );

  const renderLinkInput = () => (
    <View style={styles.inputSection}>
      <Text style={styles.sectionTitle}>Share Order Link</Text>
      <Text style={styles.sectionSubtitle}>
        Paste a link from any website and we'll get those items for you
      </Text>

      <TextInput
        style={styles.linkInput}
        placeholder="Paste your order link here..."
        placeholderTextColor="#9ca3af"
        value={orderLink}
        onChangeText={setOrderLink}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Any special instructions about the order"
        placeholderTextColor="#9ca3af"
        value={linkNotes}
        onChangeText={setLinkNotes}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );

  const renderBusinessPicker = () => (
    <View style={styles.businessSection}>
      <Text style={styles.sectionTitle}>Select Store</Text>

      {loadingBusinesses ? (
        <ActivityIndicator color="#f97316" style={{ marginVertical: 20 }} />
      ) : selectedBusiness && !showBusinessPicker ? (
        <TouchableOpacity
          style={styles.selectedBusinessCard}
          onPress={() => setShowBusinessPicker(true)}
        >
          <Image source={{ uri: selectedBusiness.image }} style={styles.businessImage} />
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{selectedBusiness.name}</Text>
            <Text style={styles.businessType}>{selectedBusiness.type}</Text>
          </View>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.businessList}>
          {businesses.map(business => (
            <TouchableOpacity
              key={business.id}
              style={[
                styles.businessOption,
                selectedBusiness?.id === business.id && styles.businessOptionSelected,
              ]}
              onPress={() => {
                setSelectedBusiness(business);
                setShowBusinessPicker(false);
              }}
            >
              <Image source={{ uri: business.image }} style={styles.businessOptionImage} />
              <View style={styles.businessOptionInfo}>
                <Text style={styles.businessOptionName}>{business.name}</Text>
                <Text style={styles.businessOptionType}>{business.type}</Text>
              </View>
              {selectedBusiness?.id === business.id && (
                <CheckCircle size={20} color="#f97316" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderDeliveryOptions = () => (
    <View style={styles.deliverySection}>
      <Text style={styles.sectionTitle}>Delivery Preference</Text>

      <View style={styles.deliveryOptions}>
        <TouchableOpacity
          style={[
            styles.deliveryOption,
            deliveryPreference === 'delivery' && styles.deliveryOptionSelected,
          ]}
          onPress={() => setDeliveryPreference('delivery')}
        >
          <Truck
            size={22}
            color={deliveryPreference === 'delivery' ? '#f97316' : '#6b7280'}
          />
          <Text
            style={[
              styles.deliveryOptionText,
              deliveryPreference === 'delivery' && styles.deliveryOptionTextSelected,
            ]}
          >
            Delivery
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.deliveryOption,
            deliveryPreference === 'pickup' && styles.deliveryOptionSelected,
          ]}
          onPress={() => setDeliveryPreference('pickup')}
        >
          <MapPin
            size={22}
            color={deliveryPreference === 'pickup' ? '#f97316' : '#6b7280'}
          />
          <Text
            style={[
              styles.deliveryOptionText,
              deliveryPreference === 'pickup' && styles.deliveryOptionTextSelected,
            ]}
          >
            Pickup
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>💡 How it works</Text>
        <Text style={styles.infoBoxText}>
          {deliveryPreference === 'delivery'
            ? "The store will review your list and prepare your order. You'll receive the final price when items are delivered."
            : "The store will review your list and prepare your order. You'll receive the final price when you arrive for pickup."}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <ShoppingBag size={32} color="#f97316" />
            </View>
            <Text style={styles.heroTitle}>Add Your Shopping List</Text>
            <Text style={styles.heroSubtitle}>
              Type your list, upload a photo, or share a link from any website
            </Text>
          </View>

          {/* Method Selector */}
          {renderMethodSelector()}

          {/* Input Based on Method */}
          {selectedMethod === 'list' && renderListInput()}
          {selectedMethod === 'photo' && renderPhotoInput()}
          {selectedMethod === 'link' && renderLinkInput()}

          {/* Business Picker - Show after method is selected */}
          {selectedMethod && renderBusinessPicker()}

          {/* Delivery Options - Show after business is selected */}
          {selectedMethod && selectedBusiness && renderDeliveryOptions()}

          {/* Bottom Padding */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      {selectedMethod && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (!isValid() || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Request</Text>
                <ChevronRight size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#fff7ed',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  methodSelector: {
    padding: 16,
    columnGap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    marginTop: -8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  methodCardSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconSelected: {
    backgroundColor: '#f97316',
  },
  methodInfo: {
    flex: 1,
    marginLeft: 14,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  inputSection: {
    padding: 16,
    borderTopWidth: 8,
    borderTopColor: '#f3f4f6',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    columnGap: 10,
  },
  quantityInputContainer: {
    width: 60,
  },
  quantityInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    textAlign: 'center',
  },
  itemNameInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  removeItemButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 20,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderStyle: 'dashed',
    columnGap: 8,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imagePreviewScroll: {
    marginBottom: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
    paddingVertical: 16,
  },
  uploadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  photoButtons: {
    flexDirection: 'row',
    columnGap: 12,
    marginBottom: 20,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#fed7aa',
    rowGap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  linkInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },
  businessSection: {
    padding: 16,
    borderTopWidth: 8,
    borderTopColor: '#f3f4f6',
  },
  selectedBusinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  businessImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  businessInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  businessType: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f97316',
  },
  businessList: {
    columnGap: 8,
  },
  businessOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  businessOptionSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  businessOptionImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  businessOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  businessOptionType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  deliverySection: {
    padding: 16,
    borderTopWidth: 8,
    borderTopColor: '#f3f4f6',
  },
  deliveryOptions: {
    flexDirection: 'row',
    columnGap: 12,
  },
  deliveryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  deliveryOptionSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  deliveryOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  deliveryOptionTextSelected: {
    color: '#f97316',
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 6,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#15803d',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
    columnGap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
