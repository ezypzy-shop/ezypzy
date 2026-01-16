import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ShoppingBag, MapPin, Star, ShoppingCart, Pill, Utensils, Shirt, Smartphone, Package, Hand, RefreshCw } from 'lucide-react-native';
import { useCartStore } from '@/lib/stores/cartStore';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

interface Business {
  id: string;
  name: string;
  description: string;
  image: string;
  categories: string[];
  rating?: string;
  delivery_time?: string;
}

const categoryIcons = {
  'All': Package,
  'Grocery': ShoppingCart,
  'Pharmacy': Pill,
  'Restaurant': Utensils,
  'Fashion': Shirt,
  'Electronics': Smartphone,
  'Other': Package,
};

// Light background colors for categories
const categoryColors: Record<string, string> = {
  'All': '#F3F4F6',
  'Grocery': '#DCFCE7',    // Light green
  'Pharmacy': '#DBEAFE',   // Light blue
  'Restaurant': '#FEF3C7',  // Light yellow
  'Fashion': '#FCE7F3',     // Light pink
  'Electronics': '#E0E7FF', // Light indigo
  'Other': '#F3F4F6',
};

// Helper function to get time-based greeting
const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

// Get greeting emoji based on time
const getGreetingEmoji = () => {
  const hour = new Date().getHours();
  if (hour < 12) return '☀️';
  if (hour < 18) return '🌤️';
  return '🌙';
};

