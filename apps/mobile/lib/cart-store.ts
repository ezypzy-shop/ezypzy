import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  businessId: string;
  businessName: string;
}

interface CartStore {
  cart: CartItem[];
  _clearFlag: boolean;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: [],
      _clearFlag: true, // This will trigger a one-time clear
      
      addToCart: (item) => {
        const { cart } = get();
        const existingItem = cart.find((i) => i.productId === item.productId);
        
        if (existingItem) {
          set({
            cart: cart.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({
            cart: [...cart, { ...item, quantity: 1 }],
          });
        }
      },
      
      removeFromCart: (productId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.productId !== productId),
        }));
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        
        set((state) => ({
          cart: state.cart.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },
      
      clearCart: () => {
        set({ cart: [] });
      },
      
      getCartTotal: () => {
        const { cart } = get();
        if (!cart || !Array.isArray(cart)) return 0;
        return cart.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      
      getCartItemCount: () => {
        const { cart } = get();
        if (!cart || !Array.isArray(cart)) return 0;
        return cart.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Auto-clear cart on first load after this update
        if (state?._clearFlag) {
          state.cart = [];
          state._clearFlag = false;
        }
      },
    }
  )
);
