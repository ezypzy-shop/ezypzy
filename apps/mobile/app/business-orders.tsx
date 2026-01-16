import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { fetchUserBusinesses, fetchOrders, updateOrderStatus } from '@/lib/api';
import {
  ArrowLeft,
  Search,
  Clock,
  Package,
  Truck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Phone,
  MapPin,
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

type Order = {
  id: number;
  order_number: string;
  status: string;
  delivery_type: string;
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  payment_method: string;
  total: number | string;
  created_at: string;
  items?: any[];
  custom_orders?: any[];
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  'ready for pickup': '#22c55e',
  'out for delivery': '#06b6d4',
  delivered: '#10b981',
  'picked up': '#10b981',
  cancelled: '#ef4444',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  'ready for pickup': 'Ready for Pickup',
  'out for delivery': 'Out for Delivery',
  delivered: 'Delivered',
  'picked up': 'Picked Up',
  cancelled: 'Cancelled',
};

const normalizeStatus = (status: string | null | undefined): string => {
  if (!status) return 'pending';
  return status.toLowerCase().trim();
};

const getStatusIcon = (status: string) => {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case 'pending':
      return <Clock size={16} color={STATUS_COLORS.pending} />;
    case 'confirmed':
    case 'preparing':
      return <Package size={16} color={STATUS_COLORS.preparing} />;
    case 'ready for pickup':
      return <CheckCircle size={16} color={STATUS_COLORS['ready for pickup']} />;
    case 'out for delivery':
      return <Truck size={16} color={STATUS_COLORS['out for delivery']} />;
    case 'delivered':
    case 'picked up':
      return <CheckCircle size={16} color={STATUS_COLORS.delivered} />;
    default:
      return <Clock size={16} color="#6b7280" />;
  }
};

const getNextStatus = (currentStatus: string, deliveryType: string): string | null => {
  const normalized = normalizeStatus(currentStatus);
  const isPickup = deliveryType.toLowerCase() === 'pickup';

  if (normalized === 'pending') return 'confirmed';
  if (normalized === 'confirmed') return 'preparing';
  if (normalized === 'preparing') {
    return isPickup ? 'ready for pickup' : 'out for delivery';
  }
  if (normalized === 'ready for pickup') return 'picked up';
  if (normalized === 'out for delivery') return 'delivered';
  return null;
};

const getNextStatusLabel = (currentStatus: string, deliveryType: string): string | null => {
  const nextStatus = getNextStatus(currentStatus, deliveryType);
  if (!nextStatus) return null;
  return STATUS_LABELS[nextStatus as keyof typeof STATUS_LABELS] || nextStatus;
};

