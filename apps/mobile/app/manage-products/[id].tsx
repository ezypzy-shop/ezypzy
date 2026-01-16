import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchProducts, fetchBusinessById } from '@/lib/api';
import { useUserStore } from '@/lib/store';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react-native';
import { getCategoryImage } from '@/lib/category-images';
import { toast } from 'sonner-native';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  in_stock: boolean;
}

interface Business {
  id: number;
  name: string;
  description: string;
  user_id: number;
}

export default function ManageProductsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, isLoggedIn } = useUserStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [id, user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if user is logged in using the store
      if (!isLoggedIn || !user?.id) {
        Alert.alert('Authentication Required', 'Please sign in to manage your products.');
        router.replace('/sign-in');
        return;
      }

      console.log('[Manage Products] Loading data for business:', id, 'user:', user.id);

      // Fetch business details
      const businessResponse = await fetchBusinessById(Number(id));
      
      // CRITICAL FIX: The backend returns { business: {...}, products: [...] }
      const businessData = businessResponse.business || businessResponse;
      
      // Verify the logged-in user owns this business
      if (businessData.user_id !== user.id) {
        Alert.alert('Access Denied', 'You do not have permission to manage this business.');
        router.back();
        return;
      }

      setBusiness(businessData);

      // Fetch products for this business
      const productsResponse = await fetchProducts(Number(id));
      // CRITICAL FIX: fetchProducts returns the array directly, NOT wrapped in { products: [...] }
      const productsData = Array.isArray(productsResponse) ? productsResponse : [];
      setProducts(productsData);
      console.log('[Manage Products] Loaded products:', productsData.length, 'for business:', id);
    } catch (err) {
      console.error('[Manage Products] Error loading data:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const API_URL = process.env.EXPO_PUBLIC_APP_URL;
              const response = await fetch(`${API_URL}/api/products?id=${productId}`, {
                method: 'DELETE',
              });
              if (!response.ok) {
                throw new Error('Failed to delete product');
              }
              setProducts(products.filter(p => p.id !== productId));
              toast.success('Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              toast.error('Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image 
        source={{ uri: item.image || getCategoryImage(item.category || '') }} 
        style={styles.productImage} 
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
        <Text style={[styles.stockStatus, { color: item.in_stock ? '#10b981' : '#ef4444' }]}>
          {item.in_stock ? 'In Stock' : 'Out of Stock'}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/product-form?businessId=${id}&productId=${item.id}` as any)}
        >
          <Edit size={20} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteProduct(item.id)}
        >
          <Trash2 size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Products</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Products</Text>
      </View>

      {business && (
        <View style={styles.businessInfo}>
          <Text style={styles.businessName}>{business.name}</Text>
          <Text style={styles.businessDescription}>{business.description}</Text>
        </View>
      )}

      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products yet</Text>
            <Text style={styles.emptySubtext}>Add your first product to get started</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push(`/product-form?businessId=${id}` as any)}
      >
        <Plus size={24} color="#ffffff" />
        <Text style={styles.addButtonText}>Add Product</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  businessInfo: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  businessDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 3,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    justifyContent: 'center',
    columnGap: 8,
  },
  editButton: {
    backgroundColor: '#2563eb',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
