import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Store, Package, X, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { fetchBusinesses, searchProductsGlobally } from '@/lib/api';
import { useUserStore } from '@/lib/store';

type SearchResult = {
  type: 'business' | 'product';
  id: number;
  name: string;
  description?: string;
  image: string;
  business_id?: number;
  business_name?: string;
  price?: number;
};

export default function SearchScreen() {
  const router = useRouter();
  const { isLoggedIn } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularStores, setPopularStores] = useState<any[]>([]);

  useEffect(() => {
    loadPopularStores();
    // Load recent searches from storage if needed
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const delayDebounce = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(delayDebounce);
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  const loadPopularStores = async () => {
    try {
      const businesses = await fetchBusinesses();
      setPopularStores(businesses.slice(0, 6));
    } catch (error) {
      console.error('Error loading popular stores:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      console.log('🔍 Searching for:', searchQuery);
      
      // Search businesses
      const businesses = await fetchBusinesses(undefined, searchQuery);
      console.log('📦 Businesses found:', businesses.length);
      
      const businessResults: SearchResult[] = businesses.map((b: any) => ({
        type: 'business' as const,
        id: b.id,
        name: b.name,
        description: b.description,
        image: b.image,
      }));

      // Search products globally
      const products = await searchProductsGlobally(searchQuery);
      console.log('🛍️ Products found:', products.length);
      console.log('Products data:', products);
      
      const productResults: SearchResult[] = products.map((p: any) => ({
        type: 'product' as const,
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.image,
        business_id: p.business_id,
        business_name: p.business_name,
        price: p.price,
      }));

      console.log('📊 Combined results:', businessResults.length, 'businesses +', productResults.length, 'products');
      setResults([...businessResults, ...productResults]);
      
      // Add to recent searches (limit to 5)
      if (!recentSearches.includes(searchQuery)) {
        setRecentSearches([searchQuery, ...recentSearches.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPopularStores();
    if (searchQuery.trim()) {
      await performSearch();
    }
    setRefreshing(false);
  }, [searchQuery]);

  const handleResultPress = (result: SearchResult) => {
    if (result.type === 'business') {
      router.push(`/business/${result.id}`);
    } else {
      // For products, navigate to the business
      router.push(`/business/${result.business_id}`);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stores or products..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />
        }
      >
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* Search Results */}
        {!loading && results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{results.length} Results</Text>
            {results.map((result) => (
              <TouchableOpacity
                key={`${result.type}-${result.id}`}
                style={styles.resultCard}
                onPress={() => handleResultPress(result)}
              >
                <Image source={{ uri: result.image }} style={styles.resultImage} />
                <View style={styles.resultInfo}>
                  <View style={styles.resultHeader}>
                    {result.type === 'business' ? (
                      <>
                        <Store size={14} color="#f97316" />
                        <Text style={[styles.resultType, { color: '#f97316' }]}>STORE</Text>
                      </>
                    ) : (
                      <>
                        <Package size={14} color="#3b82f6" />
                        <Text style={[styles.resultType, { color: '#3b82f6' }]}>PRODUCT</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {result.name}
                  </Text>
                  {result.description && (
                    <Text style={styles.resultDescription} numberOfLines={1}>
                      {result.description}
                    </Text>
                  )}
                  {result.type === 'product' && result.business_name && (
                    <Text style={styles.businessName} numberOfLines={1}>
                      from {result.business_name}
                    </Text>
                  )}
                  {result.price !== undefined && (
                    <Text style={styles.price}>₹{Number(result.price).toFixed(2)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* No Results */}
        {!loading && searchQuery.trim().length > 0 && results.length === 0 && (
          <View style={styles.emptyContainer}>
            <Search size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Results Found</Text>
            <Text style={styles.emptyText}>
              Try searching with different keywords
            </Text>
          </View>
        )}

        {/* Recent Searches */}
        {!loading && searchQuery.trim().length === 0 && recentSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearRecentSearches}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((query, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentItem}
                onPress={() => handleRecentSearchPress(query)}
              >
                <Search size={16} color="#9ca3af" />
                <Text style={styles.recentText}>{query}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Popular Stores */}
        {!loading && searchQuery.trim().length === 0 && popularStores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Stores</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {popularStores.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={styles.storeCard}
                onPress={() => router.push(`/business/${store.id}`)}
              >
                <Image source={{ uri: store.image }} style={styles.storeImage} />
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {store.name}
                  </Text>
                  <Text style={styles.storeType} numberOfLines={1}>
                    {store.type}
                  </Text>
                </View>
                <TrendingUp size={18} color="#22c55e" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Initial State */}
        {!loading && searchQuery.trim().length === 0 && recentSearches.length === 0 && (
          <View style={styles.initialContainer}>
            <Search size={64} color="#e5e7eb" />
            <Text style={styles.initialTitle}>Search for anything</Text>
            <Text style={styles.initialText}>
              Find stores, products, and more
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    padding: 2,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
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
  clearText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  seeAll: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  resultType: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  resultDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
    marginTop: 4,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  storeImage: {
    width: 50,
    height: 50,
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
  storeType: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  initialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  initialTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  initialText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
});
