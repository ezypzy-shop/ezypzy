import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Alert, Switch } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Upload, Package, Megaphone, Tag, Eye, MousePointerClick, Edit, Plus, X } from 'lucide-react-native';
import { fetchBusiness, updateBusiness, deleteBusiness, fetchAdsByBusinessId } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from 'sonner-native';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '@/utils/useUpload';

export default function ManageBusinessScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [upload, { loading: uploading }] = useUpload();
  const [currentOffer, setCurrentOffer] = useState<any>(null);
  const [loadingOffer, setLoadingOffer] = useState(false);

  // Business Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState('');

  // Spin Wheel Feature
  const [spinWheelEnabled, setSpinWheelEnabled] = useState(false);
  const [spinDiscounts, setSpinDiscounts] = useState<number[]>([2, 4, 6, 8, 10]);
  const [newDiscountInput, setNewDiscountInput] = useState('');

  // Order Mode - using correct database values
  const orderModeOptions = [
    { id: 'catalog', label: 'Catalog Orders Only' },
    { id: 'custom', label: 'Custom Orders Only' },
    { id: 'both', label: 'Both Catalog & Custom Orders' },
  ];
  const [orderMode, setOrderMode] = useState('both');

  // Payment methods - Updated with Pay on Delivery and Pay on Pickup
  const paymentOptions = [
    { id: 'cash', label: 'Cash on Delivery' },
    { id: 'pay_on_delivery', label: 'Pay on Delivery' },
    { id: 'pay_on_pickup', label: 'Pay on Pickup' },
    { id: 'upi', label: 'UPI' },
    { id: 'card', label: 'Card' },
    { id: 'paytm', label: 'Paytm' },
    { id: 'gpay', label: 'Google Pay' },
  ];
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);

  // Delivery and Pickup options
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(false);

  // Delivery settings
  const [deliveryFee, setDeliveryFee] = useState('0.00');
  const [minOrder, setMinOrder] = useState('₹500');
  const [deliveryTime, setDeliveryTime] = useState('2-4 days');

  useEffect(() => {
    loadBusinessData();
    loadCurrentOffer();
  }, [id]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      const data = await fetchBusiness(Number(id));
      console.log('[Edit Business] Fetched data:', data);
      
      // The API returns { business: {...}, products: [...] }
      const business = data.business;
      
      if (business) {
        setBusinessData(business);
        
        // Initialize business info
        setName(business.name || '');
        setDescription(business.description || '');
        setPhone(business.phone || '');
        setEmail(business.email || '');
        setAddress(business.address || '');
        setLocation(business.location || '');
        setImage(business.image || '');
        
        // Initialize spin wheel setting
        setSpinWheelEnabled(business.spin_wheel_enabled === true);
        
        // Initialize spin discounts (custom discount values)
        if (business.spin_discounts && Array.isArray(business.spin_discounts) && business.spin_discounts.length > 0) {
          setSpinDiscounts(business.spin_discounts);
        } else {
          setSpinDiscounts([2, 4, 6, 8, 10]); // Default values
        }
        
        // Initialize order mode
        if (business.order_mode) {
          setOrderMode(business.order_mode);
        }
        
        // Initialize payment methods
        if (business.payment_methods) {
          setSelectedPaymentMethods(business.payment_methods);
        }
        
        // Initialize delivery and pickup options
        setDeliveryEnabled(business.delivery_enabled !== false); // default to true
        setPickupEnabled(business.pickup_enabled === true); // default to false
        
        // Initialize delivery settings
        if (business.delivery_fee !== undefined) {
          setDeliveryFee(business.delivery_fee.toString());
        }
        if (business.min_order) {
          setMinOrder(business.min_order);
        }
        if (business.delivery_time) {
          setDeliveryTime(business.delivery_time);
        }
        
        console.log('[Edit Business] Business data loaded successfully');
      }
    } catch (error) {
      console.error('Error loading business data:', error);
      toast.error('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentOffer = async () => {
    try {
      setLoadingOffer(true);
      const offers = await fetchAdsByBusinessId(Number(id));
      // Business should only have one offer (enforced by backend)
      if (offers && offers.length > 0) {
        setCurrentOffer(offers[0]);
      } else {
        setCurrentOffer(null);
      }
    } catch (error) {
      console.error('Error loading offer:', error);
    } finally {
      setLoadingOffer(false);
    }
  };

  const handlePickImage = async () => {
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
        toast.success('Image uploaded successfully');
      }
    }
  };

  const togglePaymentMethod = (method: string) => {
    setSelectedPaymentMethods(prev => {
      if (prev.includes(method)) {
        return prev.filter(m => m !== method);
      } else {
        return [...prev, method];
      }
    });
  };

  const handleAddDiscount = () => {
    const value = parseInt(newDiscountInput.trim());
    if (isNaN(value) || value <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }
    if (spinDiscounts.includes(value)) {
      toast.error('This discount value already exists');
      return;
    }
    setSpinDiscounts(prev => [...prev, value].sort((a, b) => a - b));
    setNewDiscountInput('');
    toast.success(`₹${value} added to discount options`);
  };

  const handleRemoveDiscount = (value: number) => {
    if (spinDiscounts.length <= 1) {
      toast.error('You must have at least one discount value');
      return;
    }
    setSpinDiscounts(prev => prev.filter(d => d !== value));
    toast.success(`₹${value} removed from discount options`);
  };

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!address.trim()) {
      toast.error('Address is required');
      return;
    }

    // Validation: At least one option (delivery or pickup) must be enabled
    if (!deliveryEnabled && !pickupEnabled) {
      toast.error('Please enable at least one option: Delivery or Pickup');
      return;
    }

    // Validation: Spin wheel must have at least one discount value
    if (spinWheelEnabled && spinDiscounts.length === 0) {
      toast.error('Please add at least one discount value for spin wheel');
      return;
    }

    try {
      setSaving(true);
      
      // Get user ID from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        toast.error('User not logged in');
        return;
      }
      const userData = JSON.parse(userDataStr);
      
      // Update business with new settings
      await updateBusiness(Number(id), {
        user_id: userData.id,
        name: name.trim(),
        description: description.trim(),
        image: image,
        type: businessData.type,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        location: location || businessData.location || '',
        categories: businessData.categories || [],
        order_mode: orderMode,
        payment_methods: selectedPaymentMethods,
        delivery_enabled: deliveryEnabled,
        pickup_enabled: pickupEnabled,
        spin_wheel_enabled: spinWheelEnabled,
        spin_discounts: spinDiscounts,
        delivery_fee: parseFloat(deliveryFee) || 0,
        min_order: minOrder,
        delivery_time: deliveryTime,
      });
      
      toast.success('Business updated successfully!');
      
      // Navigate to Account screen after successful update
      setTimeout(() => {
        router.replace('/(tabs)/account');
      }, 800);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBusiness = async () => {
    if (!businessData) return;
    
    Alert.alert(
      'Delete Business',
      'Are you sure you want to delete this business? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBusiness(Number(id));
              toast.success('Business deleted successfully');
              router.replace('/(tabs)/account');
            } catch (error) {
              console.error('Error deleting business:', error);
              toast.error('Failed to delete business');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 40 }} />
        </SafeAreaView>
      </>
    );
  }

  if (!businessData) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <Text style={styles.errorText}>Business not found</Text>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Business</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Quick Actions - Manage Products and Ads */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => {
                console.log('[Edit Business] Navigating to manage-products:', id);
                router.push(`/manage-products/${id}` as any);
              }}
            >
              <View style={styles.quickActionIcon}>
                <Package size={24} color="#FF6B35" />
              </View>
              <Text style={styles.quickActionTitle}>Manage Products</Text>
              <Text style={styles.quickActionSubtitle}>Add, edit or remove products</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => {
                console.log('[Edit Business] Navigating to manage-ads:', id);
                router.push(`/manage-ads/${id}` as any);
              }}
            >
              <View style={styles.quickActionIcon}>
                <Megaphone size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionTitle}>Manage Ads</Text>
              <Text style={styles.quickActionSubtitle}>Promote your business</Text>
            </TouchableOpacity>
          </View>

          {/* Current Offer Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Tag size={20} color="#F97316" />
              <Text style={styles.sectionTitle}>Your Special Offer</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Create a special offer to attract more customers (Free for now!)
            </Text>
            
            {loadingOffer ? (
              <View style={styles.offerLoading}>
                <ActivityIndicator size="small" color="#F97316" />
              </View>
            ) : currentOffer ? (
              <View style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <View>
                    <Text style={styles.offerTitle}>{currentOffer.title}</Text>
                    <View style={styles.offerStatus}>
                      <View style={[styles.statusDot, { backgroundColor: currentOffer.is_active ? '#22c55e' : '#ef4444' }]} />
                      <Text style={styles.statusText}>
                        {currentOffer.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>

                {currentOffer.image && (
                  <Image source={{ uri: currentOffer.image }} style={styles.offerImage} />
                )}

                {/* Analytics */}
                <View style={styles.analyticsRow}>
                  <View style={styles.analyticsItem}>
                    <Eye size={18} color="#6b7280" />
                    <Text style={styles.analyticsLabel}>Views</Text>
                    <Text style={styles.analyticsValue}>{currentOffer.views || 0}</Text>
                  </View>
                  <View style={styles.analyticsDivider} />
                  <View style={styles.analyticsItem}>
                    <MousePointerClick size={18} color="#6b7280" />
                    <Text style={styles.analyticsLabel}>Clicks</Text>
                    <Text style={styles.analyticsValue}>{currentOffer.clicks || 0}</Text>
                  </View>
                </View>

                <View style={styles.offerActions}>
                  <TouchableOpacity 
                    style={[styles.offerActionButton, styles.editButton]}
                    onPress={() => router.push(`/offer-form?id=${id}&offerId=${currentOffer.id}` as any)}
                  >
                    <Edit size={16} color="#F97316" />
                    <Text style={styles.editButtonText}>Edit Offer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.offerActionButton, styles.viewButton]}
                    onPress={() => router.push(`/ad-products/${currentOffer.id}` as any)}
                  >
                    <Eye size={16} color="#3b82f6" />
                    <Text style={styles.viewButtonText}>View Offer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.createOfferButton}
                onPress={() => router.push(`/offer-form?id=${id}` as any)}
              >
                <Plus size={20} color="#F97316" />
                <Text style={styles.createOfferText}>Create Your First Offer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Spin the Wheel Feature Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎡 Spin the Wheel Feature</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Enable this feature to let customers win discount codes valid on your products. Customers can spin once every 24 hours.
            </Text>
            
            <View style={styles.spinWheelToggleRow}>
              <View style={styles.spinWheelInfo}>
                <Text style={styles.spinWheelLabel}>Enable Spin the Wheel</Text>
                <Text style={styles.spinWheelSubtext}>
                  {spinWheelEnabled 
                    ? '✅ Your business is participating' 
                    : '❌ Not participating'}
                </Text>
              </View>
              <Switch
                value={spinWheelEnabled}
                onValueChange={setSpinWheelEnabled}
                trackColor={{ false: '#d1d5db', true: '#a7f3d0' }}
                thumbColor={spinWheelEnabled ? '#10b981' : '#f3f4f6'}
              />
            </View>

            {spinWheelEnabled && (
              <>
                {/* Discount Configuration */}
                <View style={styles.discountConfigSection}>
                  <Text style={styles.discountConfigTitle}>Configure Discount Values (₹)</Text>
                  <Text style={styles.discountConfigDescription}>
                    Set the discount amounts customers can win. Add or remove values as needed.
                  </Text>
                  
                  {/* Display current discounts */}
                  <View style={styles.discountChipsContainer}>
                    {spinDiscounts.map((discount) => (
                      <View key={discount} style={styles.discountChip}>
                        <Text style={styles.discountChipText}>₹{discount}</Text>
                        <TouchableOpacity 
                          onPress={() => handleRemoveDiscount(discount)}
                          style={styles.removeChipButton}
                        >
                          <X size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  {/* Add new discount */}
                  <View style={styles.addDiscountRow}>
                    <TextInput
                      style={styles.discountInput}
                      value={newDiscountInput}
                      onChangeText={setNewDiscountInput}
                      placeholder="Enter amount (e.g., 15)"
                      keyboardType="number-pad"
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity 
                      style={styles.addDiscountButton}
                      onPress={handleAddDiscount}
                    >
                      <Plus size={20} color="#fff" />
                      <Text style={styles.addDiscountButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Benefits */}
                <View style={styles.spinWheelBenefits}>
                  <Text style={styles.benefitsTitle}>Benefits:</Text>
                  <Text style={styles.benefitItem}>• Attract more customers</Text>
                  <Text style={styles.benefitItem}>• Increase repeat purchases</Text>
                  <Text style={styles.benefitItem}>• Free marketing feature</Text>
                  <Text style={styles.benefitItem}>• Build customer loyalty</Text>
                </View>
              </>
            )}
          </View>

          {/* Business Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            
            {/* Business Image */}
            <Text style={styles.label}>Business Logo/Image</Text>
            <TouchableOpacity 
              style={styles.imageUploadButton} 
              onPress={handlePickImage}
              disabled={uploading}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.businessImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Upload size={40} color="#999" />
                  <Text style={styles.uploadText}>Tap to upload image</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter business name"
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter business description"
              multiline
              numberOfLines={4}
            />
            
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter business address"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Delivery & Pickup Options Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery & Pickup Options</Text>
            <Text style={styles.sectionDescription}>Enable the fulfillment methods you offer</Text>
            
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setDeliveryEnabled(!deliveryEnabled)}
            >
              <View>
                <Text style={styles.optionLabel}>Delivery</Text>
                <Text style={styles.optionSubtext}>Deliver products to customer's address</Text>
              </View>
              <View style={[
                styles.checkbox,
                deliveryEnabled && styles.checkboxChecked
              ]}>
                {deliveryEnabled && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setPickupEnabled(!pickupEnabled)}
            >
              <View>
                <Text style={styles.optionLabel}>Pickup</Text>
                <Text style={styles.optionSubtext}>Customers can pick up from your location</Text>
              </View>
              <View style={[
                styles.checkbox,
                pickupEnabled && styles.checkboxChecked
              ]}>
                {pickupEnabled && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Order Mode Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Type</Text>
            <Text style={styles.sectionDescription}>Choose which order types you accept</Text>
            {orderModeOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionRow}
                onPress={() => setOrderMode(option.id)}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                <View style={[
                  styles.radioButton,
                  orderMode === option.id && styles.radioButtonSelected
                ]}>
                  {orderMode === option.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Methods Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <Text style={styles.sectionDescription}>Select accepted payment options</Text>
            {paymentOptions.map(option => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionRow}
                onPress={() => togglePaymentMethod(option.id)}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                <View style={[
                  styles.checkbox,
                  selectedPaymentMethods.includes(option.id) && styles.checkboxChecked
                ]}>
                  {selectedPaymentMethods.includes(option.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Delivery Settings Section - Only show if delivery is enabled */}
          {deliveryEnabled && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Settings</Text>
              
              <Text style={styles.label}>Delivery Fee (₹)</Text>
              <TextInput
                style={styles.input}
                value={deliveryFee}
                onChangeText={setDeliveryFee}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
              
              <Text style={styles.label}>Minimum Order Value</Text>
              <TextInput
                style={styles.input}
                value={minOrder}
                onChangeText={setMinOrder}
                placeholder="₹500"
              />
              
              <Text style={styles.label}>Estimated Delivery Time</Text>
              <TextInput
                style={styles.input}
                value={deliveryTime}
                onChangeText={setDeliveryTime}
                placeholder="2-4 days"
              />
            </View>
          )}

          {/* Save Changes Button */}
          <TouchableOpacity
            style={[styles.saveButton, (saving || uploading) && styles.saveButtonDisabled]}
            onPress={handleSaveChanges}
            disabled={saving || uploading}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          {/* Delete Business Button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteBusiness}
          >
            <Trash2 size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete Business</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    columnGap: 12,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  spinWheelToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  spinWheelInfo: {
    flex: 1,
  },
  spinWheelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  spinWheelSubtext: {
    fontSize: 13,
    color: '#666',
  },
  discountConfigSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  discountConfigTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  discountConfigDescription: {
    fontSize: 13,
    color: '#78350f',
    marginBottom: 12,
  },
  discountChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    marginBottom: 12,
  },
  discountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 20,
    columnGap: 6,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  discountChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
  },
  removeChipButton: {
    padding: 2,
  },
  addDiscountRow: {
    flexDirection: 'row',
    columnGap: 8,
  },
  discountInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  addDiscountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addDiscountButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  spinWheelBenefits: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 13,
    color: '#166534',
    marginBottom: 4,
  },
  offerLoading: {
    padding: 20,
    alignItems: 'center',
  },
  offerCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  offerHeader: {
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  offerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#6b7280',
  },
  offerImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f3f4f6',
  },
  analyticsRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
    columnGap: 4,
  },
  analyticsDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  offerActions: {
    flexDirection: 'row',
    columnGap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  offerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#fff7ed',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  viewButton: {
    backgroundColor: '#eff6ff',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  createOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    padding: 16,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fed7aa',
    borderStyle: 'dashed',
  },
  createOfferText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F97316',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageUploadButton: {
    marginBottom: 16,
  },
  businessImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FF6B35',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
});
