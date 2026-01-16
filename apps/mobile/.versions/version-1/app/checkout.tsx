import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Phone, Mail, User, FileText, CreditCard, Banknote, Truck, Store, Wallet, Clock, CheckCircle2 } from 'lucide-react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useCartStore, useUserStore, CustomOrderRequest } from '@/lib/store';
import { createOrder, fetchBusiness, createCustomOrder } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const { 
    items, 
    customOrders,
    selectedBusinessId, 
    getSelectedBusinessItems, 
    getSelectedBusinessName,
    getTotal,
    clearBusinessCart,
    clearCart,
    selectBusiness,
    getBusinessCarts,
    getCustomOrdersForBusiness,
    removeCustomOrder,
  } = useCartStore();
  const { user, isLoggedIn } = useUserStore();
  
  // Device ID for non-logged-in orders
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Determine current business ID - use selectedBusinessId or the only business in cart
  const businessCarts = getBusinessCarts();
  
  // Get all unique business IDs from both products and custom orders
  const allBusinessIds = new Set<number>();
  items.forEach(item => allBusinessIds.add(item.business_id));
  customOrders.forEach(order => allBusinessIds.add(order.business_id));
  const allBusinessIdsArray = Array.from(allBusinessIds);
  
  const currentBusinessId = selectedBusinessId || (allBusinessIdsArray.length === 1 ? allBusinessIdsArray[0] : null);
  
  // Get items for current business (products)
  const currentItems = currentBusinessId 
    ? items.filter(i => i.business_id === currentBusinessId)
    : items;
  
  // Get custom orders for current business
  const currentCustomOrders = currentBusinessId 
    ? customOrders.filter(o => o.business_id === currentBusinessId)
    : customOrders;
  
  // Check if we have anything to checkout
  const hasProducts = currentItems.length > 0;
  const hasCustomOrders = currentCustomOrders.length > 0;
  const hasAnythingToCheckout = hasProducts || hasCustomOrders;
  
  // Keep a ref of initial state to prevent redirect during order placement
  const initialHasItemsRef = useRef(hasAnythingToCheckout);
  const isPlacingOrder = useRef(false);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [businessPaymentMethods, setBusinessPaymentMethods] = useState<string[]>([]);
  const [businessDeliveryFee, setBusinessDeliveryFee] = useState(2.00);
  const [businessName, setBusinessName] = useState(
    currentItems[0]?.business_name || currentCustomOrders[0]?.business_name || 'Store'
  );
  const [businessDeliveryEnabled, setBusinessDeliveryEnabled] = useState(true);
  const [businessPickupEnabled, setBusinessPickupEnabled] = useState(true);
  
  // Guest checkout form data
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  
  // Delivery form data - default to custom order preference if only custom orders
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

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
        setBusinessName(business.name || currentItems[0]?.business_name || currentCustomOrders[0]?.business_name || 'Store');
        
        // Set delivery/pickup availability
        const deliveryEnabled = business.delivery_enabled !== false; // Default to true
        const pickupEnabled = business.pickup_enabled !== false; // Default to true
        setBusinessDeliveryEnabled(deliveryEnabled);
        setBusinessPickupEnabled(pickupEnabled);
        
        // Set default delivery type based on availability
        if (hasCustomOrders && !hasProducts && currentCustomOrders[0]?.delivery_preference) {
          // Use custom order preference if only custom orders
          setDeliveryType(currentCustomOrders[0].delivery_preference);
        } else if (deliveryEnabled) {
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

  // Calculate totals - only for products (custom orders have no price yet)
  const subtotal = currentItems.reduce((sum, item) => sum + (parsePrice(item.price) * item.quantity), 0);
  const deliveryFee = deliveryType === 'delivery' ? parsePrice(businessDeliveryFee) : 0;
  const total = subtotal + deliveryFee;

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
    if (step === 1) {
      if (navigation.canGoBack()) {
        router.back();
      } else {
        router.replace('/cart');
      }
    } else {
      setStep(step - 1);
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      // Validate customer info
      if (!customerName.trim()) {
        Alert.alert('Missing Name', 'Please enter your name');
        return;
      }
      if (!customerPhone.trim()) {
        Alert.alert('Missing Phone', 'Please enter your phone number for order updates');
        return;
      }
      if (!customerEmail.trim()) {
        Alert.alert('Missing Email', 'Please enter your email for order confirmation');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate delivery info
      if (deliveryType === 'delivery' && !address.trim()) {
        Alert.alert('Missing Address', 'Please enter a delivery address');
        return;
      }
      setStep(3);
    }
  };

  const getPaymentLabel = (method: PaymentMethod) => {
    const found = ALL_PAYMENT_METHODS.find(m => m.id === method);
    return found?.label || method;
  };

  const handlePlaceOrder = async () => {
    if (!currentBusinessId) return;

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

      // Prepare custom order descriptions for the order
      const customOrderDescriptions = currentCustomOrders.map(co => ({
        description: co.description,
        image_url: co.image_url,
        delivery_preference: co.delivery_preference,
      }));

      const orderData = {
        user_id: user?.id,
        device_id: !isLoggedIn ? deviceId || undefined : undefined, // FIXED: Include device_id for non-logged-in users
        business_id: currentBusinessId,
        order_number: orderNumber,
        delivery_type: deliveryType,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        delivery_address: deliveryType === 'delivery' ? address.trim() : undefined,
        payment_method: paymentMethod,
        subtotal: hasProducts ? subtotal : 0,
        delivery_fee: deliveryFee,
        total: hasProducts ? total : 0,
        notes: specialInstructions.trim() || undefined,
        special_instructions: specialInstructions.trim() || undefined,
        items: orderItems,
        custom_orders: customOrderDescriptions.length > 0 ? customOrderDescriptions : undefined,
        is_custom_order: hasCustomOrders && !hasProducts, // Flag for pure custom orders
      };

      console.log('Creating order with data:', orderData);

      const result = await createOrder(orderData);
      
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
        total: total.toString(),
        specialInstructions: specialInstructions.trim(),
        businessName,
        items: JSON.stringify(orderItems),
        customOrderCount: currentCustomOrders.length.toString(),
        isCustomOrderOnly: (!hasProducts && hasCustomOrders).toString(),
        createdAt: new Date().toISOString(),
      };
      
      // Clear only this business's cart (not the entire cart if multi-business)
      if (allBusinessIdsArray.length > 1) {
        clearBusinessCart(currentBusinessId);
      } else {
        clearCart();
      }
      
      // Reset selected business
      selectBusiness(null);
      
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backIcon} 
          onPress={handleBack}
        >
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 1 ? 'Your Details' : step === 2 ? 'Delivery' : 'Payment'}
        </Text>
        <Text style={styles.stepText}>Step {step}/3</Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {step === 1 ? (
          <>
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
            </View>

            {!isLoggedIn && (
              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptText}>Have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/sign-in')}>
                  <Text style={styles.loginLink}>Sign in for faster checkout</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : step === 2 ? (
          <>
            {/* Delivery Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How would you like to receive your order?</Text>
              
              {!hasDeliveryOption && !hasPickupOption && (
                <View style={styles.noOptionsWarning}>
                  <Text style={styles.noOptionsText}>This store doesn't have delivery or pickup enabled yet.</Text>
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
                    {hasProducts && (
                      <Text style={[styles.optionPrice, deliveryType === 'delivery' && styles.optionPriceActive]}>
                        ₹{parsePrice(businessDeliveryFee).toFixed(2)}
                      </Text>
                    )}
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
                    placeholder="Enter your full address"
                    placeholderTextColor="#9ca3af"
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>
            )}

            {/* Special Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Special Instructions</Text>
              <Text style={styles.sectionSubtitle}>Any specific requests for the seller?</Text>
              <View style={styles.instructionsContainer}>
                <FileText size={18} color="#9ca3af" style={styles.instructionsIcon} />
                <TextInput
                  style={styles.instructionsInput}
                  placeholder="E.g., Gift wrap, specific packaging, handle with care..."
                  placeholderTextColor="#9ca3af"
                  value={specialInstructions}
                  onChangeText={setSpecialInstructions}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Payment Method */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Payment Method</Text>
              
              {/* For custom orders only, show pay later notice */}
              {!hasProducts && hasCustomOrders && (
                <View style={styles.customOrderPaymentNote}>
                  <Clock size={18} color="#f97316" />
                  <Text style={styles.customOrderPaymentNoteText}>
                    You'll pay after receiving the price estimate from the store
                  </Text>
                </View>
              )}
              
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
                  {hasProducts ? `${currentItems.length} item${currentItems.length > 1 ? 's' : ''}` : ''}
                  {hasProducts && hasCustomOrders ? ' + ' : ''}
                  {hasCustomOrders ? `${currentCustomOrders.length} custom request${currentCustomOrders.length > 1 ? 's' : ''}` : ''}
                  {' from '}{businessName}
                </Text>
                
                {/* Product Items List */}
                {hasProducts && (
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
                )}
                
                {/* Custom Orders List */}
                {hasCustomOrders && (
                  <View style={styles.customOrdersList}>
                    <View style={styles.customOrdersHeader}>
                      <FileText size={16} color="#f97316" />
                      <Text style={styles.customOrdersHeaderText}>Custom Requests</Text>
                    </View>
                    {currentCustomOrders.map((order, index) => (
                      <View key={order.id} style={styles.customOrderSummaryItem}>
                        <Text style={styles.customOrderSummaryText} numberOfLines={2}>
                          {order.description}
                        </Text>
                        <Text style={styles.customOrderSummaryNote}>Price TBD</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={styles.divider} />
                
                {hasProducts && (
                  <>
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
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
                    </View>
                  </>
                )}
                
                {/* Custom orders estimate note */}
                {hasCustomOrders && (
                  <View style={styles.customEstimateNote}>
                    <Clock size={16} color="#f97316" />
                    <Text style={styles.customEstimateText}>
                      {hasProducts 
                        ? 'Custom request prices will be added later'
                        : 'You\'ll receive a price estimate from the store'}
                    </Text>
                  </View>
                )}
                
                <View style={styles.paymentSummary}>
                  <Wallet size={16} color="#6b7280" />
                  <Text style={styles.paymentSummaryText}>
                    Payment: {getPaymentLabel(paymentMethod)}
                  </Text>
                </View>

                <View style={styles.deliverySummary}>
                  {deliveryType === 'delivery' ? (
                    <Truck size={16} color="#6b7280" />
                  ) : (
                    <Store size={16} color="#6b7280" />
                  )}
                  <Text style={styles.deliverySummaryText}>
                    {deliveryType === 'delivery' ? 'Delivery to your address' : 'Pickup from store'}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer Button */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {step < 3 ? (
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.placeOrderButton, loading && styles.buttonDisabled]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.placeOrderButtonText}>
                {hasProducts 
                  ? `Place Order - ₹${total.toFixed(2)}`
                  : 'Submit Request'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </SafeAreaView>
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
  stepText: {
    fontSize: 13,
    color: '#6b7280',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f97316',
    borderRadius: 2,
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
    gap: 12,
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
    gap: 10,
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
    padding: 16,
    gap: 4,
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
  customOrderPaymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff7ed',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  customOrderPaymentNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  paymentOptions: {
    gap: 10,
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
    gap: 12,
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
    gap: 8,
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
  customOrdersList: {
    backgroundColor: '#fff7ed',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  customOrdersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  customOrdersHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
  },
  customOrderSummaryItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#fed7aa',
  },
  customOrderSummaryText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  customOrderSummaryNote: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '500',
    marginTop: 4,
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
  customEstimateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  customEstimateText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  paymentSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paymentSummaryText: {
    fontSize: 13,
    color: '#6b7280',
  },
  deliverySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  deliverySummaryText: {
    fontSize: 13,
    color: '#6b7280',
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
  continueButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
