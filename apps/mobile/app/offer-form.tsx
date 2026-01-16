import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, X, Check } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { fetchAdById, updateAd, createAd, fetchProducts } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '@/utils/useUpload';
import { toast } from 'sonner-native';

export default function OfferFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Accept both 'id' (business ID) and 'offerId' (ad ID for editing)
  const businessId = params.businessId || params.id;
  const adId = params.offerId || params.adId;
  const { isLoggedIn } = useUserStore();
  const [upload, { loading: uploadLoading }] = useUpload();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [image, setImage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/sign-in');
      return;
    }

    if (businessId) {
      loadProducts();
    }

    if (adId) {
      loadAd();
    }
  }, [adId, isLoggedIn, businessId]);

  const loadProducts = async () => {
    try {
      console.log('[Offer Form] Loading products for business:', businessId);
      const productsData = await fetchProducts(Number(businessId));
      console.log('[Offer Form] Products loaded:', productsData?.length || 0);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadAd = async () => {
    try {
      setLoading(true);
      const ad = await fetchAdById(Number(adId));
      setTitle(ad.title);
      setDescription(ad.description || '');
      setDiscountText(ad.discount_text || '');
      setOriginalPrice(ad.original_price?.toString() || '');
      setDiscountedPrice(ad.discounted_price?.toString() || '');
      setImage(ad.image || '');
      setStartDate(ad.start_date || '');
      setEndDate(ad.end_date || '');
      setIsActive(ad.is_active);
      
      // Parse product_ids
      if (ad.product_ids) {
        let productIds = [];
        if (typeof ad.product_ids === 'string') {
          productIds = JSON.parse(ad.product_ids);
        } else if (Array.isArray(ad.product_ids)) {
          productIds = ad.product_ids;
        }
        setSelectedProductIds(productIds);
      }
    } catch (error) {
      console.error('Error loading ad:', error);
      toast.error('Failed to load offer');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uploadResult = await upload({ reactNativeAsset: result.assets[0] });
      if (uploadResult.url) {
        setImage(uploadResult.url);
      }
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast.error('Please enter offer title');
      return false;
    }

    if (selectedProductIds.length === 0) {
      toast.error('Please select at least one product');
      return false;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        toast.error('End date must be after start date');
        return false;
      }
    }

    if (originalPrice && discountedPrice) {
      const original = parseFloat(originalPrice);
      const discounted = parseFloat(discountedPrice);
      
      if (isNaN(original) || isNaN(discounted)) {
        toast.error('Please enter valid prices');
        return false;
      }
      
      if (discounted >= original) {
        toast.error('Discounted price must be lower than original price');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const adData = {
        business_id: Number(businessId),
        title: title.trim(),
        description: description.trim(),
        discount_text: discountText.trim(),
        original_price: originalPrice ? parseFloat(originalPrice) : undefined,
        discounted_price: discountedPrice ? parseFloat(discountedPrice) : undefined,
        image: image || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        is_active: isActive,
        product_ids: selectedProductIds,
      };

      if (adId) {
        await updateAd({ id: Number(adId), ...adData });
        toast.success('Offer updated successfully!');
      } else {
        await createAd(adData);
        toast.success('Offer created successfully!');
      }

      router.back();
    } catch (error: any) {
      console.error('Error saving ad:', error);
      toast.error(error.message || 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {adId ? 'Edit Offer' : 'Create Offer'}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Picker */}
        <TouchableOpacity 
          style={styles.imagePickerContainer} 
          onPress={handleImagePick}
          disabled={uploadLoading}
        >
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Camera size={40} color="#9ca3af" />
              <Text style={styles.imagePlaceholderText}>Add Banner Image</Text>
            </View>
          )}
          {uploadLoading && (
            <View style={styles.imageOverlay}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Offer Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Summer Sale, Buy 1 Get 1 Free"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add more details about your offer..."
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Discount Text */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Discount Text</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 50% OFF, Special Price"
            placeholderTextColor="#9ca3af"
            value={discountText}
            onChangeText={setDiscountText}
          />
        </View>

        {/* Prices */}
        <View style={styles.priceRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Original Price (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="150"
              placeholderTextColor="#9ca3af"
              value={originalPrice}
              onChangeText={setOriginalPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Discounted Price (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="120"
              placeholderTextColor="#9ca3af"
              value={discountedPrice}
              onChangeText={setDiscountedPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Dates */}
        <View style={styles.priceRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>

        {/* Product Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Select Products * ({selectedProductIds.length} selected)
          </Text>
          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No products available</Text>
              <Text style={styles.emptyHint}>Add products to your business first</Text>
            </View>
          ) : (
            <View style={styles.productList}>
              {products.map((product) => {
                const isSelected = selectedProductIds.includes(product.id);
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productItem, isSelected && styles.productItemSelected]}
                    onPress={() => toggleProductSelection(product.id)}
                  >
                    <View style={styles.productInfo}>
                      {product.image && (
                        <Image 
                          source={{ uri: product.image }} 
                          style={styles.productImage}
                        />
                      )}
                      <View style={styles.productDetails}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.productPrice}>₹{product.price}</Text>
                      </View>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Check size={16} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Active Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Active</Text>
            <Text style={styles.toggleHint}>Show this offer on home screen</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#e5e7eb', true: '#bbf7d0' }}
            thumbColor={isActive ? '#22c55e' : '#9ca3af'}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {adId ? 'Update Offer' : 'Create Offer'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    columnGap: 12,
  },
  productList: {
    columnGap: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  productItemSelected: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    columnGap: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
    color: '#6b7280',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: '#9ca3af',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  toggleHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
