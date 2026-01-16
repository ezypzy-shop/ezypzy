// Updated to force Metro refresh - v2
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addFavorite, removeFavorite } from './api';

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

type User = {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  login_method?: string;
  is_business_user?: boolean;
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
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (productId: number, businessId?: number) => void;
  updateQuantity: (productId: number, quantity: number, businessId?: number) => void;
  clearCart: () => void;
  clearBusinessCart: (businessId: number) => void;
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
  // Custom order methods
  addCustomOrder: (order: Omit<CustomOrderRequest, 'id' | 'created_at' | 'status'>) => void;
  removeCustomOrder: (orderId: string) => void;
  updateCustomOrderStatus: (orderId: string, status: CustomOrderRequest['status'], quote?: { amount: number; note: string }) => void;
  getCustomOrdersForBusiness: (businessId: number) => CustomOrderRequest[];
  getAllCustomOrders: () => CustomOrderRequest[];
  hasCustomOrderForBusiness: (businessId: number) => boolean;
};

type UserStore = {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User | null) => void;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
};

type FavoritesStore = {
  favoriteIds: number[];
  userId: number | null;
  setFavorites: (ids: number[]) => void;
  setUserId: (userId: number | null) => void;
  addFavoriteItem: (id: number) => void;
  removeFavoriteItem: (id: number) => void;
  toggleFavorite: (businessId: number) => Promise<void>;
  isFavorite: (id: number) => boolean;
  clearFavorites: () => void;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customOrders: [],
  selectedBusinessId: null,
  
  addItem: (item) => {
    const { items } = get();
    
    // Ensure price is a number
    const itemWithParsedPrice = {
      ...item,
      price: parsePrice(item.price),
    };
    
    const existingIndex = items.findIndex(
      i => i.product_id === itemWithParsedPrice.product_id && i.business_id === itemWithParsedPrice.business_id
    );
    
    if (existingIndex > -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += itemWithParsedPrice.quantity;
      set({ items: newItems });
    } else {
      set({ 
        items: [...items, { ...itemWithParsedPrice, id: Date.now() }],
      });
    }
  },
  
  removeItem: (productId, businessId) => {
    const { items, selectedBusinessId } = get();
    const targetBusinessId = businessId || selectedBusinessId;
    
    const existingItem = items.find(
      i => i.product_id === productId && (!targetBusinessId || i.business_id === targetBusinessId)
    );
    
    if (existingItem && existingItem.quantity > 1) {
      // Decrease quantity by 1
      const newItems = items.map(i => 
        i.product_id === productId && i.business_id === existingItem.business_id 
          ? { ...i, quantity: i.quantity - 1 } 
          : i
      );
      set({ items: newItems });
    } else if (existingItem) {
      // Remove item completely
      const newItems = items.filter(
        i => !(i.product_id === productId && i.business_id === existingItem.business_id)
      );
      set({ items: newItems });
    }
  },
  
  updateQuantity: (productId, quantity, businessId) => {
    const { items, selectedBusinessId } = get();
    const targetBusinessId = businessId || selectedBusinessId;
    
    if (quantity <= 0) {
      const newItems = items.filter(
        i => !(i.product_id === productId && (!targetBusinessId || i.business_id === targetBusinessId))
      );
      set({ items: newItems });
      return;
    }
    const newItems = items.map(i => 
      i.product_id === productId && (!targetBusinessId || i.business_id === targetBusinessId)
        ? { ...i, quantity } 
        : i
    );
    set({ items: newItems });
  },
  
  clearCart: () => {
    set({ items: [], customOrders: [], selectedBusinessId: null });
  },
  
  clearBusinessCart: (businessId) => {
    const { items, customOrders, selectedBusinessId } = get();
    const newItems = items.filter(i => i.business_id !== businessId);
    const newCustomOrders = customOrders.filter(o => o.business_id !== businessId);
    set({ 
      items: newItems,
      customOrders: newCustomOrders,
      selectedBusinessId: selectedBusinessId === businessId ? null : selectedBusinessId,
    });
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
  addCustomOrder: (order) => {
    const { customOrders } = get();
    const newOrder: CustomOrderRequest = {
      ...order,
      id: Date.now().toString(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    set({ customOrders: [...customOrders, newOrder] });
  },
  
  removeCustomOrder: (orderId) => {
    const { customOrders } = get();
    set({ customOrders: customOrders.filter(o => o.id !== orderId) });
  },
  
  updateCustomOrderStatus: (orderId, status, quote) => {
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

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isLoggedIn: false,
  
  setUser: (user) => {
    set({ user, isLoggedIn: !!user });
  },
  
  login: async (user) => {
    try {
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      set({ user, isLoggedIn: true });
      console.log('✅ User logged in:', user.email);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },
  
  logout: async () => {
    console.log('🔴 LOGOUT CALLED - STARTING PROCESS');
    try {
      // Clear AsyncStorage FIRST
      await AsyncStorage.multiRemove(['isLoggedIn', 'userData']);
      console.log('✅ AsyncStorage cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
    }
    
    // Update state to logged out
    set({ user: null, isLoggedIn: false });
    console.log('✅ User state cleared - user is now null, isLoggedIn is false');
    
    // Clear favorites
    useFavoritesStore.getState().clearFavorites();
    console.log('✅ Favorites cleared successfully');
    console.log('🎉 LOGOUT COMPLETE');
  },
  
  loadUser: async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      if (isLoggedIn === 'true') {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          set({ user, isLoggedIn: true });
          console.log('✅ User loaded from storage:', user.email);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },
}));

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favoriteIds: [],
  userId: null,
  
  setFavorites: (ids) => set({ favoriteIds: ids }),
  
  setUserId: (userId) => set({ userId }),
  
  addFavoriteItem: (id) => {
    const { favoriteIds } = get();
    if (!favoriteIds.includes(id)) {
      set({ favoriteIds: [...favoriteIds, id] });
    }
  },
  
  removeFavoriteItem: (id) => {
    const { favoriteIds } = get();
    set({ favoriteIds: favoriteIds.filter(fid => fid !== id) });
  },
  
  toggleFavorite: async (businessId: number) => {
    const { favoriteIds, userId } = get();
    const isFav = favoriteIds.includes(businessId);
    
    // Optimistically update the UI
    if (isFav) {
      set({ favoriteIds: favoriteIds.filter(fid => fid !== businessId) });
    } else {
      set({ favoriteIds: [...favoriteIds, businessId] });
    }
    
    // If user is logged in, sync with server
    if (userId) {
      try {
        if (isFav) {
          await removeFavorite(userId, businessId);
        } else {
          await addFavorite(userId, businessId);
        }
      } catch (error) {
        console.error('Error syncing favorite:', error);
        // Revert on error
        if (isFav) {
          set({ favoriteIds: [...get().favoriteIds, businessId] });
        } else {
          set({ favoriteIds: get().favoriteIds.filter(fid => fid !== businessId) });
        }
      }
    }
  },
  
  isFavorite: (id) => {
    return get().favoriteIds.includes(id);
  },
  
  clearFavorites: () => {
    set({ favoriteIds: [], userId: null });
  },
}));
