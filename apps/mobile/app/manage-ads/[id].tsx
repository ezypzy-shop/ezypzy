import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, TextInput, Modal, Switch, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Edit2, Trash2, X, Camera, Megaphone, Eye, EyeOff, Calendar, Package, Tag, ImageIcon, Video } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { fetchBusinessAds, createAd, updateAd, deleteAd, fetchProducts, createProduct } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '@/utils/useUpload';
import { toast } from 'sonner-native';
import { getUniqueOfferImage } from '@/lib/unique-images';

type Product = {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  image?: string;
  images?: string;
  video?: string;
  category?: string;
  description?: string;
};

type Ad = {
  id: number;
  product_ids?: number[];
  title: string;
  description: string;
  image: string;
  discount_text: string;
  original_price?: number;
  discounted_price?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  business_name?: string;
};

export default function ManageAdsScreen() {
  const router = useRouter();
  const { id: businessId } = useLocalSearchParams();
  const { isLoggedIn } = useUserStore();
  const [upload, { loading: uploadLoading }] = useUpload();
  
  const [ads, setAds] = useState<Ad[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [createProductModalVisible, setCreateProductModalVisible] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // New product form
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductOriginalPrice, setNewProductOriginalPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [newProductVideo, setNewProductVideo] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/sign-in');
      return;
    }
    loadData();
  }, [businessId, isLoggedIn]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adsData, productsData] = await Promise.all([
        fetchBusinessAds(Number(businessId)),
        fetchProducts(Number(businessId)),
      ]);
      setAds(adsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProductIds([]);
    setTitle('');
    setDescription('');
    setImage('');
    setDiscountText('');
    setOriginalPrice('');
    setDiscountedPrice('');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setEditingAd(null);
  };

  const resetNewProductForm = () => {
    setNewProductName('');
    setNewProductDescription('');
    setNewProductPrice('');
    setNewProductOriginalPrice('');
    setNewProductCategory('');
    setNewProductImages([]);
    setNewProductVideo('');
  };

  const openAddModal = () => {
    if (ads.length >= 1) {
      Alert.alert('Ad Limit Reached', 'Each business can only create 1 ad at a time. Please delete the existing ad first.');
      return;
    }
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (ad: Ad) => {
    setEditingAd(ad);
    setSelectedProductIds(ad.product_ids || []);
    setTitle(ad.title);
    setDescription(ad.description || '');
    setImage(ad.image || '');
    setDiscountText(ad.discount_text || '');
    setOriginalPrice(ad.original_price?.toString() || '');
    setDiscountedPrice(ad.discounted_price?.toString() || '');
    // Dates are read-only when editing
    setStartDate(ad.start_date || '');
    setEndDate(ad.end_date || '');
    setIsActive(ad.is_active);
    setModalVisible(true);
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

  const handleNewProductImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uploadPromises = result.assets.map(asset => 
        upload({ reactNativeAsset: asset })
      );
      const uploadResults = await Promise.all(uploadPromises);
      const imageUrls = uploadResults
        .filter(r => r.url)
        .map(r => r.url!);
      setNewProductImages(prev => [...prev, ...imageUrls]);
    }
  };

  const handleNewProductVideoPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uploadResult = await upload({ reactNativeAsset: result.assets[0] });
      if (uploadResult.url) {
        setNewProductVideo(uploadResult.url);
      }
    }
  };

  const handleCreateNewProduct = async () => {
    if (!newProductName.trim() || !newProductPrice) {
      Alert.alert('Error', 'Product name and price are required');
      return;
    }

    try {
      setCreatingProduct(true);
      const productData = {
        business_id: Number(businessId),
        name: newProductName.trim(),
        description: newProductDescription.trim() || '',
        price: parseFloat(newProductPrice),
        original_price: newProductOriginalPrice ? parseFloat(newProductOriginalPrice) : undefined,
        category: newProductCategory.trim() || '',
        image: newProductImages[0] || '',
        images: newProductImages.join(','),
        video: newProductVideo || '',
        in_stock: true,
      };

      const newProduct = await createProduct(productData);
      
      // Add the new product to the selected products
      setSelectedProductIds(prev => [...prev, newProduct.id]);
      
      // Refresh products list
      await loadData();
      
      // Close modal and reset form
      setCreateProductModalVisible(false);
      resetNewProductForm();
      
      toast.success('Product created and added to ad!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create product');
    } finally {
      setCreatingProduct(false);
    }
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter ad title');
      return false;
    }

    if (selectedProductIds.length === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return false;
    }

    // When editing, skip date validation (dates are read-only)
    if (!editingAd) {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end < start) {
          Alert.alert('Invalid Date', 'End date must be after start date');
          return false;
        }
      }
    }

    if (originalPrice && discountedPrice) {
      const original = parseFloat(originalPrice);
      const discounted = parseFloat(discountedPrice);
      
      if (isNaN(original) || isNaN(discounted)) {
        Alert.alert('Invalid Price', 'Please enter valid prices');
        return false;
      }
      
      if (discounted >= original) {
        Alert.alert('Invalid Price', 'Discounted price must be lower than original price');
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
        product_ids: selectedProductIds,
        title: title.trim(),
        description: description.trim(),
        image: image || products.find(p => selectedProductIds.includes(p.id))?.image || getUniqueOfferImage(),
        discount_text: discountText.trim(),
        original_price: originalPrice ? parseFloat(originalPrice) : undefined,
        discounted_price: discountedPrice ? parseFloat(discountedPrice) : undefined,
        // When editing, keep existing dates (don't update)
        start_date: editingAd ? editingAd.start_date : (startDate || undefined),
        end_date: editingAd ? editingAd.end_date : (endDate || undefined),
        is_active: isActive,
      };

      if (editingAd) {
        await updateAd({ id: editingAd.id, ...adData });
        toast.success('Ad updated successfully!');
      } else {
        await createAd(adData);
        toast.success('Ad created successfully!');
      }

      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save ad');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (ad: Ad) => {
    Alert.alert(
      'Delete Ad',
      `Are you sure you want to delete "${ad.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAd(ad.id);
              toast.success('Ad deleted successfully');
              loadData();
            } catch (error) {
              toast.error('Failed to delete ad');
            }
          }
        },
      ]
    );
  };

  const toggleAdStatus = async (ad: Ad) => {
    try {
      await updateAd({
        id: ad.id,
        product_ids: ad.product_ids || [],
        title: ad.title,
        description: ad.description,
        image: ad.image,
        discount_text: ad.discount_text,
        original_price: ad.original_price,
        discounted_price: ad.discounted_price,
        start_date: ad.start_date,
        end_date: ad.end_date,
        is_active: !ad.is_active,
      });
      toast.success(ad.is_active ? 'Ad deactivated' : 'Ad activated');
      loadData();
    } catch (error) {
      toast.error('Failed to update ad status');
    }
  };

  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));

  if (!isLoggedIn) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Ads</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Plus size={24} color="#f97316" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Megaphone size={20} color="#f59e0b" />
        <Text style={styles.infoText}>Create 1 promotional ad for your business. Link it to products and set dates & pricing.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : ads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Megaphone size={48} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Ads Yet</Text>
          <Text style={styles.emptyText}>Create your promotional ad to attract more customers</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
            <Plus size={20} color="#ffffff" />
            <Text style={styles.emptyButtonText}>Create Ad</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {ads.map((ad) => (
            <View key={ad.id} style={styles.adCard}>
              <Image source={{ uri: ad.image }} style={styles.adImage} />
              <View style={styles.adOverlay}>
                <View style={styles.adContent}>
                  <View style={styles.adHeader}>
                    <View style={[styles.statusBadge, ad.is_active ? styles.statusActive : styles.statusInactive]}>
                      {ad.is_active ? <Eye size={12} color="#ffffff" /> : <EyeOff size={12} color="#ffffff" />}
                      <Text style={styles.statusText}>{ad.is_active ? 'Active' : 'Inactive'}</Text>
                    </View>
                  </View>
                  {ad.discount_text && (
                    <Text style={styles.discountText}>{ad.discount_text}</Text>
                  )}
                  <Text style={styles.adTitle}>{ad.title}</Text>
                  {ad.product_ids && ad.product_ids.length > 0 && (
                    <View style={styles.productBadge}>
                      <Package size={12} color="#ffffff" />
                      <Text style={styles.productBadgeText}>{ad.product_ids.length} Product{ad.product_ids.length > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                  {(ad.original_price && ad.discounted_price) && (
                    <View style={styles.priceRow}>
                      <Text style={styles.originalPrice}>₹{ad.original_price}</Text>
                      <Text style={styles.discountedPrice}>₹{ad.discounted_price}</Text>
                    </View>
                  )}
                  {(ad.start_date || ad.end_date) && (
                    <View style={styles.dateRow}>
                      <Calendar size={12} color="#e5e7eb" />
                      <Text style={styles.dateText}>
                        {ad.start_date && new Date(ad.start_date).toLocaleDateString()} - {ad.end_date && new Date(ad.end_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.adActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => toggleAdStatus(ad)}
                >
                  {ad.is_active ? (
                    <EyeOff size={18} color="#6b7280" />
                  ) : (
                    <Eye size={18} color="#22c55e" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => openEditModal(ad)}
                >
                  <Edit2 size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDelete(ad)}
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAd ? 'Edit Ad' : 'Create Ad'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Select Products Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Products *</Text>
              <View style={styles.productSelectionContainer}>
                <TouchableOpacity 
                  style={styles.addProductButton}
                  onPress={() => setProductModalVisible(true)}
                >
                  <Package size={18} color="#f97316" />
                  <Text style={styles.addProductButtonText}>
                    {selectedProductIds.length > 0 ? `${selectedProductIds.length} selected` : 'Select from existing'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.createProductButton}
                  onPress={() => setCreateProductModalVisible(true)}
                >
                  <Plus size={18} color="#ffffff" />
                  <Text style={styles.createProductButtonText}>Create New</Text>
                </TouchableOpacity>
              </View>

              {/* Selected Products Preview */}
              {selectedProducts.length > 0 && (
                <View style={styles.selectedProductsList}>
                  {selectedProducts.map(product => (
                    <View key={product.id} style={styles.selectedProductChip}>
                      {product.image && (
                        <Image source={{ uri: product.image }} style={styles.chipImage} />
                      )}
                      <Text style={styles.chipText} numberOfLines={1}>{product.name}</Text>
                      <TouchableOpacity onPress={() => toggleProductSelection(product.id)}>
                        <X size={16} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Ad Image */}
            <TouchableOpacity style={styles.imagePickerContainer} onPress={handleImagePick}>
              {image ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Camera size={32} color="#9ca3af" />
                  <Text style={styles.imagePlaceholderText}>Add Banner Image (or use product image)</Text>
                </View>
              )}
              {uploadLoading && (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ad Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Summer Sale, Special Offer"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add more details about your offer..."
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Discount Text</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 50% OFF, Buy 1 Get 1 Free"
                placeholderTextColor="#9ca3af"
                value={discountText}
                onChangeText={setDiscountText}
              />
            </View>

            <View style={styles.priceInputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Original Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="150"
                  placeholderTextColor="#9ca3af"
                  value={originalPrice}
                  onChangeText={setOriginalPrice}
                  keyboardType="numeric"
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
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Date fields - read-only when editing */}
            <View style={styles.priceInputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Start Date {editingAd && <Text style={styles.readOnlyLabel}>(Read-only)</Text>}</Text>
                <TextInput
                  style={[styles.input, editingAd && styles.readOnlyInput]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  value={startDate}
                  onChangeText={setStartDate}
                  editable={!editingAd}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>End Date {editingAd && <Text style={styles.readOnlyLabel}>(Read-only)</Text>}</Text>
                <TextInput
                  style={[styles.input, editingAd && styles.readOnlyInput]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  value={endDate}
                  onChangeText={setEndDate}
                  editable={!editingAd}
                />
              </View>
            </View>

            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Active</Text>
                <Text style={styles.toggleHint}>Show this ad on home screen</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#e5e7eb', true: '#bbf7d0' }}
                thumbColor={isActive ? '#22c55e' : '#9ca3af'}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingAd ? 'Update Ad' : 'Create Ad'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        visible={productModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProductModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setProductModalVisible(false)}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Products</Text>
            <TouchableOpacity onPress={() => setProductModalVisible(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.productList}
            renderItem={({ item }) => {
              const isSelected = selectedProductIds.includes(item.id);
              return (
                <TouchableOpacity 
                  style={[styles.productItem, isSelected && styles.productItemSelected]}
                  onPress={() => toggleProductSelection(item.id)}
                >
                  {item.image && (
                    <Image source={{ uri: item.image }} style={styles.productItemImage} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productItemName}>{item.name}</Text>
                    {item.category && (
                      <Text style={styles.productItemCategory}>{item.category}</Text>
                    )}
                    <Text style={styles.productItemPrice}>₹{item.price}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyProducts}>
                <Package size={48} color="#d1d5db" />
                <Text style={styles.emptyProductsText}>No products available</Text>
                <TouchableOpacity 
                  style={styles.emptyCreateButton}
                  onPress={() => {
                    setProductModalVisible(false);
                    setCreateProductModalVisible(true);
                  }}
                >
                  <Plus size={18} color="#ffffff" />
                  <Text style={styles.emptyCreateButtonText}>Create Product</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Create Product Modal */}
      <Modal
        visible={createProductModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateProductModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreateProductModalVisible(false)}>
              <X size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create New Product</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product name"
                placeholderTextColor="#9ca3af"
                value={newProductName}
                onChangeText={setNewProductName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Product description..."
                placeholderTextColor="#9ca3af"
                value={newProductDescription}
                onChangeText={setNewProductDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Electronics, Fashion"
                placeholderTextColor="#9ca3af"
                value={newProductCategory}
                onChangeText={setNewProductCategory}
              />
            </View>

            <View style={styles.priceInputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Price (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="99"
                  placeholderTextColor="#9ca3af"
                  value={newProductPrice}
                  onChangeText={setNewProductPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Original Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="150"
                  placeholderTextColor="#9ca3af"
                  value={newProductOriginalPrice}
                  onChangeText={setNewProductOriginalPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Images</Text>
              <TouchableOpacity 
                style={styles.mediaButton}
                onPress={handleNewProductImagePick}
              >
                <ImageIcon size={20} color="#f97316" />
                <Text style={styles.mediaButtonText}>Add Images</Text>
              </TouchableOpacity>
              {newProductImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesList}>
                  {newProductImages.map((img, idx) => (
                    <View key={idx} style={styles.imagePreviewContainer}>
                      <Image source={{ uri: img }} style={styles.imagePreviewSmall} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => setNewProductImages(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Video (Optional)</Text>
              <TouchableOpacity 
                style={styles.mediaButton}
                onPress={handleNewProductVideoPick}
              >
                <Video size={20} color="#f97316" />
                <Text style={styles.mediaButtonText}>
                  {newProductVideo ? 'Change Video' : 'Add Video'}
                </Text>
              </TouchableOpacity>
              {newProductVideo && (
                <Text style={styles.videoAddedText}>✓ Video added</Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, creatingProduct && styles.buttonDisabled]}
              onPress={handleCreateNewProduct}
              disabled={creatingProduct}
            >
              {creatingProduct ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Create Product</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'space-between',
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
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    margin: 16,
    padding: 14,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    columnGap: 16,
  },
  adCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  adImage: {
    width: '100%',
    height: 200,
  },
  adOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  adContent: {
    padding: 16,
  },
  adHeader: {
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#22c55e',
  },
  statusInactive: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  discountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 4,
  },
  adTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  productBadgeText: {
    fontSize: 12,
    color: '#ffffff',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    color: '#e5e7eb',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  adActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    columnGap: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f97316',
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
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
  readOnlyInput: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  productSelectionContainer: {
    flexDirection: 'row',
    columnGap: 12,
  },
  addProductButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    paddingVertical: 14,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  addProductButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  createProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f97316',
    borderRadius: 8,
  },
  createProductButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectedProductsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    marginTop: 12,
  },
  selectedProductChip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipImage: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    maxWidth: 100,
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
  priceInputRow: {
    flexDirection: 'row',
    columnGap: 12,
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
  productList: {
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productItemSelected: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  productItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  productItemCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  productItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#f97316',
    backgroundColor: '#f97316',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyProducts: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyProductsText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 20,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    paddingVertical: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  imagesList: {
    marginTop: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreviewSmall: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoAddedText: {
    fontSize: 13,
    color: '#22c55e',
    marginTop: 8,
    fontWeight: '500',
  },
});
