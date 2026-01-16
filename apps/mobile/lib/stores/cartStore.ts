import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = '@cart_items';
const CUSTOM_ORDERS_STORAGE_KEY = '@custom_orders';

// Helper function to safely parse price to number
const parsePrice = (price: any): number => {
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export type CartItem = {
  id: number;
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  business_id: number;
  business_name: string;
};

export type CustomOrderRequest = {
  id: string;
  business_id: number;
  business_name: string;
  business_image?: string;
  description: string;
  image_url?: string;
  delivery_preference: 'delivery' | 'pickup';
  status: 'pending' | 'quoted' | 'accepted' | 'rejected';
  quote_amount?: number;
  quote_note?: string;
  created_at: string;
};

type BusinessCart = {
  business_id: number;
  business_name: string;
  items: CartItem[];
  itemCount: number;
  total: number;
};

type CartStore = {
  items: CartItem[];
  customOrders: CustomOrderRequest[];
  selectedBusinessId: number | null;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  removeItem: (productId: number, businessId?: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number, businessId?: number) => Promise<void>;
  clearCart: () => Promise<void>;
  clearBusinessCart: (businessId: number) => Promise<void>;
  selectBusiness: (businessId: number | null) => void;
  getTotal: () => number;
  getBusinessTotal: (businessId: number) => number;
  getTotalAllBusinesses: () => number;
  getItemCount: () => number;
  getAllItemCount: () => number;
  getItemQuantity: (productId: number) => number;
  getBusinessCarts: () => BusinessCart[];
  getSelectedBusinessItems: () => CartItem[];
  getSelectedBusinessName: () => string | null;
  loadCart: () => Promise<void>;
  // Custom order methods
  addCustomOrder: (order: Omit<CustomOrderRequest, 'id' | 'created_at' | 'status'>) => Promise<void>;
  removeCustomOrder: (orderId: string) => Promise<void>;
  updateCustomOrderStatus: (orderId: string, status: CustomOrderRequest['status'], quote?: { amount: number; note: string }) => Promise<void>;
  getCustomOrdersForBusiness: (businessId: number) => CustomOrderRequest[];
  getAllCustomOrders: () => CustomOrderRequest[];
  hasCustomOrderForBusiness: (businessId: number) => boolean;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customOrders: [],
  selectedBusinessId: null,
  
  loadCart: async () => {
    try {
      const [itemsJson, ordersJson] = await AsyncStorage.multiGet([CART_STORAGE_KEY, CUSTOM_ORDERS_STORAGE_KEY]);
      const items = itemsJson[1] ? JSON.parse(itemsJson[1]) : [];
      const customOrders = ordersJson[1] ? JSON.parse(ordersJson[1]) : [];
      set({ items, customOrders });
      console.log('[Cart Store] Loaded from storage:', items.length, 'items');
    } catch (error) {
      console.error('[Cart Store] Error loading cart:', error);
    }
  },
  
  addItem: async (item) => {
    const { items } = get();
    
    // Ensure price is a number
    const itemWithParsedPrice = {
      ...item,
      price: parsePrice(item.price),
    };
    
    const existingIndex = items.findIndex(
      i => i.product_id === itemWithParsedPrice.product_id && i.business_id === itemWithParsedPrice.business_id
    );
    
    let newItems;
    if (existingIndex > -1) {
      newItems = [...items];
      newItems[existingIndex].quantity += itemWithParsedPrice.quantity;
    } else {
      newItems = [...items, { ...itemWithParsedPrice, id: Date.now() }];
    }
    
    set({ items: newItems });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
  },
  
  removeItem: async (productId, businessId) => {
    const { items, selectedBusinessId } = get();
    const targetBusinessId = businessId || selectedBusinessId;
    
    const newItems = items.filter(
      i => !(i.product_id === productId && (!targetBusinessId || i.business_id === targetBusinessId))
    );
    
    set({ items: newItems });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
  },
  
  updateQuantity: async (productId, quantity, businessId) => {
    const { items, selectedBusinessId } = get();
    const targetBusinessId = businessId || selectedBusinessId;
    
    if (quantity <= 0) {
      const newItems = items.filter(
        i => !(i.product_id === productId && (!targetBusinessId || i.business_id === targetBusinessId))
      );
      set({ items: newItems });
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
      return;
    }
    
    const newItems = items.map(i => 
      i.product_id === productId && (!targetBusinessId || i.business_id === targetBusinessId)
        ? { ...i, quantity } 
        : i
    );
    
    set({ items: newItems });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
  },
  
  clearCart: async () => {
    console.log('[Cart Store] Clearing cart');
    set({ items: [], customOrders: [], selectedBusinessId: null });
    await AsyncStorage.multiRemove([CART_STORAGE_KEY, CUSTOM_ORDERS_STORAGE_KEY]);
    console.log('[Cart Store] Cart cleared successfully');
  },
  
  clearBusinessCart: async (businessId) => {
    const { items, customOrders, selectedBusinessId } = get();
    const newItems = items.filter(i => i.business_id !== businessId);
    const newCustomOrders = customOrders.filter(o => o.business_id !== businessId);
    set({ 
      items: newItems,
      customOrders: newCustomOrders,
      selectedBusinessId: selectedBusinessId === businessId ? null : selectedBusinessId,
    });
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newItems));
    await AsyncStorage.setItem(CUSTOM_ORDERS_STORAGE_KEY, JSON.stringify(newCustomOrders));
  },
  
  selectBusiness: (businessId) => {
    set({ selectedBusinessId: businessId });
  },
  
  getTotal: () => {
    const { items, selectedBusinessId } = get();
    const filteredItems = selectedBusinessId 
      ? items.filter(i => i.business_id === selectedBusinessId)
      : items;
    return filteredItems.reduce((sum, item) => {
      const price = parsePrice(item.price);
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
  },
  
  getBusinessTotal: (businessId) => {
    const { items } = get();
    return items
      .filter(i => i.business_id === businessId)
      .reduce((sum, item) => {
        const price = parsePrice(item.price);
        const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
        return sum + (price * quantity);
      }, 0);
  },
  
  getTotalAllBusinesses: () => {
    return get().items.reduce((sum, item) => {
      const price = parsePrice(item.price);
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
  },
  
  getItemCount: () => {
    const { items, selectedBusinessId } = get();
    const filteredItems = selectedBusinessId 
      ? items.filter(i => i.business_id === selectedBusinessId)
      : items;
    return filteredItems.reduce((sum, item) => {
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      return sum + quantity;
    }, 0);
  },
  
  getAllItemCount: () => {
    return get().items.reduce((sum, item) => {
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      return sum + quantity;
    }, 0);
  },
  
  getItemQuantity: (productId: number) => {
    const item = get().items.find(i => i.product_id === productId);
    return item ? item.quantity : 0;
  },
  
  getBusinessCarts: () => {
    const { items } = get();
    const businessMap = new Map<number, BusinessCart>();
    
    items.forEach(item => {
      if (!businessMap.has(item.business_id)) {
        businessMap.set(item.business_id, {
          business_id: item.business_id,
          business_name: item.business_name,
          items: [],
          itemCount: 0,
          total: 0,
        });
      }
      const cart = businessMap.get(item.business_id)!;
      cart.items.push(item);
      cart.itemCount += item.quantity;
      cart.total += parsePrice(item.price) * item.quantity;
    });
    
    return Array.from(businessMap.values());
  },
  
  getSelectedBusinessItems: () => {
    const { items, selectedBusinessId } = get();
    if (!selectedBusinessId) return items;
    return items.filter(i => i.business_id === selectedBusinessId);
  },
  
  getSelectedBusinessName: () => {
    const { items, selectedBusinessId } = get();
    if (!selectedBusinessId) return null;
    const item = items.find(i => i.business_id === selectedBusinessId);
    return item?.business_name || null;
  },
  
  // Custom order methods
  addCustomOrder: async (order) => {
    const { customOrders } = get();
    const newOrder: CustomOrderRequest = {
      ...order,
      id: Date.now().toString(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const newOrders = [...customOrders, newOrder];
    set({ customOrders: newOrders });
    await AsyncStorage.setItem(CUSTOM_ORDERS_STORAGE_KEY, JSON.stringify(newOrders));
  },
  
  removeCustomOrder: async (orderId) => {
    const { customOrders } = get();
    const newOrders = customOrders.filter(o => o.id !== orderId);
    set({ customOrders: newOrders });
    await AsyncStorage.setItem(CUSTOM_ORDERS_STORAGE_KEY, JSON.stringify(newOrders));
  },
  
  updateCustomOrderStatus: async (orderId, status, quote) => {
    const { customOrders } = get();
    const updatedOrders = customOrders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          ...(quote ? { quote_amount: quote.amount, quote_note: quote.note } : {}),
        };
      }
      return o;
    });
    set({ customOrders: updatedOrders });
    await AsyncStorage.setItem(CUSTOM_ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
  },
  
  getCustomOrdersForBusiness: (businessId) => {
    return get().customOrders.filter(o => o.business_id === businessId);
  },
  
  getAllCustomOrders: () => {
    return get().customOrders;
  },
  
  hasCustomOrderForBusiness: (businessId) => {
    return get().customOrders.some(o => o.business_id === businessId);
  },
}));
