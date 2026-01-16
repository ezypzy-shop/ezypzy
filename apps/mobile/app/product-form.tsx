import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { fetchProductById, updateProduct, createProduct } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '@/utils/useUpload';
import { toast } from 'sonner-native';

// Category options
const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Kitchen',
  'Beauty',
  'Sports',
  'Books',
  'Toys',
  'Food',
  'Health',
  'Other'
];

export default function ProductFormScreen() {
  const router = useRouter();
  const { businessId, productId } = useLocalSearchParams();
  const { isLoggedIn } = useUserStore();
  const [upload, { loading: uploadLoading }] = useUpload();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState('');
  const [inStock, setInStock] = useState(true);
  const [featured, setFeatured] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/sign-in');
      return;
    }

    if (productId) {
      loadProduct();
    }
  }, [productId, isLoggedIn]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const product = await fetchProductById(Number(productId));
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price.toString());
      setCategory(product.category || '');
      setImage(product.image || '');
      setInStock(product.in_stock);
      setFeatured(product.featured || false);
    } catch (error) {
      console.error('[API] Error loading product:', error);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uploadResult = await upload({ reactNativeAsset: result.assets[0] });
      if (uploadResult.url) {
        setImage(uploadResult.url);
      }
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast.error('Please enter product name');
      return false;
    }

    if (!price || isNaN(parseFloat(price))) {
      toast.error('Please enter valid price');
      return false;
    }

    if (!category) {
      toast.error('Please select a category');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        image,
        in_stock: inStock,
        featured,
      };

      if (productId) {
        await updateProduct({ id: Number(productId), ...productData });
        toast.success('Product updated successfully!');
      } else {
        await createProduct({ business_id: Number(businessId), ...productData });
        toast.success('Product created successfully!');
      }

      router.back();
    } catch (error: any) {
      console.error('[API] Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
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
          {productId ? 'Edit Product' : 'Add Product'}
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
              <Text style={styles.imagePlaceholderText}>Add Product Image</Text>
            </View>
          )}
          {uploadLoading && (
            <View style={styles.imageOverlay}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Product Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter product name"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Product description..."
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipSelected
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[
                  styles.categoryChipText,
                  category === cat && styles.categoryChipTextSelected
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* In Stock Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>In Stock</Text>
            <Text style={styles.toggleHint}>Product is available for purchase</Text>
          </View>
          <Switch
            value={inStock}
            onValueChange={setInStock}
            trackColor={{ false: '#e5e7eb', true: '#bbf7d0' }}
            thumbColor={inStock ? '#22c55e' : '#9ca3af'}
          />
        </View>

        {/* Featured Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Featured Product</Text>
            <Text style={styles.toggleHint}>Display on homepage</Text>
          </View>
          <Switch
            value={featured}
            onValueChange={setFeatured}
            trackColor={{ false: '#e5e7eb', true: '#fed7aa' }}
            thumbColor={featured ? '#f97316' : '#9ca3af'}
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
              {productId ? 'Update Product' : 'Create Product'}
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
    height: 200,
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
  categoryList: {
    paddingVertical: 8,
    columnGap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryChipSelected: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryChipTextSelected: {
    color: '#ffffff',
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
