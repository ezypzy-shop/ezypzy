import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Clock, Star, ChevronRight, Store, ShoppingCart, RefreshCw, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCartStore } from '@/lib/store';
import { fetchActiveAds } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const categories = [
  { id: '1', name: 'All', emoji: '🏪' },
  { id: '2', name: 'Grocery', emoji: '🛒' },
  { id: '3', name: 'Pharmacy', emoji: '💊' },
  { id: '4', name: 'Bakery', emoji: '🍞' },
  { id: '5', name: 'Restaurant', emoji: '🍕' },
  { id: '6', name: 'Kitchen', emoji: '☕' },
  { id: '7', name: 'Electronics', emoji: '📱' },
  { id: '8', name: 'Fashion', emoji: '👗' },
];

type Business = {
  id: number;
  name: string;
  description: string;
  image: string;
  type: string;
  status: string;
  delivery_time: string;
  rating: number;
};

type Ad = {
  id: number;
  title: string;
  description: string;
  image: string;
  discount_text: string;
  business_id: number;
  business_name?: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const cartItemCount = useCartStore(state => state.getAllItemCount());
  const customOrders = useCartStore(state => state.customOrders);
  const totalCartCount = cartItemCount + customOrders.length;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const API_URL = process.env.EXPO_PUBLIC_APP_URL || '';
      if (!API_URL) {
        setBusinesses([]);
        setAds([]);
        setLoading(false);
        return;
      }
      
      // Load ads and businesses in parallel
      const [adsData, businessesData] = await Promise.all([
        fetchActiveAds(),
        (async () => {
          let url = `${API_URL}/api/businesses`;
          if (activeCategory !== 'All') {
            url += `?category=${encodeURIComponent(activeCategory)}`;
          }
          const response = await fetch(url);
          if (response.ok) {
            return await response.json();
          }
          return [];
        })()
      ]);
      
      setAds(adsData || []);
      setBusinesses(businessesData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCategory]);

  // Auto-rotate ads
  useEffect(() => {
    if (ads.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [ads.length]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#1e293b', '#334155', '#475569']}
            style={styles.heroGradient}
          >
            <SafeAreaView edges={['top']}>
              <View style={styles.heroContent}>
                <View style={styles.topRow}>
                  <View style={styles.badge}>
                    <Store size={14} color="#f97316" />
                    <Text style={styles.badgeText}>Local Businesses Near You</Text>
                  </View>
                </View>

                <Text style={styles.heroTitle}>Order Anything from</Text>
                <Text style={styles.heroTitleHighlight}>Local Shops</Text>
                <Text style={styles.heroSubtitle}>Your local shops, just a click away</Text>

                <TouchableOpacity 
                  style={styles.searchContainer} 
                  onPress={() => router.push('/(tabs)/search')}
                >
                  <Search size={20} color="#9ca3af" />
                  <Text style={styles.searchPlaceholder}>Search businesses...</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </View>

        {/* Ads Carousel */}
        {ads.length > 0 && (
          <View style={styles.adsSection}>
            <TouchableOpacity
              style={styles.adCard}
              onPress={() => router.push(`/business/${ads[currentAdIndex].business_id}`)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: ads[currentAdIndex].image }} 
                style={styles.adImage}
              />
              <View style={styles.adOverlay}>
                {ads[currentAdIndex].discount_text && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{ads[currentAdIndex].discount_text}</Text>
                  </View>
                )}
                <Text style={styles.adTitle}>{ads[currentAdIndex].title}</Text>
                {ads[currentAdIndex].description && (
                  <Text style={styles.adDescription} numberOfLines={2}>
                    {ads[currentAdIndex].description}
                  </Text>
                )}
                {ads[currentAdIndex].business_name && (
                  <Text style={styles.adBusinessName}>@ {ads[currentAdIndex].business_name}</Text>
                )}
              </View>
            </TouchableOpacity>
            {ads.length > 1 && (
              <View style={styles.adIndicators}>
                {ads.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === currentAdIndex && styles.indicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Categories with scroll indicator */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryHeaderText}>Categories</Text>
            <View style={styles.scrollHint}>
              <Text style={styles.scrollHintText}>Swipe</Text>
              <ChevronRight size={12} color="#9ca3af" />
            </View>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            style={styles.categoriesScrollView}
            snapToInterval={120}
            decelerationRate="fast"
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryPill,
                  activeCategory === category.name && styles.categoryPillActive,
                ]}
                onPress={() => setActiveCategory(category.name)}
              >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={[
                  styles.categoryText,
                  activeCategory === category.name && styles.categoryTextActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Visual scroll indicators */}
          <View style={styles.scrollIndicators}>
            {categories.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.scrollDot,
                  categories[index].name === activeCategory && styles.scrollDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Stores Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Stores</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.loadingText}>Loading stores...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Unable to load stores</Text>
              <Text style={styles.errorSubtext}>Please check your connection</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                <RefreshCw size={16} color="#ffffff" />
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : businesses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Store size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No stores found</Text>
              <Text style={styles.emptySubtext}>Try a different category</Text>
            </View>
          ) : (
            <View style={styles.storeList}>
              {businesses.map((business) => (
                <TouchableOpacity 
                  key={business.id}
                  style={styles.storeRow}
                  onPress={() => router.push(`/business/${business.id}`)}
                >
                  <Image source={{ uri: business.image }} style={styles.storeImage} />
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName} numberOfLines={1}>{business.name}</Text>
                    <Text style={styles.storeDescription} numberOfLines={1}>
                      {business.description}
                    </Text>
                    <View style={styles.storeMeta}>
                      <View style={styles.metaItem}>
                        <Star size={12} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.metaText}>{String(business.rating || '4.5')}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={12} color="#6b7280" />
                        <Text style={styles.metaText}>{business.delivery_time || '25 min'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.storeStatus}>
                    <View style={[
                      styles.statusDot,
                      (business.status === 'Open' || business.status === 'active') ? styles.statusOpen : styles.statusClosed
                    ]} />
                    <ChevronRight size={18} color="#d1d5db" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Cart Button */}
      {totalCartCount > 0 && (
        <SafeAreaView edges={['bottom']} style={styles.floatingCartContainer}>
          <TouchableOpacity 
            style={styles.floatingCartButton}
            onPress={() => router.push('/cart')}
            activeOpacity={0.9}
          >
            <ShoppingCart size={24} color="#ffffff" />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalCartCount > 99 ? '99+' : String(totalCartCount)}</Text>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroSection: {
    marginBottom: 8,
  },
  heroGradient: {
    width: '100%',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  badgeText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroTitleHighlight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4ade80',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#9ca3af',
    flex: 1,
  },
  adsSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  adCard: {
    marginHorizontal: 16,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  adTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 3,
  },
  adDescription: {
    fontSize: 12,
    color: '#e5e7eb',
    marginBottom: 3,
  },
  adBusinessName: {
    fontSize: 11,
    color: '#d1d5db',
    fontWeight: '500',
  },
  adIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },
  indicatorActive: {
    width: 20,
    backgroundColor: '#f97316',
  },
  categoriesSection: {
    marginBottom: 12,
    marginTop: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scrollHintText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  categoriesScrollView: {
    flexGrow: 0,
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
    flexDirection: 'row',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryPillActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryTextActive: {
    color: '#f97316',
    fontWeight: '700',
  },
  scrollIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  scrollDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#e5e7eb',
  },
  scrollDotActive: {
    width: 16,
    backgroundColor: '#f97316',
    borderRadius: 2.5,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAll: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  storeList: {
    gap: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
  },
  storeImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  storeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  storeDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  storeMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  storeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOpen: {
    backgroundColor: '#22c55e',
  },
  statusClosed: {
    backgroundColor: '#ef4444',
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 20,
  },
  floatingCartButton: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
});
