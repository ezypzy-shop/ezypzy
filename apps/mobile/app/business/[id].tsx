import '@/utils/console-logger';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Modal, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ShoppingCart, Search, X, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '@/lib/stores/cartStore';
import { fetchBusinessById, fetchProducts } from '@/lib/api';
import { getCategoryImage } from '@/lib/category-images';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Product {
  id: number;
  business_id?: number;
  name: string;
  description: string;
  price: string | number;
  image?: string | null;
  images?: string | string[] | null;
  video?: string | null;
  video_url?: string | null;
  category: string;
  in_stock: boolean;
}

interface Business {
  id: number;
  name: string;
  description: string;
  logo_url?: string;
  banner_url?: string;
  image?: string;
  type?: string;
  delivery_time?: string;
  min_order?: string;
}

// Native Video Component for Web
const VideoPlayer = ({ source, style }: { source: { uri: string }, style: any }) => {
  if (Platform.OS === 'web') {
    return (
      <video 
        src={source.uri} 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        controls
        autoPlay
      />
    );
  }
  return null;
};

export default function BusinessScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);

  // Get cart count for ONLY this business
  const businessId = parseInt(id as string, 10);
  const cartCountForBusiness = items
    .filter(item => item.business_id === businessId)
    .reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    loadBusinessData();
  }, [id]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      if (!id || Array.isArray(id)) {
        console.error('[Business] Invalid ID:', id);
        return;
      }

      const parsedId = parseInt(id as string, 10);
      if (isNaN(parsedId)) {
        console.error('[Business] Invalid numeric ID:', id);
        return;
      }

      console.log('[Business] Fetching business with ID:', parsedId);
      const data = await fetchBusinessById(parsedId);
      const productsResponse = await fetchProducts(parsedId);
      
      // API returns { business: {...}, products: [...] } OR just the business object
      const businessData = data?.business || data;
      
      if (businessData) {
        console.log('[Business] Business data loaded:', businessData);
        console.log('[Business] Business name:', businessData.name);
        setBusiness(businessData);
      }
      
      // fetchProducts returns the array directly, NOT wrapped in { products: [...] }
      const productsData = Array.isArray(productsResponse) ? productsResponse : [];
      
      console.log('[Business] Products loaded:', productsData.length);
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('[Business] Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCartDirect = (product: Product) => {
    if (!business || !business.name) {
      console.error('[Business] Cannot add to cart - business or business name is null');
      return;
    }
    
    const price = typeof product.price === 'number' ? product.price : parseFloat(product.price);
    const productImages = getProductImages(product);
    const businessId = parseInt(id as string, 10);
    
    console.log('[Business] Adding to cart:', {
      product_id: product.id,
      business_id: businessId,
      business_name: business.name,
      name: product.name,
      price,
    });
    
    addItem({
      product_id: product.id,
      name: product.name,
      price: price,
      image: productImages[0],
      quantity: 1,
      business_id: businessId,
      business_name: business.name,
    });
  };

  const handleProductPress = (product: Product) => {
    console.log('[Business] Product pressed - showing modal:', product.name);
    setSelectedProduct(product);
    setQuantity(1);
    setCurrentMediaIndex(0);
    setModalVisible(true);
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !business || !business.name) {
      console.error('[Business] Cannot add to cart - selectedProduct, business, or business name is null');
      return;
    }
    
    const price = typeof selectedProduct.price === 'number' ? selectedProduct.price : parseFloat(selectedProduct.price);
    const productImages = getProductImages(selectedProduct);
    const businessId = parseInt(id as string, 10);
    
    console.log('[Business] Adding to cart from modal:', {
      product_id: selectedProduct.id,
      business_id: businessId,
      business_name: business.name,
      name: selectedProduct.name,
      price,
      quantity,
    });
    
    addItem({
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      price: price,
      image: productImages[0],
      quantity: quantity,
      business_id: businessId,
      business_name: business.name,
    });
    
    setModalVisible(false);
    setSelectedProduct(null);
    setQuantity(1);
  };

  const getProductImages = (product: Product | null | undefined): string[] => {
    const defaultImage = getCategoryImage('Default');
    
    if (!product) {
      return [defaultImage];
    }
    
    // Try to parse images field
    if (product.images) {
      try {
        let parsed: string[] = [];
        
        if (typeof product.images === 'string') {
          // Handle PostgreSQL array format: {url1,url2} -> ["url1","url2"]
          if (product.images.startsWith('{') && product.images.endsWith('}')) {
            const urls = product.images.slice(1, -1).split(',');
            parsed = urls.filter(url => url && url.trim() !== '');
          } 
          // Handle JSON array format: ["url1","url2"]
          else if (product.images.startsWith('[') && product.images.endsWith(']')) {
            parsed = JSON.parse(product.images);
          }
          // Handle single URL string
          else if (product.images.trim() !== '') {
            parsed = [product.images];
          }
        } 
        // Handle array
        else if (Array.isArray(product.images)) {
          parsed = product.images;
        }
        
        const validImages = parsed.filter(img => typeof img === 'string' && img.trim() !== '');
        if (validImages.length > 0) {
          return validImages;
        }
      } catch (e) {
        // Silently handle parse errors - fallback to single image or category image
      }
    }
    
    // Check single image field
    if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
      return [product.image];
    }
    
    // Fallback to category image
    return [getCategoryImage(product.category || 'Default')];
  };

  const getProductMedia = (product: Product) => {
    const media: Array<{ type: 'image' | 'video', url: string }> = [];
    
    // Add all images
    const images = getProductImages(product);
    images.forEach(img => {
      media.push({ type: 'image', url: img });
    });
    
    // Add video if exists
    const videoUrl = product.video || product.video_url;
    if (videoUrl) {
      media.push({ type: 'video', url: videoUrl });
    }
    
    return media;
  };

  const handlePrevMedia = () => {
    if (!selectedProduct) return;
    const media = getProductMedia(selectedProduct);
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const handleNextMedia = () => {
    if (!selectedProduct) return;
    const media = getProductMedia(selectedProduct);
    setCurrentMediaIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Business not found</Text>
      </View>
    );
  }

  const modalProduct = selectedProduct;
  const modalPrice = modalProduct ? (typeof modalProduct.price === 'number' ? modalProduct.price : parseFloat(modalProduct.price) || 0) : 0;
  const modalMedia = modalProduct ? getProductMedia(modalProduct) : [];
  const currentMedia = modalMedia[currentMediaIndex];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: business.name, headerShown: true }} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Business Banner */}
        <Image 
          source={{ uri: business.banner_url || business.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800' }} 
          style={styles.banner} 
        />

        {/* Business Info */}
        <View style={styles.businessInfo}>
          <Text style={styles.businessName}>{business.name}</Text>
          <Text style={styles.businessDescription}>
            {business.description || 'Welcome to our store! Browse our wide selection of quality products'}
          </Text>
          
          {(business.type || business.delivery_time || business.min_order) && (
            <View style={styles.infoRow}>
              {business.type && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>{business.type}</Text>
                </View>
              )}
              {business.delivery_time && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Delivery</Text>
                  <Text style={styles.infoValue}>{business.delivery_time}</Text>
                </View>
              )}
              {business.min_order && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Min Order</Text>
                  <Text style={styles.infoValue}>{business.min_order}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Products ({filteredProducts.length})</Text>
          {filteredProducts.map((product) => {
            const price = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
            const productImages = getProductImages(product);
            
            return (
              <View 
                key={product.id} 
                style={styles.productCard}
              >
                <TouchableOpacity 
                  onPress={() => handleProductPress(product)}
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', flex: 1 }}
                >
                  <Image 
                    source={{ uri: productImages[0] }} 
                    style={styles.productImage} 
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text>
                    <Text style={styles.productPrice}>₹{price.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => handleAddToCartDirect(product)}
                  activeOpacity={0.7}
                >
                  <ShoppingCart size={16} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add to Cart</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          
          {filteredProducts.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Cart Button - Only show when items in cart from THIS BUSINESS */}
      {cartCountForBusiness > 0 && (
        <SafeAreaView edges={['bottom']} style={styles.floatingCartContainer}>
          <TouchableOpacity 
            style={styles.floatingCartButton}
            onPress={() => router.push(`/(modals)/cart?businessId=${id}`)}
            activeOpacity={0.9}
          >
            <ShoppingCart size={24} color="#ffffff" />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCountForBusiness > 99 ? '99+' : String(cartCountForBusiness)}</Text>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Product Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <X size={24} color="#000" />
            </TouchableOpacity>

            {modalProduct && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Media Carousel */}
                <View style={styles.mediaCarousel}>
                  {currentMedia?.type === 'image' ? (
                    <Image 
                      source={{ uri: currentMedia.url }} 
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  ) : currentMedia?.type === 'video' ? (
                    <VideoPlayer
                      source={{ uri: currentMedia.url }}
                      style={styles.modalImage}
                    />
                  ) : null}
                  
                  {/* Navigation Arrows */}
                  {modalMedia.length > 1 && (
                    <>
                      <TouchableOpacity style={styles.prevButton} onPress={handlePrevMedia}>
                        <ChevronLeft size={32} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.nextButton} onPress={handleNextMedia}>
                        <ChevronRight size={32} color="#fff" />
                      </TouchableOpacity>
                      
                      {/* Indicator Dots */}
                      <View style={styles.indicatorContainer}>
                        {modalMedia.map((_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.indicator,
                              index === currentMediaIndex && styles.indicatorActive
                            ]}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </View>
                
                <View style={styles.modalDetails}>
                  <Text style={styles.modalProductName}>{modalProduct.name}</Text>
                  <Text style={styles.modalProductCategory}>{modalProduct.category}</Text>
                  <Text style={styles.modalProductDescription}>{modalProduct.description}</Text>
                  
                  <View style={styles.modalPriceRow}>
                    <Text style={styles.modalProductPrice}>₹{modalPrice.toFixed(2)}</Text>
                    <View style={styles.modalQuantityControls}>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Minus size={20} color="#000" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{quantity}</Text>
                      <TouchableOpacity 
                        style={styles.quantityButton}
                        onPress={() => setQuantity(quantity + 1)}
                      >
                        <Plus size={20} color="#000" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.modalAddButton}
                    onPress={handleAddToCart}
                  >
                    <Text style={styles.modalAddButtonText}>
                      Add to Cart - ₹{(modalPrice * quantity).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  banner: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F5F5',
  },
  businessInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  businessDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#F9F9F9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    marginLeft: 12,
  },
  productsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    columnGap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  mediaCarousel: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  prevButton: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  modalDetails: {
    padding: 20,
  },
  modalProductName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  modalProductCategory: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  modalProductDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalProductPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF6B35',
  },
  modalQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  modalAddButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalAddButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
