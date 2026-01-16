import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Package, Search, ChevronDown, MapPin, Clock, User, Mail, Phone } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total: number;
  status: string;
  created_at: string;
  business_name?: string;
  items: any[];
  delivery_address: any;
}

const statusConfig = {
  all: { color: '#6B7280', label: 'All' },
  pending: { color: '#F59E0B', label: 'Pending' },
  processing: { color: '#3B82F6', label: 'Processing' },
  delivered: { color: '#10B981', label: 'Delivered' },
  'pick up': { color: '#8B5CF6', label: 'Pick Up' },
  cancelled: { color: '#EF4444', label: 'Cancelled' },
};

export default function OrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'my-orders' | 'customer-orders'>('my-orders');
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessIds, setBusinessIds] = useState<number[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Track order states (for non-logged in users)
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  // CRITICAL FIX: Auto-refresh when screen comes into focus (e.g., after navigating back from order details)
  useFocusEffect(
    useCallback(() => {
      // Refresh orders when screen is focused
      if (userId) {
        console.log('📱 Orders screen focused - refreshing orders...');
        refreshOrdersData();
      }
    }, [userId, isBusiness, businessIds])
  );

  useEffect(() => {
    // Filter and sort orders
    const ordersToFilter = activeTab === 'my-orders' ? myOrders : customerOrders;
    
    // CRITICAL FIX: Ensure ordersToFilter is always an array
    let filtered = Array.isArray(ordersToFilter) ? ordersToFilter : [];

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status.toLowerCase() === selectedStatus.toLowerCase());
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_email.toLowerCase().includes(query)
      );
    }

    // Sort by date (latest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredOrders(filtered);
  }, [selectedStatus, searchQuery, myOrders, customerOrders, activeTab]);

  const loadUserData = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      
      if (isLoggedIn === 'true') {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          console.log('👤 [Orders] User data loaded:', userData);
          setUserId(userData.id);
          setIsBusiness(userData.is_business_user === true);
          
          // Fetch user's businesses if they're a business user
          if (userData.is_business_user === true) {
            await fetchUserBusinesses(userData.id);
          } else {
            // If regular customer, only fetch their orders
            fetchMyOrders(userData.id);
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const fetchUserBusinesses = async (uid: number) => {
    try {
      console.log('🏪 [Orders] Fetching businesses for user:', uid);
      const response = await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/businesses?user_id=${uid}`);
      const data = await response.json();
      
      console.log('🏪 [Orders] Businesses response:', data);
      
      const businesses = data.businesses || [];
      const ids = businesses.map((b: any) => b.id);
      
      console.log('🏪 [Orders] Business IDs:', ids);
      setBusinessIds(ids);
      
      // Fetch orders for both tabs
      await Promise.all([
        fetchMyOrders(uid),
        fetchCustomerOrdersForBusinesses(ids)
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('❌ [Orders] Error fetching businesses:', error);
      setLoading(false);
    }
  };

  const fetchMyOrders = async (uid: number) => {
    try {
      console.log('📦 [Orders] Fetching my orders for user:', uid);
      const response = await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/orders?user_id=${uid}`);
      const data = await response.json();
      console.log('📦 [Orders] My orders response:', data);
      // CRITICAL FIX: Ensure data is always an array
      setMyOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ [Orders] Error fetching my orders:', error);
      setMyOrders([]); // Set empty array on error
    }
  };

  const fetchCustomerOrdersForBusinesses = async (ids: number[]) => {
    try {
      console.log('👥 [Orders] Fetching customer orders for business IDs:', ids);
      
      if (ids.length === 0) {
        console.log('👥 [Orders] No business IDs, setting empty customer orders');
        setCustomerOrders([]);
        return;
      }
      
      const url = `${process.env.EXPO_PUBLIC_APP_URL}/api/orders?business_ids=${ids.join(',')}`;
      console.log('👥 [Orders] Customer orders URL:', url);
      
      const response = await fetch(url);
      console.log('👥 [Orders] Customer orders response status:', response.status);
      
      const data = await response.json();
      console.log('👥 [Orders] Customer orders response data:', data);
      console.log('👥 [Orders] Customer orders count:', Array.isArray(data) ? data.length : 0);
      
      // CRITICAL FIX: Ensure data is always an array
      setCustomerOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ [Orders] Error fetching customer orders:', error);
      setCustomerOrders([]); // Set empty array on error
    }
  };

  // CRITICAL FIX: Separate refresh function for focus effect
  const refreshOrdersData = async () => {
    if (!userId) return;
    
    try {
      console.log('🔄 [Orders] Refreshing orders data...');
      if (isBusiness) {
        console.log('🔄 [Orders] Business user - refreshing both tabs...');
        await Promise.all([
          fetchMyOrders(userId),
          fetchCustomerOrdersForBusinesses(businessIds)
        ]);
      } else {
        console.log('🔄 [Orders] Regular user - refreshing my orders...');
        await fetchMyOrders(userId);
      }
    } catch (error) {
      console.error('❌ [Orders] Error refreshing orders:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshOrdersData();
    setRefreshing(false);
  }, [userId, isBusiness, businessIds]);

  const handleTrackOrder = async () => {
    if (!trackOrderNumber.trim()) {
      setTrackingError('Please enter an order number');
      return;
    }

    setTrackingLoading(true);
    setTrackingError('');

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_APP_URL}/api/orders/track?order_number=${encodeURIComponent(trackOrderNumber.trim())}`
      );
      const data = await response.json();

      if (!response.ok) {
        setTrackingError(data.error || 'Order not found');
        setTrackingLoading(false);
        return;
      }

      // Navigate to track order screen with the order number
      router.push(`/track-order?order_number=${encodeURIComponent(trackOrderNumber.trim())}`);
      setTrackingError('');
    } catch (error) {
      console.error('Error tracking order:', error);
      setTrackingError('Failed to track order. Please try again.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const formatPrice = (value: any) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const getDateLabel = (dateString: string) => {
    const orderDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time parts for accurate comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    orderDate.setHours(0, 0, 0, 0);

    if (orderDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (orderDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return orderDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const groupOrdersByDate = (orders: Order[]) => {
    const grouped: { [key: string]: Order[] } = {};
    
    orders.forEach(order => {
      const dateLabel = getDateLabel(order.created_at);
      if (!grouped[dateLabel]) {
        grouped[dateLabel] = [];
      }
      grouped[dateLabel].push(order);
    });

    return grouped;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  // Show track order and auth options when not logged in
  if (!userId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.guestContainer}>
          {/* Track Your Order Section */}
          <View style={styles.trackSection}>
            <Text style={styles.sectionTitle}>Track Your Order</Text>
            <Text style={styles.sectionDescription}>
              Enter your order number to track your order status
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter Order Number (e.g., ORD-12345)"
                placeholderTextColor="#9CA3AF"
                value={trackOrderNumber}
                onChangeText={(text) => {
                  setTrackOrderNumber(text);
                  setTrackingError('');
                }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.trackButton}
                onPress={handleTrackOrder}
                disabled={trackingLoading}
              >
                {trackingLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.trackButtonText}>Track</Text>
                )}
              </TouchableOpacity>
            </View>

            {trackingError ? (
              <Text style={styles.errorText}>{trackingError}</Text>
            ) : null}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Auth Section */}
          <View style={styles.authSection}>
            <Text style={styles.sectionTitle}>Access Your Account</Text>
            <Text style={styles.sectionDescription}>
              Sign in to view all your orders and manage your account
            </Text>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push('/sign-in')}
              activeOpacity={0.8}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={() => router.push('/sign-up')}
              activeOpacity={0.8}
            >
              <Text style={styles.createAccountButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const groupedOrders = groupOrdersByDate(filteredOrders);
  const statusLabel = statusConfig[selectedStatus as keyof typeof statusConfig]?.label || 'All';
  const statusColor = statusConfig[selectedStatus as keyof typeof statusConfig]?.color || '#6B7280';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
      </View>

      {/* Tabs - Show both tabs only for business users */}
      {isBusiness && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my-orders' && styles.activeTab]}
            onPress={() => setActiveTab('my-orders')}
          >
            <Text style={[styles.tabText, activeTab === 'my-orders' && styles.activeTabText]}>
              My Orders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'customer-orders' && styles.activeTab]}
            onPress={() => setActiveTab('customer-orders')}
          >
            <Text style={[styles.tabText, activeTab === 'customer-orders' && styles.activeTabText]}>
              Customer Orders
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar - Only for Customer Orders tab */}
      {activeTab === 'customer-orders' && (
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order #, name, or email..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Status Dropdown - Only for Customer Orders tab */}
      {activeTab === 'customer-orders' && (
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowStatusModal(true)}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.dropdownText}>{statusLabel}</Text>
          <ChevronDown size={20} color="#6B7280" />
        </TouchableOpacity>
      )}

      {/* Orders List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {Object.keys(groupedOrders).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'my-orders' 
                ? 'Your orders will appear here' 
                : 'Customer orders will appear here'}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {Object.entries(groupedOrders).map(([dateLabel, orders]) => (
              <View key={dateLabel} style={styles.dateGroup}>
                <Text style={styles.dateLabel}>{dateLabel}</Text>
                {orders.map((order) => {
                  // Convert status to lowercase for consistent lookup
                  const statusKey = order.status.toLowerCase();
                  const config = statusConfig[statusKey as keyof typeof statusConfig] || { color: '#6B7280', label: 'Unknown' };
                  
                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={styles.orderCard}
                      onPress={() => router.push(`/order-details/${order.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.orderHeader}>
                        <View style={styles.orderHeaderLeft}>
                          <Text style={styles.customerName}>{order.customer_name}</Text>
                          <Text style={styles.orderId}>#{order.order_number}</Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" />
                      </View>

                      <View style={styles.orderFooter}>
                        <View style={styles.orderFooterLeft}>
                          <Text style={styles.orderTotal}>₹{formatPrice(order.total)}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: `${config.color}15` }]}>
                            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                            <Text style={[styles.statusText, { color: config.color }]}>
                              {config.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Status</Text>
            <View style={styles.modalOptions}>
              {Object.entries(statusConfig).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.modalOption,
                    selectedStatus === key && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedStatus(key);
                    setShowStatusModal(false);
                  }}
                >
                  <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                  <Text style={[
                    styles.modalOptionText,
                    { color: config.color }
                  ]}>
                    {config.label}
                  </Text>
                  {selectedStatus === key && (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  guestContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  trackSection: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    columnGap: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  trackButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 32,
  },
  authSection: {
    paddingBottom: 20,
  },
  signInButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createAccountButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  createAccountButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    columnGap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    columnGap: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  ordersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 14,
    color: '#6B7280',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
