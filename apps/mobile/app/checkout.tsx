import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Phone, Mail, User, FileText, CreditCard, Banknote, Truck, Store, Wallet, Clock, CheckCircle2, Tag, X } from 'lucide-react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useCartStore } from '@/lib/stores/cartStore';
import { useUserStore } from '@/lib/store';
import { createOrder, fetchBusiness } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';

type PaymentMethod = 'gpay' | 'paytm' | 'card' | 'cod' | 'cop';

// Helper function to safely parse price to number
const parsePrice = (price: any): number => {
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Generate random order number
const generateOrderNumber = () => {
  const prefix = 'ORD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const ALL_PAYMENT_METHODS = [
  { id: 'gpay', label: 'Google Pay', icon: null, isOnline: true },
  { id: 'paytm', label: 'Paytm', icon: null, isOnline: true },
  { id: 'card', label: 'Credit/Debit Card', icon: CreditCard, isOnline: true },
  { id: 'cod', label: 'Cash on Delivery', icon: Banknote, isOnline: false, description: 'Pay when you receive' },
  { id: 'cop', label: 'Cash on Pickup', icon: Store, isOnline: false, description: 'Pay at the store' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const cartStore = useCartStore();
  const { user, isLoggedIn } = useUserStore();
  
  // Device ID for non-logged-in orders
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Get business carts
  const businessCarts = cartStore.getBusinessCarts();
  
  // For now, checkout the first business (or you can enhance this to let user select)
  const selectedBusinessCart = businessCarts[0];
  const currentBusinessId = selectedBusinessCart?.business_id;
  const currentItems = selectedBusinessCart?.items || [];
  const businessName = selectedBusinessCart?.business_name || 'Store';
  
  // Check if we have anything to checkout
  const hasAnythingToCheckout = currentItems.length > 0;
  
  // Keep a ref of initial state to prevent redirect during order placement
  const initialHasItemsRef = useRef(hasAnythingToCheckout);
  const isPlacingOrder = useRef(false);
  
  const [loading, setLoading] = useState(false);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [businessPaymentMethods, setBusinessPaymentMethods] = useState<string[]>([]);
  const [businessDeliveryFee, setBusinessDeliveryFee] = useState(2.00);
  const [businessDeliveryEnabled, setBusinessDeliveryEnabled] = useState(true);
  const [businessPickupEnabled, setBusinessPickupEnabled] = useState(true);
  
  // Guest checkout form data
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  
  // Delivery form data
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  // Discount code
  const [discountCode, setDiscountCode] = useState('');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
  } | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  // Initialize device ID
  useEffect(() => {
    initDeviceId();
  }, []);

  const initDeviceId = async () => {
    try {
      let storedDeviceId = await AsyncStorage.getItem('device_id');
      if (!storedDeviceId) {
        // Generate a unique device ID
        storedDeviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await AsyncStorage.setItem('device_id', storedDeviceId);
      }
      setDeviceId(storedDeviceId);
    } catch (error) {
      console.error('Error initializing device ID:', error);
    }
  };

  useEffect(() => {
    // Only redirect if not placing order and nothing to checkout from the start
    if (!isPlacingOrder.current && !hasAnythingToCheckout && !initialHasItemsRef.current) {
      router.replace('/cart');
    }
  }, []);

  useEffect(() => {
    loadBusinessDetails();
  }, [currentBusinessId]);

  const loadBusinessDetails = async () => {
    if (!currentBusinessId) {
      setLoadingBusiness(false);
      return;
    }
    
    try {
      setLoadingBusiness(true);
      const business = await fetchBusiness(currentBusinessId);
      if (business) {
        // Normalize payment methods to lowercase
        const normalizedPaymentMethods = (business.payment_methods || []).map((m: string) => m.toLowerCase());
        setBusinessPaymentMethods(normalizedPaymentMethods);
        setBusinessDeliveryFee(parsePrice(business.delivery_fee) || 2.00);
        
        // Set delivery/pickup availability
        const deliveryEnabled = business.delivery_enabled !== false; // Default to true
        const pickupEnabled = business.pickup_enabled !== false; // Default to true
        setBusinessDeliveryEnabled(deliveryEnabled);
        setBusinessPickupEnabled(pickupEnabled);
        
        // Set default delivery type based on availability
        if (deliveryEnabled) {
          setDeliveryType('delivery');
        } else if (pickupEnabled) {
          setDeliveryType('pickup');
        }
        
        // Set default payment method based on available methods and delivery type
        const hasOnlinePayment = normalizedPaymentMethods.some((m: string) => ['gpay', 'paytm', 'card'].includes(m));
        
        if (deliveryEnabled && (normalizedPaymentMethods.includes('cod') || hasOnlinePayment)) {
          setPaymentMethod(normalizedPaymentMethods.includes('cod') ? 'cod' : (normalizedPaymentMethods[0] as PaymentMethod));
        } else if (pickupEnabled && (normalizedPaymentMethods.includes('cop') || hasOnlinePayment)) {
          setPaymentMethod(normalizedPaymentMethods.includes('cop') ? 'cop' : (normalizedPaymentMethods[0] as PaymentMethod));
        } else if (normalizedPaymentMethods.length > 0) {
          setPaymentMethod(normalizedPaymentMethods[0] as PaymentMethod);
        }
      }
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoadingBusiness(false);
    }
  };

  // Calculate totals
  const subtotal = currentItems.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);
  const deliveryFee = deliveryType === 'delivery' ? parsePrice(businessDeliveryFee) : 0;
  
  // Calculate discount - discount_amount is always a fixed amount in rupees
  const discountAmount = appliedDiscount ? Math.min(appliedDiscount.amount, subtotal) : 0;
  
  const total = subtotal + deliveryFee - discountAmount;

  // Filter available payment methods
  const availablePaymentMethods = ALL_PAYMENT_METHODS.filter(method => 
    businessPaymentMethods.includes(method.id)
  );
  
  const onlinePaymentMethods = availablePaymentMethods.filter(m => m.isOnline);
  const offlinePaymentMethods = availablePaymentMethods.filter(m => !m.isOnline);

  // Check if delivery/pickup is available
  const hasDeliveryOption = businessDeliveryEnabled;
  const hasPickupOption = businessPickupEnabled;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/cart');
    }
  };

  const handleApplyCode = async () => {
    if (!discountCodeInput.trim()) {
      Alert.alert('Error', 'Please enter a discount code');
      return;
    }

    if (!currentBusinessId) {
      Alert.alert('Error', 'Unable to verify code for this business');
      return;
    }

    setValidatingCode(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/spin-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCodeInput.trim(),
          business_id: currentBusinessId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setAppliedDiscount({
          code: data.code,
          amount: data.discount_amount,
        });
        setDiscountCode(data.code);
        setDiscountCodeInput('');
        Alert.alert('Success!', `Discount code "${data.code}" applied successfully!`);
      } else {
        Alert.alert('Invalid Code', data.error || 'This code is invalid or expired');
      }
    } catch (error) {
      console.error('Error validating code:', error);
      Alert.alert('Error', 'Failed to validate code. Please try again.');
    } finally {
      setValidatingCode(false);
    }
  };

  const handleRemoveCode = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountCodeInput('');
  };

  const validateForm = (): boolean => {
    // Validate customer info
    if (!customerName.trim()) {
      Alert.alert('Missing Name', 'Please enter your name');
      return false;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Missing Phone', 'Please enter your phone number for order updates');
      return false;
    }
    if (!customerEmail.trim()) {
      Alert.alert('Missing Email', 'Please enter your email for order confirmation');
      return false;
    }
    
    // Validate delivery info
    if (deliveryType === 'delivery' && !address.trim()) {
      Alert.alert('Missing Address', 'Please enter a delivery address');
      return false;
    }
    
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!currentBusinessId) return;
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    isPlacingOrder.current = true;
    setLoading(true);
    
    // Generate order number
    const orderNumber = generateOrderNumber();
    
    try {
      // Prepare order items (products only)
      const orderItems = currentItems.map(item => ({
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        price: parsePrice(item.price),
        image: item.image,
      }));

      // FIXED: Use camelCase field names to match backend API
      const orderData = {
        userId: user?.id || null,
        deviceId: !isLoggedIn ? (deviceId || null) : null,
        businessId: currentBusinessId,
        orderNumber: orderNumber,
        deliveryType: deliveryType,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        deliveryAddress: deliveryType === 'delivery' ? address.trim() : null,
        paymentMethod: paymentMethod,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        discountCode: discountCode || null,
        discountAmount: discountAmount || 0,
        total: total,
        notes: specialInstructions.trim() || null,
        specialInstructions: specialInstructions.trim() || null,
        items: orderItems,
      };

      console.log('Creating order with data:', orderData);

      const result = await createOrder(orderData);
      
      // If discount code was applied, mark it as used
      if (discountCode) {
        try {
          await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/spin-codes/mark-used`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: discountCode }),
          });
        } catch (error) {
          console.error('Error marking code as used:', error);
          // Don't fail the order if this fails
        }
      }
      
      // Prepare order details to pass to success screen
      const orderDetails = {
        orderId: result.id?.toString() || '',
        orderNumber: result.order_number || orderNumber,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? address.trim() : '',
        paymentMethod,
        subtotal: subtotal.toString(),
        deliveryFee: deliveryFee.toString(),
        discountAmount: discountAmount.toString(),
        total: total.toString(),
        specialInstructions: specialInstructions.trim(),
        businessName,
        items: JSON.stringify(orderItems),
        createdAt: new Date().toISOString(),
        // Add missing params to prevent undefined errors
        customOrderCount: '0',
        customOrders: '[]',
        isCustomOrderOnly: 'false',
      };
      
      // Clear cart for this business
      cartStore.clearBusinessCart(currentBusinessId);
      
      // Navigate to success screen
      router.replace({
        pathname: '/order-success',
        params: orderDetails,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
      isPlacingOrder.current = false;
      setLoading(false);
    }
  };

  // Show nothing if nothing to checkout and we weren't placing an order
  if (!hasAnythingToCheckout && !isPlacingOrder.current && !initialHasItemsRef.current) {
    return null;
  }

  if (loadingBusiness) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backIcon} 
            onPress={handleBack}
          >
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Customer Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <Text style={styles.sectionSubtitle}>We'll send order updates to this contact</Text>
            
            <View style={styles.inputContainer}>
              <User size={18} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Your name *"
                placeholderTextColor="#9ca3af"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Phone size={18} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Phone number *"
                placeholderTextColor="#9ca3af"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Mail size={18} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Email address *"
                placeholderTextColor="#9ca3af"
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {!isLoggedIn && (
              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptText}>Have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/sign-in')}>
                  <Text style={styles.loginLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Delivery Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Method</Text>
            
            {!hasDeliveryOption && !hasPickupOption && (
              <View style={styles.noOptionsWarning}>
                <Text style={styles.noOptionsText}>This store has not enabled delivery or pickup options</Text>
              </View>
            )}
            
            <View style={styles.optionRow}>
              {hasDeliveryOption && (
                <TouchableOpacity 
                  style={[styles.optionCard, deliveryType === 'delivery' && styles.optionCardActive]}
                  onPress={() => setDeliveryType('delivery')}
                >
                  <View style={[styles.optionIconBg, deliveryType === 'delivery' && styles.optionIconBgActive]}>
                    <Truck size={24} color={deliveryType === 'delivery' ? '#f97316' : '#6b7280'} />
                  </View>
                  <Text style={[styles.optionText, deliveryType === 'delivery' && styles.optionTextActive]}>
                    Delivery
                  </Text>
                  <Text style={styles.optionSubtext}>To your address</Text>
                  <Text style={[styles.optionPrice, deliveryType === 'delivery' && styles.optionPriceActive]}>
                    ₹{parsePrice(businessDeliveryFee).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )}
              {hasPickupOption && (
                <TouchableOpacity 
                  style={[styles.optionCard, deliveryType === 'pickup' && styles.optionCardActive]}
                  onPress={() => setDeliveryType('pickup')}
                >
                  <View style={[styles.optionIconBg, deliveryType === 'pickup' && styles.optionIconBgActive]}>
                    <Store size={24} color={deliveryType === 'pickup' ? '#f97316' : '#6b7280'} />
                  </View>
                  <Text style={[styles.optionText, deliveryType === 'pickup' && styles.optionTextActive]}>
                    Pickup
                  </Text>
                  <Text style={styles.optionSubtext}>From the store</Text>
                  <Text style={[styles.optionPrice, deliveryType === 'pickup' && styles.optionPriceActive]}>
                    Free
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Address */}
          {deliveryType === 'delivery' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <View style={styles.inputContainer}>
                <MapPin size={18} color="#9ca3af" />
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Enter your full address *"
                  placeholderTextColor="#9ca3af"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          )}

          {/* Discount Code */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discount Code</Text>
            <Text style={styles.sectionSubtitle}>Have a spin wheel code? Apply it here!</Text>
            
            {!appliedDiscount ? (
              <View style={styles.discountRow}>
                <View style={styles.discountInputContainer}>
                  <Tag size={18} color="#9ca3af" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter code (e.g., SPIN-ABC123)"
                    placeholderTextColor="#9ca3af"
                    value={discountCodeInput}
                    onChangeText={setDiscountCodeInput}
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.applyButton, validatingCode && styles.applyButtonDisabled]}
                  onPress={handleApplyCode}
                  disabled={validatingCode}
                >
                  {validatingCode ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.applyButtonText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.appliedCodeContainer}>
                <View style={styles.appliedCodeLeft}>
                  <Tag size={18} color="#22c55e" />
                  <View>
                    <Text style={styles.appliedCodeText}>{appliedDiscount.code}</Text>
                    <Text style={styles.appliedCodeSubtext}>
                      ₹{appliedDiscount.amount} off
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleRemoveCode}>
                  <X size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Special Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <Text style={styles.sectionSubtitle}>Any specific requests for the seller?</Text>
            <View style={styles.instructionsContainer}>
              <FileText size={18} color="#9ca3af" style={styles.instructionsIcon} />
              <TextInput
                style={styles.instructionsInput}
                placeholder="Gift wrap, specific packaging, handle with care"
                placeholderTextColor="#9ca3af"
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            <View style={styles.paymentOptions}>
              {/* Online Payments */}
              {onlinePaymentMethods.length > 0 && (
                <>
                  <Text style={styles.paymentGroupTitle}>Pay Online</Text>
                  {onlinePaymentMethods.map((method) => (
                    <TouchableOpacity 
                      key={method.id}
                      style={[styles.paymentOption, paymentMethod === method.id && styles.paymentOptionActive]}
                      onPress={() => setPaymentMethod(method.id as PaymentMethod)}
                    >
                      <View style={[styles.radio, paymentMethod === method.id && styles.radioActive]}>
                        {paymentMethod === method.id && <View style={styles.radioInner} />}
                      </View>
                      {method.id === 'gpay' ? (
                        <View style={styles.paymentIconContainer}>
                          <Text style={styles.gpayIcon}>G</Text>
                        </View>
                      ) : method.id === 'paytm' ? (
                        <View style={[styles.paymentIconContainer, { backgroundColor: '#00baf2' }]}>
                          <Text style={styles.paytmIcon}>P</Text>
                        </View>
                      ) : method.icon ? (
                        <method.icon size={20} color="#6b7280" />
                      ) : null}
                      <Text style={styles.paymentText}>{method.label}</Text>
                      {paymentMethod === method.id && <CheckCircle2 size={18} color="#22c55e" />}
                    </TouchableOpacity>
                  ))}
                </>
              )}
              
              {/* Pay Later */}
              {offlinePaymentMethods.length > 0 && (
                <>
                  <Text style={[styles.paymentGroupTitle, onlinePaymentMethods.length > 0 && { marginTop: 16 }]}>
                    Pay Later
                  </Text>
                  {offlinePaymentMethods.map((method) => {
                    // Only show COD for delivery, COP for pickup
                    if (method.id === 'cod' && deliveryType !== 'delivery') return null;
                    if (method.id === 'cop' && deliveryType !== 'pickup') return null;
                    
                    return (
                      <TouchableOpacity 
                        key={method.id}
                        style={[styles.paymentOption, paymentMethod === method.id && styles.paymentOptionActive]}
                        onPress={() => setPaymentMethod(method.id as PaymentMethod)}
                      >
                        <View style={[styles.radio, paymentMethod === method.id && styles.radioActive]}>
                          {paymentMethod === method.id && <View style={styles.radioInner} />}
                        </View>
                        {method.icon && <method.icon size={20} color="#6b7280" />}
                        <View style={styles.paymentTextContainer}>
                          <Text style={styles.paymentText}>{method.label}</Text>
                          {method.description && (
                            <Text style={styles.paymentSubtext}>{method.description}</Text>
                          )}
                        </View>
                        {paymentMethod === method.id && <CheckCircle2 size={18} color="#22c55e" />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryStore}>
                {currentItems.length} item{currentItems.length > 1 ? 's' : ''} from {businessName}
              </Text>
              
              {/* Product Items List */}
              <View style={styles.itemsList}>
                {currentItems.map((item, index) => {
                  const itemPrice = parsePrice(item.price);
                  return (
                    <View key={index} style={styles.summaryItem}>
                      <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
                      <Text style={styles.itemPrice}>₹{(itemPrice * item.quantity).toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {deliveryType === 'delivery' ? 'Delivery Fee' : 'Pickup'}
                </Text>
                <Text style={styles.summaryValue}>
                  {deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : 'Free'}
                </Text>
              </View>
              {appliedDiscount && discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountLabel}>
                    Discount ({appliedDiscount.code})
                  </Text>
                  <Text style={styles.discountValue}>-₹{discountAmount.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity 
            style={[styles.placeOrderButton, loading && styles.buttonDisabled]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.placeOrderButtonText}>
                Place Order - ₹{total.toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  backIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  noOptionsWarning: {
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  noOptionsText: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    columnGap: 12,
    marginTop: 12,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  optionCardActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  optionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionIconBgActive: {
    backgroundColor: '#ffedd5',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  optionTextActive: {
    color: '#f97316',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
  },
  optionPriceActive: {
    color: '#f97316',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    columnGap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  multilineInput: {
    minHeight: 44,
  },
  discountRow: {
    flexDirection: 'row',
    columnGap: 8,
    marginTop: 8,
  },
  discountInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    columnGap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  applyButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  appliedCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86efac',
    marginTop: 8,
  },
  appliedCodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  appliedCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  appliedCodeSubtext: {
    fontSize: 12,
    color: '#22c55e',
    marginTop: 2,
  },
  instructionsContainer: {
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  instructionsIcon: {
    marginBottom: 8,
  },
  instructionsInput: {
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    columnGap: 4,
  },
  loginPromptText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '600',
  },
  paymentOptions: {
    rowGap: 10,
    marginTop: 8,
  },
  paymentGroupTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    columnGap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentOptionActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#f97316',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f97316',
  },
  paymentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#4285f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpayIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  paytmIcon: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  paymentText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  summaryStore: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  itemsList: {
    rowGap: 8,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
  },
  discountLabel: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  placeOrderButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  placeOrderButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
