import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Package, Clock, CheckCircle, Truck, Store, MapPin, Phone, Hash, Calendar, User, CreditCard, ChevronDown, Mail } from 'lucide-react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchOrder, trackOrderByNumber, updateOrderStatus, fetchUserBusinesses } from '@/lib/api';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

type OrderDetails = {
  id: number;
  order_number: string;
  status: OrderStatus;
  delivery_type: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address?: string;
  payment_method: string;
  total: number;
  business_id: number;
  business_owner_id?: number;
  created_at: string;
  updated_at: string;
  business_name?: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
};

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'ready', label: 'Ready', icon: Store },
  { key: 'out_for_delivery', label: 'On the Way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const PICKUP_STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'ready', label: 'Ready for Pickup', icon: Store },
  { key: 'delivered', label: 'Picked Up', icon: CheckCircle },
];

const ALL_STATUSES = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function TrackOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string | undefined;
  const orderNumberParam = (params.orderNumber || params.order_number) as string | undefined;
  
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Check if we have a direct order reference (no search needed)
  const hasDirectOrder = !!orderId || !!orderNumberParam;

  useEffect(() => {
    checkIfBusinessOwner();
    // CRITICAL FIX: Prioritize order number over ID
    // Order number is more reliable and always exists
    if (orderNumberParam) {
      setSearchOrderNumber(orderNumberParam);
      searchOrder(orderNumberParam);
    } else if (orderId) {
      loadOrderById(Number(orderId));
    }
  }, [orderId, orderNumberParam]);

  const checkIfBusinessOwner = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setCurrentUserId(userData.id);
        if (userData.is_business_user) {
          const businesses = await fetchUserBusinesses(userData.id);
          if (businesses && businesses.length > 0) {
            setIsBusinessOwner(true);
          }
        }
      }
    } catch (error) {
      console.error('Error checking business owner:', error);
    }
  };

  const loadOrderById = async (id: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchOrder(id);
      setOrder(data);
    } catch (err) {
      setError('Unable to load order');
    } finally {
      setLoading(false);
    }
  };

  const searchOrder = async (orderNum?: string) => {
    const numToSearch = orderNum || searchOrderNumber.trim();
    if (!numToSearch) {
      Alert.alert('Enter Order Number', 'Please enter your order number to track');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await trackOrderByNumber(numToSearch);
      if (data) {
        setOrder(data);
      } else {
        setError('Order not found. Please check the order number.');
      }
    } catch (err) {
      setError('Unable to find order. Please check the order number.');
    } finally {
      setLoading(false);
    }
  };

  // Check if current user is the owner of this order's business
  const canUpdateStatus = () => {
    if (!order || !currentUserId || !isBusinessOwner) return false;
    // Check if the business_owner_id matches current user
    return order.business_owner_id === currentUserId;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    
    setUpdatingStatus(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder({ ...order, status: newStatus as OrderStatus });
      setShowStatusPicker(false);
      Alert.alert('Success', `Order status updated to "${newStatus.replace('_', ' ')}"`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusIndex = (status: string) => {
    const steps = order?.delivery_type === 'pickup' ? PICKUP_STATUS_STEPS : STATUS_STEPS;
    const index = steps.findIndex(s => s.key === status.toLowerCase());
    return index >= 0 ? index : 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return '₹' + Number(amount).toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#10b981';
      case 'out_for_delivery': return '#06b6d4';
      case 'delivered': return '#22c55e';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const statusSteps = order?.delivery_type === 'pickup' ? PICKUP_STATUS_STEPS : STATUS_STEPS;
  const currentStep = order ? getStatusIndex(order.status) : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Track Order",
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 0 }}>
              <ArrowLeft size={22} color="#111827" />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Search Box - only show if no direct order reference */}
          {!hasDirectOrder && (
            <View style={styles.searchSection}>
              <Text style={styles.searchLabel}>Enter your order number</Text>
              <View style={styles.searchRow}>
                <View style={styles.searchInputContainer}>
                  <Search size={18} color="#9ca3af" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="e.g., EZPXYZ123"
                    placeholderTextColor="#9ca3af"
                    value={searchOrderNumber}
                    onChangeText={setSearchOrderNumber}
                    autoCapitalize="characters"
                  />
                </View>
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={() => searchOrder()}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.searchButtonText}>Track</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading && !order && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.loadingText}>Loading order details...</Text>
            </View>
          )}

          {error && !order && (
            <View style={styles.errorContainer}>
              <Package size={48} color="#d1d5db" />
              <Text style={styles.errorTitle}>Order Not Found</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {order && (
            <>
              {/* Order Summary Card */}
              <View style={styles.orderCard}>
                <Text style={styles.cardTitle}>Order Summary</Text>
                
                {/* Order Number */}
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Hash size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Order Number</Text>
                  </View>
                  <Text style={styles.orderNumber}>{order.order_number}</Text>
                </View>

                {/* Date */}
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Calendar size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Date</Text>
                  </View>
                  <Text style={styles.detailValue}>{formatDate(order.created_at)}</Text>
                </View>

                {/* Customer Name */}
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <User size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Customer Name</Text>
                  </View>
                  <Text style={styles.detailValue}>{order.customer_name}</Text>
                </View>

                {/* Customer Phone */}
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Phone size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Phone</Text>
                  </View>
                  <Text style={styles.detailValue}>{order.customer_phone}</Text>
                </View>

                {/* Customer Email */}
                {order.customer_email && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailRowLeft}>
                      <Mail size={16} color="#6b7280" />
                      <Text style={styles.detailLabel}>Email</Text>
                    </View>
                    <Text style={styles.detailValue} numberOfLines={1}>{order.customer_email}</Text>
                  </View>
                )}

                {/* Total */}
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <CreditCard size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Total</Text>
                  </View>
                  <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
                </View>

                {/* Status - with update option for business owners */}
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Order Status</Text>
                  {canUpdateStatus() ? (
                    <TouchableOpacity 
                      style={[styles.statusBadgeClickable, { backgroundColor: getStatusColor(order.status) + '20' }]}
                      onPress={() => setShowStatusPicker(true)}
                    >
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(order.status) }]}>
                        {order.status.replace('_', ' ')}
                      </Text>
                      <ChevronDown size={14} color={getStatusColor(order.status)} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.status) + '20' }
                    ]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(order.status) }]}>
                        {order.status.replace('_', ' ')}
                      </Text>
                    </View>
                  )}
                </View>

                {canUpdateStatus() && (
                  <Text style={styles.updateHint}>Tap the status to update it</Text>
                )}

                {order.business_name && (
                  <View style={styles.businessRow}>
                    <Store size={16} color="#6b7280" />
                    <Text style={styles.businessName}>{order.business_name}</Text>
                  </View>
                )}
              </View>

              {/* Status Timeline */}
              <View style={styles.timelineCard}>
                <Text style={styles.cardTitle}>Order Progress</Text>
                
                {order.status === 'cancelled' ? (
                  <View style={styles.cancelledContainer}>
                    <View style={styles.cancelledIcon}>
                      <Text style={styles.cancelledX}>✕</Text>
                    </View>
                    <Text style={styles.cancelledText}>Order Cancelled</Text>
                  </View>
                ) : (
                  <View style={styles.timeline}>
                    {statusSteps.map((step, index) => {
                      const isCompleted = index <= currentStep;
                      const isCurrent = index === currentStep;
                      const StepIcon = step.icon;
                      
                      return (
                        <View key={step.key} style={styles.timelineStep}>
                          <View style={styles.timelineLeft}>
                            <View style={[
                              styles.timelineDot,
                              isCompleted && styles.timelineDotCompleted,
                              isCurrent && styles.timelineDotCurrent,
                            ]}>
                              <StepIcon 
                                size={14} 
                                color={isCompleted ? '#ffffff' : '#9ca3af'} 
                              />
                            </View>
                            {index < statusSteps.length - 1 && (
                              <View style={[
                                styles.timelineLine,
                                isCompleted && styles.timelineLineCompleted,
                              ]} />
                            )}
                          </View>
                          <View style={styles.timelineContent}>
                            <Text style={[
                              styles.timelineLabel,
                              isCompleted && styles.timelineLabelCompleted,
                              isCurrent && styles.timelineLabelCurrent,
                            ]}>
                              {step.label}
                            </Text>
                            {isCurrent && (
                              <Text style={styles.timelineCurrentText}>Current status</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Delivery Details */}
              <View style={styles.detailsCard}>
                <Text style={styles.cardTitle}>
                  {order.delivery_type === 'delivery' ? 'Delivery Details' : 'Pickup Details'}
                </Text>
                
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#6b7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>
                      {order.delivery_type === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                    </Text>
                    <Text style={styles.infoValue}>
                      {order.delivery_address || 'Store location'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.infoRow}>
                  <Phone size={16} color="#6b7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Contact</Text>
                    <Text style={styles.infoValue}>{order.customer_phone}</Text>
                  </View>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.detailsCard}>
                <Text style={styles.cardTitle}>Order Items</Text>
                {order.items?.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.quantity}x {item.product_name}</Text>
                    <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.grandTotal}>{formatCurrency(order.total)}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {order && (
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => router.push('/contact')}
            >
              <Text style={styles.helpButtonText}>Need Help?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Picker Modal */}
        <Modal
          visible={showStatusPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStatusPicker(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowStatusPicker(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update Order Status</Text>
              <Text style={styles.modalSubtitle}>
                Customer will be notified via app, email, and SMS
              </Text>
              
              {ALL_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status.key}
                  style={[
                    styles.statusOption,
                    order?.status === status.key && styles.statusOptionSelected,
                  ]}
                  onPress={() => handleStatusUpdate(status.key)}
                  disabled={updatingStatus}
                >
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(status.key) }]} />
                  <Text style={[
                    styles.statusOptionText,
                    order?.status === status.key && styles.statusOptionTextSelected,
                  ]}>
                    {status.label}
                  </Text>
                  {order?.status === status.key && (
                    <Text style={styles.currentLabel}>Current</Text>
                  )}
                </TouchableOpacity>
              ))}

              {updatingStatus && (
                <View style={styles.updatingOverlay}>
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text style={styles.updatingText}>Updating status...</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowStatusPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  searchSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    columnGap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    columnGap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    padding: 60,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    maxWidth: '50%',
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    columnGap: 4,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  updateHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 8,
    fontStyle: 'italic',
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  businessName: {
    fontSize: 14,
    color: '#374151',
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineStep: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 32,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#22c55e',
  },
  timelineDotCurrent: {
    backgroundColor: '#f97316',
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#22c55e',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  timelineLabelCompleted: {
    color: '#374151',
  },
  timelineLabelCurrent: {
    color: '#111827',
    fontWeight: '600',
  },
  timelineCurrentText: {
    fontSize: 12,
    color: '#f97316',
    marginTop: 4,
  },
  cancelledContainer: {
    alignItems: 'center',
    padding: 20,
  },
  cancelledIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cancelledX: {
    fontSize: 24,
    color: '#ef4444',
    fontWeight: '600',
  },
  cancelledText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    columnGap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  grandTotal: {
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
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  helpButton: {
    backgroundColor: '#f9fafb',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  statusOptionSelected: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#f97316',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusOptionText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  statusOptionTextSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  currentLabel: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  updatingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#374151',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});
