import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react-native';
import { useUserStore } from '@/lib/store';

interface SavedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  businessName: string;
  businessId: string;
}

export default function SavedScreen() {
  const router = useRouter();
  const favorites = useUserStore((state) => state.favorites);
  const removeFavorite = useUserStore((state) => state.removeFavorite);
  const addToCart = useUserStore((state) => state.addToCart);
  
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedProducts();
  }, [favorites]);

  const loadSavedProducts = async () => {
    try {
      setLoading(true);
      // Fetch product details for all favorited product IDs
      const productPromises = favorites.map(async (productId) => {
        const response = await fetch(`${process.env.EXPO_PUBLIC_APP_URL}/api/products?id=${productId}`);
        if (response.ok) {
          const data = await response.json();
          return data.product;
        }
        return null;
      });

      const products = await Promise.all(productPromises);
      setSavedProducts(products.filter(Boolean));
    } catch (error) {
      console.error('Error loading saved products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = (productId: string) => {
    removeFavorite(productId);
  };

  const handleAddToCart = (product: SavedProduct) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      businessName: product.businessName,
      businessId: product.businessId,
      quantity: 1,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Items</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Items</Text>
        <View style={styles.placeholder} />
      </View>

      {savedProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No saved items</Text>
          <Text style={styles.emptyText}>Items you save will appear here</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.productsGrid}>
            {savedProducts.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <TouchableOpacity
                  onPress={() => router.push(`/business/${product.businessId}`)}
                >
                  <Image
                    source={{ uri: product.image }}
                    style={styles.productImage}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => handleRemoveFavorite(product.id)}
                >
                  <Heart size={20} color="#FF3B30" fill="#FF3B30" />
                </TouchableOpacity>
                <View style={styles.productInfo}>
                  <Text style={styles.businessName}>{product.businessName}</Text>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
                    <TouchableOpacity
                      style={styles.addToCartButton}
                      onPress={() => handleAddToCart(product)}
                    >
                      <ShoppingBag size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: '1%',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F0F0F0',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productInfo: {
    padding: 12,
  },
  businessName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    minHeight: 36,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90E2',
  },
  addToCartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
