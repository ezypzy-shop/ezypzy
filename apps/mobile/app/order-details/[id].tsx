import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Phone, MapPin, Package, Clock, ChevronDown } from 'lucide-react-native';
import { fetchOrder, updateOrderStatus } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OrderDetails = {
  id: number;
  order_number: string;
  business_id: number;
  business_name: string;
  business_image: string;
  business_phone: string;
  business_address: string;
  user_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address: string;
  items: any;
  subtotal: number | string;
  delivery_fee: number | string;
  total: number | string;
  status: string;
  payment_method: string;
  delivery_type: string;
  created_at: string;
  updated_at: string;
};

const statusConfig = {
  all: { color: '#6B7280', label: 'All' },
  pending: { color: '#F59E0B', label: 'Pending' },
  processing: { color: '#3B82F6', label: 'Processing' },
  delivered: { color: '#10B981', label: 'Delivered' },
  'pick up': { color: '#8B5CF6', label: 'Pick Up' },
  cancelled: { color: '#EF4444', label: 'Cancelled' },
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessIds, setBusinessIds] = useState<number[]>([]);
  const [userPhone, setUserPhone] = useState<string>('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    checkBusinessAccess();
    loadOrderDetails();
  }, [id]);

  const checkBusinessAccess = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        
        // Save user phone for authorization
        setUserPhone(userData.phone || '');
        
        if (userData.is_business_user === true) {
          setIsBusiness(true);
          
          // Fetch user's businesses
          const response = await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/businesses?user_id=${userData.id}`);
          const data = await response.json();
          const businesses = data.businesses || [];
          setBusinessIds(businesses.map((b: any) => b.id));
        }
      }
    } catch (error) {
      console.error('Error checking business access:', error);
    }
  };

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchOrder(Number(id));
      
      // Parse items if it's a string
      if (data && typeof data.items === 'string') {
        try {
          data.items = JSON.parse(data.items);
        } catch (e) {
          console.error('Failed to parse items:', e);
          data.items = [];
        }
      }
      
      // Ensure items is an array
      if (!Array.isArray(data.items)) {
        data.items = [];
      }
      
      setOrder(data);
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    console.log('🔵 handleUpdateStatus called with status:', newStatus);
    if (!order) {
      console.log('🔴 No order found, returning');
      return;
    }

    console.log('🔵 Closing modal');
    setShowStatusModal(false);

    try {
      console.log('🔵 Starting update process...');
      setUpdating(true);
      
      console.log('🔵 Calling updateOrderStatus API...');
      console.log('🔵 Order ID:', order.id);
      console.log('🔵 New Status:', newStatus);
      console.log('🔵 User Phone:', userPhone);
      
      // Pass userPhone for authorization
      await updateOrderStatus(order.id, newStatus, userPhone);

      console.log('🔵 Update successful, reloading order details...');
      // Reload order details
      await loadOrderDetails();
      
      console.log('✅ Order status updated successfully');
    } catch (error) {
      console.error('🔴 Error updating order status:', error);
    } finally {
      console.log('🔵 Setting updating to false');
      setUpdating(false);
    }
  };

  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Helper function to safely convert to number and format
  const formatPrice = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const canUpdateStatus = order && isBusiness && businessIds.includes(order.business_id);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Stack.Screen options={{ title: 'Order Details' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const statusKey = order.status.toLowerCase();
  const config = statusConfig[statusKey as keyof typeof statusConfig] || { color: '#6B7280', label: 'Unknown' };

  return (
    <>
      <Stack.Screen options={{ title: 'Order Details' }} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Order Number & Status */}
        <View style={styles.card}>
          <Text style={styles.orderNumber}>Order #{order.order_number}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
            <Text style={styles.statusText}>{config.label.toUpperCase()}</Text>
          </View>
        </View>

        {/* Status Update Dropdown - Only for business owners */}
        {canUpdateStatus && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Update Order Status</Text>
            <TouchableOpacity
              style={styles.statusDropdownButton}
              onPress={() => {
                console.log('🔵 Status dropdown button pressed');
                console.log('🔵 Setting showStatusModal to true');
                setShowStatusModal(true);
              }}
              disabled={updating}
            >
              <View style={[styles.statusDot, { backgroundColor: config.color }]} />
              <Text style={styles.statusDropdownText}>{config.label}</Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
            {updating && (
              <View style={styles.updatingContainer}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.updatingText}>Updating...</Text>
              </View>
            )}
          </View>
        )}

        {/* Customer Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{order.customer_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{order.customer_email}</Text>
          </View>
          <TouchableOpacity 
            style={styles.phoneRow}
            onPress={() => handleCallCustomer(order.customer_phone)}
          >
            <View style={styles.phonePill}>
              <Phone size={16} color="#FFFFFF" />
              <Text style={styles.phoneText}>{order.customer_phone}</Text>
            </View>
          </TouchableOpacity>
          {order.delivery_address && (
            <View style={styles.addressRow}>
              <MapPin size={18} color="#666" />
              <Text style={styles.addressText}>{order.delivery_address}</Text>
            </View>
          )}
        </View>

        {/* Business Information */}
        {order.business_name && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Business</Text>
            <View style={styles.businessRow}>
              {order.business_image && (
                <Image source={{ uri: order.business_image }} style={styles.businessImage} />
              )}
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{order.business_name}</Text>
                {order.business_phone && (
                  <TouchableOpacity onPress={() => handleCallCustomer(order.business_phone)}>
                    <Text style={styles.businessPhone}>{order.business_phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items && order.items.length > 0 ? (
            order.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name || item.name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{formatPrice((item.price || 0) * (item.quantity || 1))}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noItemsText}>No items</Text>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{formatPrice(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹{formatPrice(order.delivery_fee)}</Text>
          </View>
          <View style={styles.summaryRowTotal}>
            <Text style={styles.summaryLabelTotal}>Total</Text>
            <Text style={styles.summaryValueTotal}>₹{formatPrice(order.total)}</Text>
          </View>
        </View>

        {/* Payment & Delivery Info */}
        <View style={styles.card}>
          <View style={styles.metaRow}>
            <Package size={18} color="#666" />
            <Text style={styles.metaText}>Delivery: {order.delivery_type}</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock size={18} color="#666" />
            <Text style={styles.metaText}>Payment: {order.payment_method}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Buttons */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navButton, styles.ordersButton]}
          onPress={() => router.push('/orders')}
        >
          <Package size={20} color="#FFFFFF" />
          <Text style={styles.navButtonText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.homeButton]}
          onPress={() => router.push('/')}>
          <Text style={styles.navButtonText}>Home</Text>
        </TouchableOpacity>
      </View>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          console.log('🔵 Modal onRequestClose called');
          setShowStatusModal(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            console.log('🔵 Modal overlay pressed (close modal)');
            setShowStatusModal(false);
          }}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            <View style={styles.modalOptions}>
              {Object.entries(statusConfig)
                .filter(([key]) => key !== 'all')
                .map(([key, statusInfo]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.modalOption,
                    order.status.toLowerCase() === key && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    console.log('🔵 Status option pressed:', key);
                    handleUpdateStatus(key);
                  }}
                >
                  <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                  <Text style={[
                    styles.modalOptionText,
                    { color: statusInfo.color }
                  ]}>
                    {statusInfo.label}
                  </Text>
                  {order.status.toLowerCase() === key && (
                    <View style={styles.selectedCheckmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  statusDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    columnGap: 10,
  },
  statusDropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    columnGap: 8,
  },
  updatingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  phoneRow: {
    marginTop: 12,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    columnGap: 8,
  },
  phoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    columnGap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  businessImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  businessPhone: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#666',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  noItemsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#F0F0F0',
  },
  summaryLabelTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    paddingVertical: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    columnGap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    columnGap: 8,
  },
  ordersButton: {
    backgroundColor: '#FF6B35',
  },
  homeButton: {
    backgroundColor: '#111827',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  modalOptions: {
    columnGap: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    columnGap: 12,
  },
  modalOptionSelected: {
    backgroundColor: '#FEF3C7',
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