// Extract first name from full name
const getFirstName = (fullName: string) => {
  return fullName.split(' ')[0];
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, backendUser } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const getAllItemCount = useCartStore((state) => state.getAllItemCount);

  const categories = ['All', 'Grocery', 'Pharmacy', 'Restaurant', 'Fashion', 'Electronics', 'Other'];

  // Check if user is logged in: need both user AND backendUser to be considered logged in
  const isActuallyLoggedIn = !!(user && backendUser);
  
  // Only get name if user is actually logged in
  const fullName = isActuallyLoggedIn ? (user?.displayName || backendUser?.name) : null;
  const firstName = fullName ? getFirstName(fullName) : '';

  // Build rotating messages with personalized welcome as first message
  const rotatingMessages = [
    {
      title: firstName ? `Welcome ${firstName}, ${getTimeBasedGreeting()}` : `${getTimeBasedGreeting()} ${getGreetingEmoji()}`,
      text: firstName 
        ? "Ready to discover amazing local stores?"
        : "Explore amazing stores and products from businesses near you",
      showHandIcon: !!firstName,
    },
    {
      title: "Shop Your Neighborhood",
      text: "Explore amazing stores and products from businesses near you",
      showHandIcon: false,
    },
    {
      title: "Support Local Businesses",
      text: "Every purchase helps your community thrive and grow",
      showHandIcon: false,
    },
    {
      title: "Fast & Fresh Delivery",
      text: "Get your orders delivered quickly from nearby stores",
      showHandIcon: false,
    },
    {
      title: "Discover New Favorites",
      text: "Find unique products and hidden gems in your area",
      showHandIcon: false,
    },
    {
      title: "Quality You Can Trust",
      text: "Shop from verified local businesses with great reviews",
      showHandIcon: false,
    }
  ];

  // Auto-rotate messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % rotatingMessages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isActuallyLoggedIn, firstName]); // Re-run if user login state changes

  const fetchBusinesses = async () => {
    try {
      setError(null); // Clear previous error
      const appUrl = process.env.EXPO_PUBLIC_APP_URL;
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await fetch(`${appUrl}/api/businesses`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is ok
      if (!res.ok) {
        console.error('[Home] API response not ok:', res.status, res.statusText);
        setError('Unable to load stores. Please try again.');
        setBusinesses([]);
        return;
      }
      
      // Get response text first to check if it's HTML or JSON
      const textResponse = await res.text();
      
      // Check if response is HTML (error page)
      if (textResponse.trim().startsWith('<')) {
        console.error('[Home] Received HTML instead of JSON. Backend may not be ready.');
        setError('Server is starting up. Please refresh in a moment.');
        setBusinesses([]);
        return;
      }
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('[Home] Failed to parse JSON:', parseError);
        setError('Unable to load stores. Please try again.');
        setBusinesses([]);
        return;
      }
      
      // Ensure businesses is always an array
      const businessList = Array.isArray(data.businesses) ? data.businesses : [];
      setBusinesses(businessList);
      setError(null); // Clear error on success
    } catch (error) {
      // Check if error is due to abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Home] Request timed out');
        setError('Request timed out. Please check your connection.');
      } else {
        console.error('[Home] Error loading stores:', error);
        setError('Unable to connect to server. Please check your connection.');
      }
      setBusinesses([]); // Set to empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBusinesses();
  }, []);

  const handleSearchPress = () => {
    router.push('/search');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const filteredBusinesses = selectedCategory === 'All'
    ? businesses
    : businesses.filter(b => {
        // Check if business has categories array and if it includes the selected category
        if (Array.isArray(b.categories)) {
          return b.categories.includes(selectedCategory);
        }
        return false;
      });

  const cartItemCount = getAllItemCount();

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </SafeAreaView>
    );
  }

  const currentMessage = rotatingMessages[currentMessageIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
        }
      >
        {/* Header with Fade-in Animation */}
        <Animated.View 
          entering={FadeIn.duration(500)}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Discover Local Favorites</Text>
          <View style={styles.locationContainer}>
            <MapPin size={16} color="#14B8A6" />
            <Text style={styles.locationText}>Delivering to your area</Text>
          </View>
        </Animated.View>

        {/* Animated Info Card with Rotating Messages (including personalized welcome) */}
        <View style={styles.infoCardWrapper}>
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoCard}
          >
            <Animated.View 
              entering={FadeInDown.duration(600).delay(200)}
              style={styles.infoCardIcon}
            >
              <ShoppingBag size={40} color="#FFF" />
            </Animated.View>
            <View style={styles.infoCardContent}>
              <Animated.View
                key={`title-${currentMessageIndex}`}
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(200)}
                style={styles.infoCardTitleRow}
              >
                <Text style={styles.infoCardTitle} numberOfLines={1}>
                  {currentMessage.title}
                </Text>
                {currentMessage.showHandIcon && (
                  <Hand size={24} color="#FFF" style={styles.handIcon} />
                )}
              </Animated.View>
              <Animated.Text 
                key={`text-${currentMessageIndex}`}
                entering={FadeIn.duration(400).delay(100)}
                exiting={FadeOut.duration(200)}
                style={styles.infoCardText}
              >
                {currentMessage.text}
              </Animated.Text>
            </View>
          </LinearGradient>
          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            {rotatingMessages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentMessageIndex && styles.dotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Search Bar - Tap to navigate */}
        <View style={styles.searchContainer}>
          <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress}>
            <Search size={20} color="#999" />
            <Text style={styles.searchPlaceholder}>Find stores, products, or brands...</Text>
          </TouchableOpacity>
        </View>

        {/* Error Message - Show if there's an error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                fetchBusinesses();
              }}
            >
              <RefreshCw size={16} color="#F97316" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories with Icons - Horizontally Scrollable */}
        {!error && (
          <View style={styles.categorySection}>
            <Text style={styles.categorySectionTitle}>Shop by Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
              style={styles.categoriesScroll}
            >
              {categories.map((category) => {
                const IconComponent = categoryIcons[category as keyof typeof categoryIcons];
                const bgColor = categoryColors[category] || '#F3F4F6';
                const isActive = selectedCategory === category;
                
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: isActive ? '#F97316' : bgColor },
                      isActive && styles.categoryChipActive,
                    ]}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <IconComponent 
                      size={18} 
                      color={isActive ? '#FFF' : '#374151'} 
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isActive && styles.categoryChipTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Stores */}
        {!error && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'All' ? 'Featured Stores' : `${selectedCategory} Stores`} ({filteredBusinesses.length})
            </Text>
            
            {filteredBusinesses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No stores available in this category yet</Text>
              </View>
            ) : (
              <View style={styles.storesContainer}>
                {filteredBusinesses.map((business) => (
                  <TouchableOpacity
                    key={business.id}
                    style={styles.storeCard}
                    onPress={() => router.push(`/business/${business.id}`)}
                  >
                    <Image 
                      source={{ uri: business.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800' }} 
                      style={styles.storeImage}
                      resizeMode="cover"
                    />
                    <View style={styles.storeInfo}>
                      <Text style={styles.storeName} numberOfLines={1}>
                        {business.name}
                      </Text>
                      <Text style={styles.storeDescription} numberOfLines={2}>
                        {business.description}
                      </Text>
                      <View style={styles.storeMetaRow}>
                        <View style={styles.ratingContainer}>
                          <Star size={14} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.ratingText}>
                            {business.rating || '4.5'}
                          </Text>
                        </View>
                        <Text style={styles.deliveryTime}>
                          {business.delivery_time || '20-30 min'}
                        </Text>
                        {Array.isArray(business.categories) && business.categories.length > 0 && (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{business.categories[0]}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Cart Button - Only show when items in cart */}
      {cartItemCount > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() => router.push('/(modals)/cart')}
        >
          <ShoppingBag size={24} color="#FFF" />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#666666',
  },
  infoCardWrapper: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    columnGap: 16,
    minHeight: 100,
  },
  infoCardIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexShrink: 1,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    flexShrink: 1,
  },
  handIcon: {
    marginLeft: 8,
    flexShrink: 0,
  },
  infoCardText: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    columnGap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: '#F97316',
    width: 20,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    columnGap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  errorContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  retryButtonText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoriesScrollContent: {
    paddingHorizontal: 24,
    columnGap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 12,
  },
  categoryChipActive: {
    borderColor: '#F97316',
  },
  categoryChipText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  storesContainer: {
    paddingHorizontal: 24,
    rowGap: 16,
  },
  storeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  storeImage: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  storeInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  storeDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  storeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  deliveryTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  categoryBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  floatingCart: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cartBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