export default function BusinessOrdersScreen() {
  const router = useRouter();
  const { user, isLoggedIn } = useUserStore();

  const [businessId, setBusinessId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    todayRevenue: 0,
    totalOrders: 0,
  });

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn && user) {
        loadData();
      }
    }, [isLoggedIn, user])
  );

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/sign-in');
    }
  }, [isLoggedIn]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch user's business
      const businesses = await fetchUserBusinesses(user.id);
      if (!businesses || businesses.length === 0) {
        Alert.alert('No Business', 'You need to create a business first');
        router.replace('/create-business');
        return;
      }

      const userBusiness = businesses[0];
      setBusinessId(userBusiness.id);

      // Fetch orders for this business
      const ordersData = await fetchOrders(undefined, [userBusiness.id]);
      setOrders(ordersData);
      setFilteredOrders(ordersData);

      // Calculate stats
      calculateStats(ordersData);
    } catch (error) {
      console.error('[Business Orders] Error loading data:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    const today = new Date().toDateString();
    let pending = 0;
    let processing = 0;
    let todayRevenue = 0;

    ordersData.forEach((order) => {
      const status = normalizeStatus(order.status);
      const orderDate = new Date(order.created_at).toDateString();

      if (status === 'pending') pending++;
      if (status === 'confirmed' || status === 'preparing' || status === 'out for delivery') {
        processing++;
      }

      if (orderDate === today && status !== 'cancelled') {
        todayRevenue += parseFloat(String(order.total));
      }
    });

    setStats({
      pending,
      processing,
      todayRevenue,
      totalOrders: ordersData.length,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    filterOrders(filter, searchQuery);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterOrders(selectedFilter, query);
  };

  const filterOrders = (filter: string, query: string) => {
    let filtered = [...orders];

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((order) => normalizeStatus(order.status) === filter);
    }

    // Search by order number or customer name
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(lowerQuery) ||
          order.customer_name.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleUpdateStatus = async (order: Order) => {
    const nextStatus = getNextStatus(order.status, order.delivery_type);
    if (!nextStatus) {
      Alert.alert('Complete', 'This order is already complete');
      return;
    }

    const nextStatusLabel = getNextStatusLabel(order.status, order.delivery_type);

    Alert.alert(
      'Update Order Status',
      `Mark order #${order.order_number} as "${nextStatusLabel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setUpdatingOrderId(order.id);
              await updateOrderStatus(order.id, nextStatus);
              await loadData();
              Alert.alert('Success', `Order updated to "${nextStatusLabel}"`);
            } catch (error) {
              console.error('[Business Orders] Error updating status:', error);
              Alert.alert('Error', 'Failed to update order status');
            } finally {
              setUpdatingOrderId(null);
            }
          },
        },
      ]
    );
  };

  const toggleOrderExpanded = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const renderOrderCard = (order: Order) => {
    const isExpanded = expandedOrderId === order.id;
    const isUpdating = updatingOrderId === order.id;
    const status = normalizeStatus(order.status);
    const statusColor = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6b7280';
    const statusLabel = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || order.status;
    const nextStatusLabel = getNextStatusLabel(order.status, order.delivery_type);
    const orderAge = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });

    return (
      <View key={order.id} style={styles.orderCard}>
        {/* Order Header - Always visible */}
        <TouchableOpacity
          onPress={() => toggleOrderExpanded(order.id)}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Text style={styles.orderNumber}>#{order.order_number}</Text>
              <Text style={styles.orderTime}>{orderAge}</Text>
            </View>
            <View style={styles.orderHeaderRight}>
              <Text style={styles.orderTotal}>₹{parseFloat(String(order.total)).toFixed(2)}</Text>
              {isExpanded ? (
                <ChevronUp size={20} color="#6b7280" />
              ) : (
                <ChevronDown size={20} color="#6b7280" />
              )}
            </View>
          </View>

          {/* Customer Info - Compact */}
          <View style={styles.orderCompact}>
            <Text style={styles.customerName}>{order.customer_name}</Text>
            <View style={styles.statusBadge} style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              {getStatusIcon(order.status)}
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* Quick Info */}
          <View style={styles.orderQuickInfo}>
            <Text style={styles.quickInfoText}>
              {order.items?.length || order.custom_orders?.length || 0} items • {order.delivery_type}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.orderExpanded}>
            {/* Customer Details */}
            <View style={styles.expandedSection}>
              <Text style={styles.expandedSectionTitle}>Customer Details</Text>
              <View style={styles.detailRow}>
                <Phone size={14} color="#6b7280" />
                <Text style={styles.detailText}>{order.customer_phone}</Text>
              </View>
              {order.delivery_address && (
                <View style={styles.detailRow}>
                  <MapPin size={14} color="#6b7280" />
                  <Text style={styles.detailText}>{order.delivery_address}</Text>
                </View>
              )}
            </View>

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <View style={styles.expandedSection}>
                <Text style={styles.expandedSectionTitle}>Items</Text>
                {order.items.map((item: any, index: number) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.product_name} x{item.quantity}
                    </Text>
                    <Text style={styles.itemPrice}>
                      ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Custom Orders */}
            {order.custom_orders && order.custom_orders.length > 0 && (
              <View style={styles.expandedSection}>
                <Text style={styles.expandedSectionTitle}>Custom Requests</Text>
                {order.custom_orders.map((custom: any, index: number) => (
                  <View key={index} style={styles.customItem}>
                    <Text style={styles.customItemText}>{custom.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => router.push(`/business-orders/${order.id}`)}
              >
                <Text style={styles.viewDetailsButtonText}>View Full Details</Text>
              </TouchableOpacity>

              {nextStatusLabel && (
                <TouchableOpacity
                  style={[styles.updateStatusButton, isUpdating && styles.updateStatusButtonDisabled]}
                  onPress={() => handleUpdateStatus(order)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <CheckCircle size={16} color="#ffffff" />
                      <Text style={styles.updateStatusButtonText}>Mark as {nextStatusLabel}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Orders</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
      >
        {/* Stats Dashboard */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Clock size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Package size={24} color="#3b82f6" />
            <Text style={styles.statNumber}>{stats.processing}</Text>
            <Text style={styles.statLabel}>Processing</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={24} color="#10b981" />
            <Text style={styles.statNumber}>₹{stats.todayRevenue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order # or customer name..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'all' && styles.filterPillActive]}
            onPress={() => handleFilterChange('all')}
          >
            <Text style={[styles.filterPillText, selectedFilter === 'all' && styles.filterPillTextActive]}>
              All ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'pending' && styles.filterPillActive]}
            onPress={() => handleFilterChange('pending')}
          >
            <Text style={[styles.filterPillText, selectedFilter === 'pending' && styles.filterPillTextActive]}>
              Pending ({stats.pending})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'confirmed' && styles.filterPillActive]}
            onPress={() => handleFilterChange('confirmed')}
          >
            <Text style={[styles.filterPillText, selectedFilter === 'confirmed' && styles.filterPillTextActive]}>
              Confirmed
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'preparing' && styles.filterPillActive]}
            onPress={() => handleFilterChange('preparing')}
          >
            <Text style={[styles.filterPillText, selectedFilter === 'preparing' && styles.filterPillTextActive]}>
              Preparing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'delivered' && styles.filterPillActive]}
            onPress={() => handleFilterChange('delivered')}
          >
            <Text style={[styles.filterPillText, selectedFilter === 'delivered' && styles.filterPillTextActive]}>
              Delivered
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Orders List */}
        <View style={styles.ordersContainer}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <ShoppingBag size={48} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No orders found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : selectedFilter !== 'all'
                  ? 'No orders with this status'
                  : 'Orders will appear here when customers place them'}
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => renderOrderCard(order))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    columnGap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#111827',
  },
  filterScroll: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  ordersContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  orderTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  orderHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f97316',
  },
  orderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  customerName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderQuickInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  quickInfoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  orderExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  expandedSection: {
    marginBottom: 16,
  },
  expandedSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  customItem: {
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  customItemText: {
    fontSize: 13,
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    columnGap: 8,
    marginTop: 8,
  },
  viewDetailsButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  updateStatusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  updateStatusButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  updateStatusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
