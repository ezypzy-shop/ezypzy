import '@/utils/console-logger';
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Modal, Dimensions, Share, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ShoppingCart, Search, X, Plus, Minus, ChevronLeft, ChevronRight, Play, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore } from '@/lib/stores/cartStore';
import { useUserStore } from '@/lib/store';
import { fetchAdById, fetchBusinessById, trackProductShare } from '@/lib/api';
import { useVideoPlayer, VideoView } from 'expo-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const APP_URL = process.env.EXPO_PUBLIC_APP_URL || '';

interface Product {
  id: number;
  business_id?: number;
  name: string;
  description: string;
  price: string | number;
  image: string | null;
  images?: string[] | null;
  video?: string | null;
  category: string;
  in_stock: boolean;
}

interface Business {
  id: number;
  name: string;
  description: string;
  image: string;
  type: string;
  delivery_time: string;
  min_order: string;
}

interface Ad {
  id: number;
  business_id: number;
  title: string;
  description: string;
  image: string;
  business_name: string;
  products: Product[];
}

export default function AdProductsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUserStore();
  const [ad, setAd] = useState<Ad | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Create video player with current video URL
  const player = useVideoPlayer(videoUrl || '', (player) => {
    player.loop = false;
    player.play();
  });
  
  const cartItems = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addItem);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    loadAdData();
  }, [id]);

  useEffect(() => {
    if (!ad) return;
    
    if (searchQuery.trim() === '') {
      setFilteredProducts(ad.products || []);
    } else {
      const filtered = (ad.products || []).filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, ad]);

  const loadAdData = async () => {
    try {
      setLoading(true);
      if (!id || Array.isArray(id)) {
        console.error('[AdProducts] Invalid ID:', id);
        return;
      }

      const parsedId = parseInt(id as string, 10);
      if (isNaN(parsedId)) {
        console.error('[AdProducts] Invalid numeric ID:', id);
        return;
      }

      console.log('[AdProducts] Fetching ad with ID:', parsedId);
      const adData = await fetchAdById(parsedId);
      
      if (adData) {
        console.log('[AdProducts] Ad data loaded:', adData);
        setAd(adData);
        setFilteredProducts(adData.products || []);
        
        // Fetch full business details to get logo and banner
        if (adData.business_id) {
          console.log('[AdProducts] Fetching business with ID:', adData.business_id);
          const businessData = await fetchBusinessById(adData.business_id);
          if (businessData) {
            console.log('[AdProducts] Business data loaded:', businessData);
            setBusiness(businessData);
          }
        }
      } else {
        console.error('[AdProducts] No ad data returned');
      }
    } catch (error) {
      console.error('[AdProducts] Error loading ad data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get the primary image for a product (for card display)
  const getProductImage = (product: Product): string => {
    // First check if images array exists and has items
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // Find first valid image URL
      const validImage = product.images.find(img => img && img.trim() !== '');
      if (validImage) return validImage;
    }
    
    // Fall back to single image field
    if (product.image && product.image.trim() !== '') {
      return product.image;
    }
    
    // Default fallback
    return 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400';
  };

  const handleShareProduct = async (product: Product) => {
    try {
      const shareUrl = `${APP_URL}/ad-products/${id}?product=${product.id}`;
      const message = `Check out ${product.name} on EzyPzy!\n\n${product.description}\n\nPrice: ₹${typeof product.price === 'number' ? product.price : parseFloat(product.price)}\n\n${shareUrl}`;
      
      const result = await Share.share({
        message,
        title: `${product.name} - EzyPzy`,
      });

      if (result.action === Share.sharedAction) {
        // Track the share
        await trackProductShare(
          product.id,
          user?.id || null,
          result.activityType || 'unknown'
        );
        
        Alert.alert('Success', 'Product shared successfully!');
      }
    } catch (error) {
      console.error('[Share] Error:', error);
      Alert.alert('Error', 'Failed to share product');
    }
  };

  const handleAddToCartDirect = (product: Product) => {
    if (!ad || !business) return;
    
    const price = typeof product.price === 'number' ? product.price : parseFloat(product.price);
    
    console.log('[AdProducts] Adding to cart:', {
      product_id: product.id,
      business_id: ad.business_id,
      business_name: business.name || ad.business_name,
      name: product.name,
      price,
    });
    
    addToCart({
      product_id: product.id,
      name: product.name,
      price: price,
      image: getProductImage(product),
      quantity: 1,
      business_id: ad.business_id,
      business_name: business.name || ad.business_name,
    });
  };

  const handleProductPress = (product: Product) => {
    console.log('[AdProducts] Product pressed - showing modal:', product.name);
    setSelectedProduct(product);
    setQuantity(1);
    setCurrentMediaIndex(0);
    
    // Get product media and set video URL if first media is video
    const media = getProductMedia(product);
    if (media.length > 0 && media[0].type === 'video') {
      console.log('[AdProducts] Setting video URL:', media[0].url);
      setVideoUrl(media[0].url);
    } else {
      setVideoUrl(null);
    }
    
    setModalVisible(true);
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !ad || !business) return;
    
    const price = typeof selectedProduct.price === 'number' ? selectedProduct.price : parseFloat(selectedProduct.price);
    
    console.log('[AdProducts] Adding to cart from modal:', {
      product_id: selectedProduct.id,
      business_id: ad.business_id,
      business_name: business.name || ad.business_name,
      name: selectedProduct.name,
      price,
      quantity,
    });
    
    addToCart({
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      price: price,
      image: getProductImage(selectedProduct),
      quantity: quantity,
      business_id: ad.business_id,
      business_name: business.name || ad.business_name,
    });
    
    setModalVisible(false);
    setSelectedProduct(null);
    setQuantity(1);
    setVideoUrl(null);
  };

  const getProductMedia = (product: Product) => {
    const media: Array<{ type: 'image' | 'video', url: string }> = [];
    
    // Add all images from images array
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach(img => {
        if (img && img.trim() !== '') {
          media.push({ type: 'image', url: img });
        }
      });
    }
    
    // Add single image if no images array or as fallback
    if (media.length === 0 && product.image && product.image.trim() !== '') {
      media.push({ type: 'image', url: product.image });
    }
    
    // Add video if exists
    if (product.video && product.video.trim() !== '') {
      media.push({ type: 'video', url: product.video });
    }
    
    // Fallback image if no media
    if (media.length === 0) {
      media.push({ type: 'image', url: 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400' });
    }
    
    console.log('[AdProducts] Product media:', product.name, media);
    return media;
  };

  const handlePrevMedia = () => {
    if (!selectedProduct) return;
    const media = getProductMedia(selectedProduct);
    setCurrentMediaIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : media.length - 1;
      // Update video URL if switching to video
      if (media[newIndex].type === 'video') {
        console.log('[AdProducts] Switching to video:', media[newIndex].url);
        setVideoUrl(media[newIndex].url);
      } else {
        setVideoUrl(null);
      }
      return newIndex;
    });
  };

  const handleNextMedia = () => {
    if (!selectedProduct) return;
    const media = getProductMedia(selectedProduct);
    setCurrentMediaIndex((prev) => {
      const newIndex = prev < media.length - 1 ? prev + 1 : 0;
      // Update video URL if switching to video
      if (media[newIndex].type === 'video') {
        console.log('[AdProducts] Switching to video:', media[newIndex].url);
        setVideoUrl(media[newIndex].url);
      } else {
        setVideoUrl(null);
      }
      return newIndex;
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!ad) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Ad not found</Text>
      </View>
    );
  }

  const modalProduct = selectedProduct;
  const modalPrice = modalProduct ? (typeof modalProduct.price === 'number' ? modalProduct.price : parseFloat(modalProduct.price) || 0) : 0;
  const modalMedia = modalProduct ? getProductMedia(modalProduct) : [];
  const currentMedia = modalMedia[currentMediaIndex];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: business?.name || ad.business_name, headerShown: true }} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Business Banner - using image property from API */}
        <Image 
          source={{ uri: business?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800' }} 
          style={styles.banner} 
        />

        {/* Business Info */}
        <View style={styles.businessInfo}>
          <Text style={styles.businessName}>{business?.name || ad.business_name}</Text>
          <Text style={styles.businessDescription}>
            {business?.description || 'Welcome to our store! Browse our wide selection of quality products.'}
          </Text>
          
          {business && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{business.type}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Delivery</Text>
                <Text style={styles.infoValue}>{business.delivery_time}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Min Order</Text>
                <Text style={styles.infoValue}>{business.min_order}</Text>
              </View>
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
                    source={{ uri: getProductImage(product) }} 
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text>
                    <Text style={styles.productPrice}>₹{price.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.productActions}>
                  <TouchableOpacity 
                    style={styles.shareButton}
                    onPress={() => handleShareProduct(product)}
                    activeOpacity={0.7}
                  >
                    <Share2 size={16} color="#f97316" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => handleAddToCartDirect(product)}
                    activeOpacity={0.7}
                  >
                    <ShoppingCart size={16} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
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

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <SafeAreaView edges={['bottom']} style={styles.floatingCartContainer}>
          <TouchableOpacity 
            style={styles.floatingCartButton}
            onPress={() => router.push('/(modals)/cart')}
            activeOpacity={0.9}
          >
            <ShoppingCart size={24} color="#ffffff" />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : String(cartCount)}</Text>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Product Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setVideoUrl(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => {
                setModalVisible(false);
                setVideoUrl(null);
              }}
            >
              <X size={24} color="#000" />
            </TouchableOpacity>

            {/* Share Button in Modal */}
            {modalProduct && (
              <TouchableOpacity 
                style={styles.modalShareButton}
                onPress={() => handleShareProduct(modalProduct)}
              >
                <Share2 size={20} color="#f97316" />
              </TouchableOpacity>
            )}

            {modalProduct && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Media Carousel */}
                <View style={styles.mediaCarousel}>
                  {currentMedia?.type === 'image' ? (
                    <Image 
                      source={{ uri: currentMedia.url }} 
                      style={styles.modalImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.error('[AdProducts] Image load error:', currentMedia.url, error.nativeEvent.error);
                      }}
                    />
                  ) : currentMedia?.type === 'video' && videoUrl ? (
                    <View style={styles.videoContainer}>
                      <VideoView
                        player={player}
                        style={styles.modalImage}
                        nativeControls={true}
                        contentFit="contain"
                        allowsFullscreen={false}
                        allowsPictureInPicture={false}
                      />
                      <View style={styles.videoOverlay}>
                        <View style={styles.videoIconBadge}>
                          <Play size={20} color="#fff" fill="#fff" />
                        </View>
                      </View>
                    </View>
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
                        {modalMedia.map((media, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => {
                              setCurrentMediaIndex(index);
                              if (media.type === 'video') {
                                console.log('[AdProducts] Switching to video via dot:', media.url);
                                setVideoUrl(media.url);
                              } else {
                                setVideoUrl(null);
                              }
                            }}
                          >
                            <View
                              style={[
                                styles.indicator,
                                index === currentMediaIndex && styles.indicatorActive,
                                media.type === 'video' && styles.indicatorVideo,
                              ]}
                            >
                              {media.type === 'video' && index === currentMediaIndex && (
                                <Play size={8} color="#fff" fill="#fff" />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </View>
                
                <View style={styles.modalDetails}>
                  <Text style={styles.modalProductName}>{modalProduct.name}</Text>
                  <Text style={styles.modalProductCategory}>{modalProduct.category}</Text>
                  <Text style={styles.modalProductDescription}>{modalProduct.description}</Text>
                  
                  {/* Media count indicator */}
                  {modalMedia.length > 1 && (
                    <Text style={styles.mediaCountText}>
                      {currentMediaIndex + 1} of {modalMedia.length} media
                    </Text>
                  )}
                  
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
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
  modalShareButton: {
    position: 'absolute',
    top: 16,
    left: 16,
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
  videoContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  videoIconBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  indicatorVideo: {
    width: 24,
    height: 16,
    borderRadius: 8,
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
    marginBottom: 12,
  },
  mediaCountText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
    fontStyle: 'italic',
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
