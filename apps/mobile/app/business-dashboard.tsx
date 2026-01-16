import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { fetchUserBusinesses, fetchProducts } from '@/lib/api';
import { 
  ArrowLeft, 
  Plus, 
  Package, 
  TrendingUp, 
  Store,
  Edit,
  DollarSign,
  ShoppingBag,
} from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_APP_URL;

interface Business {
  id: number;
  name: string;
  description: string;
  image: string;
  type: string;
  status: string;
  phone: string;
  email: string;
  address: string;
  categories: string[];
  payment_methods: string[];
  order_mode: string;
  delivery_fee: number;
  min_order?: string;
  delivery_time?: string;
  user_id: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  business_id: number;
  image: string;
  in_stock: boolean;
}

export default function BusinessDashboardScreen() {
  const router = useRouter();
  const { user, isLoggedIn, loadUser } = useUserStore();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Load user data first
  useEffect(() => {
    const init = async () => {
      console.log('[Business Dashboard] Initializing - loading user...');
      await loadUser();
      setInitializing(false);
      console.log('[Business Dashboard] User loaded, isLoggedIn:', isLoggedIn);
    };
    init();
  }, []);

  // Check authentication after user is loaded
  useEffect(() => {
    if (initializing) return;
    
    console.log('[Business Dashboard] Auth check - isLoggedIn:', isLoggedIn, 'user:', user);
    if (!isLoggedIn || !user) {
      console.log('[Business Dashboard] Not logged in, redirecting to sign-in');
      Alert.alert('Sign In Required', 'Please sign in to view your business');
      router.replace('/sign-in');
      return;
    }
    
    loadData();
  }, [initializing, isLoggedIn, user]);

  // Automatically redirect to edit business when business is loaded
  useEffect(() => {
    if (business && !loading) {
      console.log('[Business Dashboard] Redirecting to edit-business:', business.id);
      router.replace(`/edit-business/${business.id}`);
    }
  }, [business, loading]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      console.log('[Business Dashboard] Loading data for user:', user.id);
      
      // Fetch user's businesses
      const businesses = await fetchUserBusinesses(user.id);
      console.log('[Business Dashboard] Businesses data:', businesses);
      
      // ✅ FIXED: fetchUserBusinesses now returns an array directly
      if (businesses && businesses.length > 0) {
        const userBusiness = businesses[0];
        console.log('[Business Dashboard] Setting business:', userBusiness);
        setBusiness(userBusiness);
        
        // Fetch products for this business
        const productsData = await fetchProducts(userBusiness.id);
        console.log('[Business Dashboard] Products:', productsData);
        setProducts(productsData);
      } else {
        console.log('[Business Dashboard] No businesses found');
        setBusiness(null);
        setProducts([]);
      }
    } catch (error) {
      console.error('[Business Dashboard] Error loading data:', error);
      Alert.alert('Error', 'Failed to load business data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (initializing || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Business</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  // No business yet - show create business screen
  if (!business) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Business</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Store size={64} color="#f97316" />
          </View>
          <Text style={styles.emptyTitle}>No Business Yet</Text>
          <Text style={styles.emptyText}>
            Create your business to start selling products and reach more customers
          </Text>
          <TouchableOpacity
            style={styles.createBusinessButton}
            onPress={() => router.push('/create-business')}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.createBusinessButtonText}>Create Business</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading while redirecting to edit business
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Business</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.redirectText}>Loading business...</Text>
      </View>
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
    paddingVertical: 16,
    backgroundColor: '#f97316',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redirectText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createBusinessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  createBusinessButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
