import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, MapPin, Phone, Mail, Clock, DollarSign, Truck, Check, Store, Package, Plus, X, ImageIcon, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { createBusiness, fetchUserBusinesses, updateUser, createProduct } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '@/utils/useUpload';
import { getUniqueBusinessImage, getUniqueProductImage } from '@/lib/unique-images';

const CATEGORIES = [
  'Grocery', 'Restaurant', 'Pharmacy', 'Bakery', 'Kitchen', 
  'Electronics', 'Fashion', 'Beauty', 'Home & Garden', 'Sports'
];

const PAYMENT_METHODS = [
  { id: 'gpay', label: 'Google Pay', icon: '💳' },
  { id: 'paytm', label: 'Paytm', icon: '📱' },
  { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
  { id: 'cop', label: 'Cash on Pickup', icon: '🏪' },
];

const DELIVERY_OPTIONS = [
  { id: 'delivery', label: 'Delivery', description: 'Deliver to customer address', icon: Truck },
  { id: 'pickup', label: 'Pickup', description: 'Customer picks up from store', icon: Store },
  { id: 'both', label: 'Both', description: 'Offer both options', icon: Package },
];

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  image: string;
  category: string;
  inStock: boolean;
}

export default function CreateBusinessScreen() {
  const router = useRouter();
  const { user, isLoggedIn, setUser } = useUserStore();
  const [upload, { loading: uploadLoading }] = useUpload();
  
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingBusiness, setExistingBusiness] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [deliveryOption, setDeliveryOption] = useState<'delivery' | 'pickup' | 'both'>('both');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Products state
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productOriginalPrice, setProductOriginalPrice] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productInStock, setProductInStock] = useState(true);
  const [productImageLoading, setProductImageLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  useEffect(() => {
    checkExistingBusiness();
  }, [user?.id]);

  const checkExistingBusiness = async () => {
    if (!user?.id) {
      setCheckingExisting(false);
      return;
    }
    
    try {
      setCheckingExisting(true);
      const businesses = await fetchUserBusinesses(user.id);
      if (businesses.length > 0) {
        setExistingBusiness(businesses[0]);
      }
    } catch (error) {
      console.error('Error checking existing business:', error);
    } finally {
      setCheckingExisting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Business</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loginRequired}>
          <Text style={styles.loginRequiredTitle}>Login Required</Text>
          <Text style={styles.loginRequiredText}>You must be logged in to create a business</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (checkingExisting) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Business</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  // User already has a business - show option to manage it
  if (existingBusiness) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Business</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.existingBusinessContainer}>
          <View style={styles.existingBusinessIcon}>
            <Store size={48} color="#f97316" />
          </View>
          <Text style={styles.existingBusinessTitle}>You Already Have a Business</Text>
          <Text style={styles.existingBusinessText}>
            Each account can only have one business. You can manage or update your existing business.
          </Text>
          
          <View style={styles.existingBusinessCard}>
            {existingBusiness.image && (
              <Image source={{ uri: existingBusiness.image }} style={styles.existingBusinessImage} />
            )}
            <View style={styles.existingBusinessInfo}>
              <Text style={styles.existingBusinessName}>{existingBusiness.name}</Text>
              <Text style={styles.existingBusinessType}>{existingBusiness.type}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => router.replace(`/manage-business/${existingBusiness.id}`)}
          >
            <Text style={styles.manageButtonText}>Manage Your Business</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.addProductsButton}
            onPress={() => router.push(`/manage-products/${existingBusiness.id}`)}
          >
            <Package size={18} color="#f97316" />
            <Text style={styles.addProductsButtonText}>Add Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const togglePayment = (paymentId: string) => {
    if (selectedPayments.includes(paymentId)) {
      setSelectedPayments(selectedPayments.filter(p => p !== paymentId));
    } else {
      setSelectedPayments([...selectedPayments, paymentId]);
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

  // Product image handling
  const handleProductImageFromGallery = async () => {
    setShowImageOptions(false);
    setProductImageLoading(true);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uploadResult = await upload({ reactNativeAsset: result.assets[0] });
        if (uploadResult.url) {
          setProductImage(uploadResult.url);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setProductImageLoading(false);
    }
  };

  const handleProductImageFromCamera = async () => {
    setShowImageOptions(false);
    setProductImageLoading(true);
    
    try {
      // Request camera permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        setProductImageLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uploadResult = await upload({ reactNativeAsset: result.assets[0] });
        if (uploadResult.url) {
          setProductImage(uploadResult.url);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setProductImageLoading(false);
    }
  };

  const resetProductForm = () => {
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductOriginalPrice('');
    setProductImage('');
    setProductCategory(selectedCategories[0] || '');
    setProductInStock(true);
    setEditingProductIndex(null);
  };

  const openAddProductModal = () => {
    resetProductForm();
    setShowProductModal(true);
  };

  const openEditProductModal = (index: number) => {
    const product = products[index];
    setProductName(product.name);
    setProductDescription(product.description);
    setProductPrice(product.price);
    setProductOriginalPrice(product.originalPrice);
    setProductImage(product.image);
    setProductCategory(product.category);
    setProductInStock(product.inStock);
    setEditingProductIndex(index);
    setShowProductModal(true);
  };

  const saveProduct = () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }
    if (!productPrice.trim()) {
      Alert.alert('Error', 'Please enter product price');
      return;
    }

    const newProduct: ProductItem = {
      id: editingProductIndex !== null ? products[editingProductIndex].id : Date.now().toString(),
      name: productName.trim(),
      description: productDescription.trim(),
      price: productPrice.trim(),
      originalPrice: productOriginalPrice.trim(),
      image: productImage || getUniqueProductImage(),
      category: productCategory || selectedCategories[0] || 'General',
      inStock: productInStock,
    };

    if (editingProductIndex !== null) {
      const updatedProducts = [...products];
      updatedProducts[editingProductIndex] = newProduct;
      setProducts(updatedProducts);
    } else {
      setProducts([...products, newProduct]);
    }

    setShowProductModal(false);
    resetProductForm();
  };

  const deleteProduct = (index: number) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to remove this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const updatedProducts = products.filter((_, i) => i !== index);
            setProducts(updatedProducts);
          }
        }
      ]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter business name');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter business description');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter business email');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter business address');
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }
    if (selectedPayments.length === 0) {
      Alert.alert('Error', 'Please select at least one payment method');
      return;
    }

    try {
      setLoading(true);
      const newBusiness = await createBusiness({
        user_id: user!.id!,
        name: name.trim(),
        description: description.trim(),
        image: image || getUniqueBusinessImage(),
        type: selectedCategories[0],
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        categories: selectedCategories,
        payment_methods: selectedPayments,
        order_mode: deliveryOption,
        delivery_fee: deliveryFee ? parseFloat(deliveryFee) : 0,
        min_order: minOrder ? `₹${minOrder}` : undefined,
        delivery_time: deliveryTime || '30-45 min',
      });
      
      // Create all products for the business
      if (products.length > 0) {
        for (const product of products) {
          await createProduct({
            business_id: newBusiness.id,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price),
            original_price: product.originalPrice ? parseFloat(product.originalPrice) : null,
            image: product.image,
            category: product.category,
            in_stock: product.inStock,
          });
        }
      }
      
      // Update user to be a business user
      if (user && !user.is_business_user) {
        await updateUser(user.email, { is_business_user: true });
        setUser({ ...user, is_business_user: true });
      }
      
      Alert.alert(
        'Success', 
        `Business created successfully with ${products.length} product${products.length !== 1 ? 's' : ''}!`,
        [
          { text: 'Go to Dashboard', onPress: () => router.replace('/business-dashboard') },
        ]
      );
    } catch (error) {
      console.error('[handleCreate] Error:', error);
      Alert.alert('Error', 'Failed to create business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Business</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Business Image */}
        <TouchableOpacity style={styles.imageContainer} onPress={handleImagePick}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Camera size={32} color="#9ca3af" />
              <Text style={styles.imagePlaceholderText}>Add Business Photo</Text>
            </View>
          )}
          {uploadLoading && (
            <View style={styles.imageOverlay}>
              <ActivityIndicator color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter business name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <Text style={styles.labelHint}>This will be shown to customers on the home page</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your business..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Email *</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={18} color="#9ca3af" />
              <TextInput
                style={styles.inputInner}
                placeholder="Enter business email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={18} color="#9ca3af" />
              <TextInput
                style={styles.inputInner}
                placeholder="Enter phone number"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Address *</Text>
            <View style={styles.inputWithIcon}>
              <MapPin size={18} color="#9ca3af" />
              <TextInput
                style={styles.inputInner}
                placeholder="Enter full address"
                placeholderTextColor="#9ca3af"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories *</Text>
          <Text style={styles.sectionHint}>Select all that apply</Text>
          <View style={styles.chipContainer}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.chip,
                  selectedCategories.includes(category) && styles.chipSelected
                ]}
                onPress={() => toggleCategory(category)}
              >
                <Text style={[
                  styles.chipText,
                  selectedCategories.includes(category) && styles.chipTextSelected
                ]}>{category}</Text>
                {selectedCategories.includes(category) && (
                  <Check size={14} color="#ffffff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Products</Text>
              <Text style={styles.sectionHint}>Add products to your store (optional)</Text>
            </View>
            <TouchableOpacity style={styles.addProductButton} onPress={openAddProductModal}>
              <Plus size={18} color="#ffffff" />
              <Text style={styles.addProductButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {products.length > 0 ? (
            <View style={styles.productsList}>
              {products.map((product, index) => (
                <View key={product.id} style={styles.productCard}>
                  <Image source={{ uri: product.image }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productPrice}>₹{product.price}</Text>
                    {product.originalPrice && (
                      <Text style={styles.productOriginalPrice}>₹{product.originalPrice}</Text>
                    )}
                    <Text style={styles.productCategory}>{product.category}</Text>
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity 
                      style={styles.productActionButton}
                      onPress={() => openEditProductModal(index)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteProduct(index)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noProductsContainer}>
              <Package size={40} color="#d1d5db" />
              <Text style={styles.noProductsText}>No products added yet</Text>
              <Text style={styles.noProductsHint}>Tap "Add" to add your first product</Text>
            </View>
          )}
        </View>

        {/* Delivery Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Options *</Text>
          <Text style={styles.sectionHint}>How can customers receive orders?</Text>
          <View style={styles.deliveryOptions}>
            {DELIVERY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.deliveryOption,
                  deliveryOption === option.id && styles.deliveryOptionSelected
                ]}
                onPress={() => setDeliveryOption(option.id as any)}
              >
                <option.icon size={22} color={deliveryOption === option.id ? '#f97316' : '#6b7280'} />
                <View style={styles.deliveryOptionText}>
                  <Text style={[
                    styles.deliveryOptionLabel,
                    deliveryOption === option.id && styles.deliveryOptionLabelSelected
                  ]}>{option.label}</Text>
                  <Text style={styles.deliveryOptionDescription}>{option.description}</Text>
                </View>
                {deliveryOption === option.id && (
                  <Check size={18} color="#f97316" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods *</Text>
          <Text style={styles.sectionHint}>Select accepted payment methods for customers</Text>
          <View style={styles.paymentList}>
            {PAYMENT_METHODS.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={[
                  styles.paymentOption,
                  selectedPayments.includes(payment.id) && styles.paymentOptionSelected
                ]}
                onPress={() => togglePayment(payment.id)}
              >
                <Text style={styles.paymentIcon}>{payment.icon}</Text>
                <Text style={[
                  styles.paymentLabel,
                  selectedPayments.includes(payment.id) && styles.paymentLabelSelected
                ]}>{payment.label}</Text>
                {selectedPayments.includes(payment.id) && (
                  <Check size={16} color="#f97316" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Delivery Settings */}
        {(deliveryOption === 'delivery' || deliveryOption === 'both') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Settings</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Delivery Fee</Text>
                <View style={styles.inputWithIcon}>
                  <Truck size={18} color="#9ca3af" />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={deliveryFee}
                    onChangeText={setDeliveryFee}
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputSuffix}>₹</Text>
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Minimum Order</Text>
                <View style={styles.inputWithIcon}>
                  <DollarSign size={18} color="#9ca3af" />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    value={minOrder}
                    onChangeText={setMinOrder}
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputSuffix}>₹</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Time</Text>
              <View style={styles.inputWithIcon}>
                <Clock size={18} color="#9ca3af" />
                <TextInput
                  style={styles.inputInner}
                  placeholder="30-45 min"
                  placeholderTextColor="#9ca3af"
                  value={deliveryTime}
                  onChangeText={setDeliveryTime}
                />
              </View>
            </View>
          </View>
        )}

        {/* Create Button */}
        <TouchableOpacity 
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.createButtonText}>
              Create Business {products.length > 0 ? `with ${products.length} Product${products.length > 1 ? 's' : ''}` : ''}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Product Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProductIndex !== null ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Product Image */}
              <TouchableOpacity 
                style={styles.productImagePicker}
                onPress={() => setShowImageOptions(true)}
              >
                {productImage ? (
                  <Image source={{ uri: productImage }} style={styles.productImagePreview} />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <ImageIcon size={32} color="#9ca3af" />
                    <Text style={styles.productImagePlaceholderText}>Tap to add image</Text>
                  </View>
                )}
                {productImageLoading && (
                  <View style={styles.imageOverlay}>
                    <ActivityIndicator color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Fresh Apples"
                  placeholderTextColor="#9ca3af"
                  value={productName}
                  onChangeText={setProductName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Product description..."
                  placeholderTextColor="#9ca3af"
                  value={productDescription}
                  onChangeText={setProductDescription}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Price (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="99"
                    placeholderTextColor="#9ca3af"
                    value={productPrice}
                    onChangeText={setProductPrice}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Original Price (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="149"
                    placeholderTextColor="#9ca3af"
                    value={productOriginalPrice}
                    onChangeText={setProductOriginalPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryChips}>
                    {(selectedCategories.length > 0 ? selectedCategories : ['General']).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          productCategory === cat && styles.categoryChipSelected
                        ]}
                        onPress={() => setProductCategory(cat)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          productCategory === cat && styles.categoryChipTextSelected
                        ]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <TouchableOpacity 
                style={styles.stockToggle}
                onPress={() => setProductInStock(!productInStock)}
              >
                <View style={[styles.checkbox, productInStock && styles.checkboxChecked]}>
                  {productInStock && <Check size={14} color="#ffffff" />}
                </View>
                <Text style={styles.stockToggleText}>In Stock</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowProductModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveProduct}
              >
                <Text style={styles.saveButtonText}>
                  {editingProductIndex !== null ? 'Update' : 'Add Product'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowImageOptions(false)}
      >
        <TouchableOpacity 
          style={styles.imageOptionsOverlay}
          activeOpacity={1}
          onPress={() => setShowImageOptions(false)}
        >
          <View style={styles.imageOptionsContent}>
            <Text style={styles.imageOptionsTitle}>Add Product Image</Text>
            
            <TouchableOpacity 
              style={styles.imageOption}
              onPress={handleProductImageFromCamera}
            >
              <Camera size={24} color="#f97316" />
              <Text style={styles.imageOptionText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.imageOption}
              onPress={handleProductImageFromGallery}
            >
              <ImageIcon size={24} color="#f97316" />
              <Text style={styles.imageOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.imageOptionCancel}
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={styles.imageOptionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loginRequiredTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  loginRequiredText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  existingBusinessContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  existingBusinessIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  existingBusinessTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  existingBusinessText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  existingBusinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '100%',
    marginBottom: 24,
  },
  existingBusinessImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  existingBusinessInfo: {
    flex: 1,
    marginLeft: 14,
  },
  existingBusinessName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  existingBusinessType: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  manageButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  manageButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addProductsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  addProductsButtonText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
  },
  image: {
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f97316',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    columnGap: 4,
  },
  addProductButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  productsList: {
    columnGap: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
    marginTop: 2,
  },
  productOriginalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  productCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  productActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 13,
    color: '#f97316',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 6,
  },
  noProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
  },
  noProductsText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  noProductsHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
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
  labelHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f9fafb',
  },
  inputInner: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
    color: '#111827',
  },
  inputSuffix: {
    fontSize: 15,
    color: '#6b7280',
  },
  row: {
    flexDirection: 'row',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  deliveryOptions: {
    columnGap: 10,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    columnGap: 12,
  },
  deliveryOptionSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  deliveryOptionText: {
    flex: 1,
  },
  deliveryOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  deliveryOptionLabelSelected: {
    color: '#f97316',
  },
  deliveryOptionDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  paymentList: {
    columnGap: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    columnGap: 12,
  },
  paymentOptionSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  paymentIcon: {
    fontSize: 20,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  paymentLabelSelected: {
    color: '#f97316',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    columnGap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f97316',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  productImagePicker: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    alignSelf: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
  },
  productImagePreview: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImagePlaceholderText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  categoryChips: {
    flexDirection: 'row',
    columnGap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryChipSelected: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  stockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  stockToggleText: {
    fontSize: 14,
    color: '#374151',
  },
  // Image Options Modal
  imageOptionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  imageOptionsContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  imageOptionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  imageOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  imageOptionCancel: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  imageOptionCancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});
