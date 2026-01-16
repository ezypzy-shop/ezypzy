import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Minus, Plus, Trash2 } from 'lucide-react-native';
import { useCartStore } from '@/lib/stores/cartStore';
import { useEffect, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

export default function CartModal() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams();
  const { items, updateQuantity, removeItem, getTotal, getAllItemCount } = useCartStore();

  // Filter items if businessId is provided (from business screen)
  const filteredItems = businessId 
    ? items.filter(item => item.business_id === parseInt(businessId as string))
    : items;

  // Group items by business when viewing all items (from home screen)
  const groupedByBusiness = businessId ? {} : filteredItems.reduce((acc, item) => {
    const businessName = item.business_name || 'Unknown Business';
    if (!acc[businessName]) {
      acc[businessName] = {
        business_id: item.business_id,
        items: []
      };
    }
    acc[businessName].items.push(item);
    return acc;
  }, {} as Record<string, { business_id: number, items: typeof items }>);

  // Calculate totals based on filtered items
  const totalPrice = filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = filteredItems.reduce((sum, item) => sum + item.quantity, 0);

  const translateY = useRef(new Animated.Value(1000)).current;
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          handleClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 1000,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(panY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
    });
  };

  const handleCheckout = () => {
    if (businessId) {
      // From business screen - pass filtered items to checkout
      router.push({
        pathname: '/checkout',
        params: { businessId: businessId as string }
      });
    } else {
      // From home screen - checkout with all items
      router.push('/checkout');
    }
  };

  const combinedTranslateY = Animated.add(translateY, panY);

  const renderCartItem = (item: typeof items[0]) => (
    <View key={`${item.product_id}-${item.business_id}`} style={styles.cartItem}>
      <Image
        source={{ uri: item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop' }}
        style={styles.itemImage}
      />
      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        {!businessId && <Text style={styles.itemBusiness}>{item.business_name}</Text>}
        <View style={styles.priceRow}>
          <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              onPress={() => {
                if (item.quantity === 1) {
                  removeItem(item.product_id, item.business_id);
                } else {
                  updateQuantity(item.product_id, item.business_id, item.quantity - 1);
                }
              }}
              style={styles.quantityButton}
            >
              {item.quantity === 1 ? (
                <Trash2 size={16} color="#FF6B6B" />
              ) : (
                <Minus size={16} color="#333" />
              )}
            </TouchableOpacity>
            <Text style={styles.quantity}>{item.quantity}</Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item.product_id, item.business_id, item.quantity + 1)}
              style={styles.quantityButton}
            >
              <Plus size={16} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleClose} />

      {/* Cart Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: combinedTranslateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          {/* Drag Indicator */}
          <View style={styles.dragIndicatorContainer}>
            <View style={styles.dragIndicator} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>My Cart ({totalItems})</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Cart Items */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Your cart is empty</Text>
                <TouchableOpacity style={styles.shopButton} onPress={handleClose}>
                  <Text style={styles.shopButtonText}>Start Shopping</Text>
                </TouchableOpacity>
              </View>
            ) : businessId ? (
              // Single business view (from business screen)
              <View style={styles.itemsContainer}>
                {filteredItems.map(renderCartItem)}
              </View>
            ) : (
              // Grouped by business view (from home screen)
              <View style={styles.itemsContainer}>
                {Object.entries(groupedByBusiness).map(([businessName, data]) => (
                  <View key={data.business_id} style={styles.businessGroup}>
                    <Text style={styles.businessGroupName}>{businessName}</Text>
                    {data.items.map(renderCartItem)}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {filteredItems.length > 0 && (
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>₹{totalPrice.toFixed(2)}</Text>
              </View>
              <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    height: '75%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  safeArea: {
    flex: 1,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  itemsContainer: {
    padding: 20,
  },
  businessGroup: {
    marginBottom: 24,
  },
  businessGroupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemBusiness: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  quantityButton: {
    padding: 8,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
  },
  checkoutButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
