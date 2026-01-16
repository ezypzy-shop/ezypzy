import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, Package, Megaphone, ShoppingBag, Settings, Plus, ChevronRight, LogOut, TrendingUp, Edit, ArrowLeft, Mail, Phone, MapPin, CreditCard, Truck, PackageCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { fetchUserBusinesses, fetchBusinessOrders, updateUser } from '@/lib/api';

type Business = {
  id: number;
  name: string;
  description: string;
  image: string;
  type: string;
  status: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_methods?: string[];
  delivery_enabled?: boolean;
  pickup_enabled?: boolean;
  delivery_fee?: number;
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gpay: 'Google Pay',
  paytm: 'Paytm',
  card: 'Credit/Debit Card',
  cod: 'Cash on Delivery',
  cop: 'Cash on Pickup',
};

export default function BusinessDashboardScreen() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useUserStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      setError('Please sign in to access the business dashboard');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const businessList = await fetchUserBusinesses(user.id);
      
      // Business user can only have 1 business
      if (businessList && businessList.length > 0) {
        setBusiness(businessList[0]);
        
        // Load orders for the business
        try {
          const orders = await fetchBusinessOrders(businessList[0].id);
          setRecentOrders(orders?.slice(0, 5) || []);
        } catch (orderError) {
          console.error('Error loading orders:', orderError);
          setRecentOrders([]);
        }
      } else {
        setBusiness(null);
        setRecentOrders([]);
      }
    } catch (err) {
      console.error('Error loading business data:', err);
      setError('Failed to load business data. Please try again.');
      setBusiness(null);
      setRecentOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    router.replace('/sign-in');
  };

  const handleCreateBusiness = () => {
    if (business) {
      Alert.alert(
        'Business Limit Reached',
        'You can only have one business per account. Would you like to edit your existing business instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit Business', onPress: () => router.push(`/manage-business/${business.id}`) }
        ]
      );
    } else {
      router.push('/create-business');
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.greeting}>Business Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Store size={48} color="#d1d5db" />
          <Text style={styles.errorTitle}>Sign In Required</Text>
          <Text style={styles.errorText}>Please sign in to access the business dashboard</Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.greeting}>Business Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.name?.split(' ')[0] || 'Business Owner'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Loading your business...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Store size={48} color="#d1d5db" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadData}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Business Card or Create Business */}
            {business ? (
              <>
                {/* Business Info Card */}
                <View style={styles.businessCard}>
                  <Image 
                    source={{ uri: business.image || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600' }} 
                    style={styles.businessImage} 
                  />
                  <View style={styles.businessOverlay}>
                    <View style={styles.businessHeader}>
                      <View style={styles.statusBadge}>
                        <View style={[
                          styles.statusDot,
                          business.status === 'Open' ? styles.statusOpen : styles.statusClosed
                        ]} />
                        <Text style={styles.statusText}>{business.status || 'Open'}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => router.push(`/manage-business/${business.id}`)}
                      >
                        <Edit size={16} color="#ffffff" />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.businessDetails}>
                      <Text style={styles.businessName}>{business.name}</Text>
                      <Text style={styles.businessType}>{business.type}</Text>
                    </View>
                  </View>
                </View>

                {/* Delivery & Pickup Options */}
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>Fulfillment Options</Text>
                  <View style={styles.fulfillmentRow}>
                    <View style={styles.fulfillmentOption}>
                      <View style={[
                        styles.fulfillmentIcon,
                        business.delivery_enabled !== false ? styles.fulfillmentEnabled : styles.fulfillmentDisabled
                      ]}>
                        <Truck size={20} color={business.delivery_enabled !== false ? '#22c55e' : '#9ca3af'} />
                      </View>
                      <Text style={styles.fulfillmentLabel}>Delivery</Text>
                      <Text style={[
                        styles.fulfillmentStatus,
                        business.delivery_enabled !== false ? styles.statusEnabled : styles.statusDisabled
                      ]}>
                        {business.delivery_enabled !== false ? 'Enabled' : 'Disabled'}
                      </Text>
                    </View>
                    <View style={styles.fulfillmentOption}>
                      <View style={[
                        styles.fulfillmentIcon,
                        business.pickup_enabled === true ? styles.fulfillmentEnabled : styles.fulfillmentDisabled
                      ]}>
                        <PackageCheck size={20} color={business.pickup_enabled === true ? '#22c55e' : '#9ca3af'} />
                      </View>
                      <Text style={styles.fulfillmentLabel}>Pickup</Text>
                      <Text style={[
                        styles.fulfillmentStatus,
                        business.pickup_enabled === true ? styles.statusEnabled : styles.statusDisabled
                      ]}>
                        {business.pickup_enabled === true ? 'Enabled' : 'Disabled'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Business Contact Info */}
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>Business Details</Text>
                  {business.phone && (
                    <View style={styles.infoRow}>
                      <Phone size={16} color="#6b7280" />
                      <Text style={styles.infoText}>{business.phone}</Text>
                    </View>
                  )}
                  {business.address && (
                    <View style={styles.infoRow}>
                      <MapPin size={16} color="#6b7280" />
                      <Text style={styles.infoText}>{business.address}</Text>
                    </View>
                  )}
                  {business.payment_methods && business.payment_methods.length > 0 && (
                    <View style={styles.infoRow}>
                      <CreditCard size={16} color="#6b7280" />
                      <Text style={styles.infoText}>
                        {business.payment_methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join(', ')}
                      </Text>
                    </View>
                  )}
                  {!business.phone && !business.address && !business.payment_methods?.length && (
                    <Text style={styles.noInfoText}>No additional details yet. Edit your business to add more info.</Text>
                  )}
                </View>

                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#f0fdf4' }]}>
                      <ShoppingBag size={20} color="#22c55e" />
                    </View>
                    <Text style={styles.statValue}>{recentOrders.length}</Text>
                    <Text style={styles.statLabel}>Orders</Text>
                  </View>
                  <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#eff6ff' }]}>
                      <TrendingUp size={20} color="#3b82f6" />
                    </View>
                    <Text style={styles.statValue}>₹{recentOrders.reduce((sum, o) => sum + Number(o.total || 0), 0).toFixed(0)}</Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Manage Your Business</Text>
                  <View style={styles.actionsGrid}>
                    <TouchableOpacity 
                      style={styles.actionCard}
                      onPress={() => router.push(`/manage-business/${business.id}`)}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: '#fff7ed' }]}>
                        <Settings size={24} color="#f97316" />
                      </View>
                      <Text style={styles.actionText}>Edit Business</Text>
                      <Text style={styles.actionSubtext}>Update info</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionCard}
                      onPress={() => router.push(`/manage-products/${business.id}`)}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                        <Package size={24} color="#22c55e" />
                      </View>
                      <Text style={styles.actionText}>Products</Text>
                      <Text style={styles.actionSubtext}>Add & manage</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionCard}
                      onPress={() => router.push(`/business-orders/${business.id}`)}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}>
                        <ShoppingBag size={24} color="#3b82f6" />
                      </View>
                      <Text style={styles.actionText}>Orders</Text>
                      <Text style={styles.actionSubtext}>View orders</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.actionCard}
                      onPress={() => router.push(`/manage-ads/${business.id}`)}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                        <Megaphone size={24} color="#f59e0b" />
                      </View>
                      <Text style={styles.actionText}>Promotions</Text>
                      <Text style={styles.actionSubtext}>Create ads</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Recent Orders */}
                {recentOrders.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Recent Orders</Text>
                      <TouchableOpacity onPress={() => router.push(`/business-orders/${business.id}`)}>
                        <Text style={styles.seeAll}>See all</Text>
                      </TouchableOpacity>
                    </View>

                    {recentOrders.map((order) => (
                      <View key={order.id} style={styles.orderCard}>
                        <View style={styles.orderInfo}>
                          <Text style={styles.orderNumber}>#{order.order_number}</Text>
                          <Text style={styles.orderDate}>
                            {new Date(order.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.orderRight}>
                          <Text style={styles.orderTotal}>₹{Number(order.total || 0).toFixed(2)}</Text>
                          <View style={[
                            styles.orderStatus,
                            order.status === 'Delivered' && styles.orderStatusDelivered,
                            order.status === 'Pending' && styles.orderStatusPending,
                          ]}>
                            <Text style={[
                              styles.orderStatusText,
                              order.status === 'Delivered' && styles.orderStatusTextDelivered,
                              order.status === 'Pending' && styles.orderStatusTextPending,
                            ]}>{order.status}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              /* No Business - Show Create Business Card */
              <View style={styles.noBusiness}>
                <View style={styles.noBusinessIcon}>
                  <Store size={48} color="#d1d5db" />
                </View>
                <Text style={styles.noBusinessTitle}>No Business Yet</Text>
                <Text style={styles.noBusinessText}>
                  Create your business to start selling products and receiving orders.
                </Text>
                <TouchableOpacity 
                  style={styles.createBusinessButton}
                  onPress={() => router.push('/create-business')}
                >
                  <Plus size={20} color="#ffffff" />
                  <Text style={styles.createBusinessButtonText}>Create Your Business</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Switch to Customer View */}
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.switchButtonText}>Switch to Customer View</Text>
            </TouchableOpacity>
          </>
        )}
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
  headerCenter: {
    flex: 1,
    marginLeft: 8,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  businessCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  businessImage: {
    width: '100%',
    height: '100%',
  },
  businessOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
    justifyContent: 'space-between',
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOpen: {
    backgroundColor: '#22c55e',
  },
  statusClosed: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249,115,22,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 4,
  },
  businessDetails: {
    marginTop: 8,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  businessType: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  fulfillmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fulfillmentOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 6,
  },
  fulfillmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  fulfillmentEnabled: {
    backgroundColor: '#f0fdf4',
  },
  fulfillmentDisabled: {
    backgroundColor: '#f3f4f6',
  },
  fulfillmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  fulfillmentStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusEnabled: {
    color: '#22c55e',
  },
  statusDisabled: {
    color: '#9ca3af',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginLeft: 10,
  },
  noInfoText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  seeAll: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -6,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 6,
    marginBottom: 12,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  orderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  orderInfo: {
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  orderDate: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  orderStatus: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  orderStatusDelivered: {
    backgroundColor: '#dcfce7',
  },
  orderStatusPending: {
    backgroundColor: '#fef3c7',
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
  },
  orderStatusTextDelivered: {
    color: '#16a34a',
  },
  orderStatusTextPending: {
    color: '#d97706',
  },
  noBusiness: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  noBusinessIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noBusinessTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  noBusinessText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createBusinessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  createBusinessButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  switchButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  switchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
});
