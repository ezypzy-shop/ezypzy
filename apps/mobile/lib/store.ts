import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchNotifications } from './api';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_business_user?: boolean;
}

interface UserStore {
  user: User | null;
  isLoggedIn: boolean;
  unreadNotificationCount: number;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
  loadNotificationCount: () => Promise<void>;
  decrementNotificationCount: () => void;
  clearNotificationCount: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isLoggedIn: false,
  unreadNotificationCount: 0,

  loadUser: async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      if (isLoggedIn === 'true') {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          set({ user: userData, isLoggedIn: true });
          
          // Load notification count after user is loaded
          get().loadNotificationCount();
        }
      } else {
        set({ user: null, isLoggedIn: false, unreadNotificationCount: 0 });
      }
    } catch (error) {
      console.error('[Store] Error loading user:', error);
      set({ user: null, isLoggedIn: false, unreadNotificationCount: 0 });
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem('isLoggedIn');
      await AsyncStorage.removeItem('userData');
      set({ user: null, isLoggedIn: false, unreadNotificationCount: 0 });
    } catch (error) {
      console.error('[Store] Error during logout:', error);
      throw error;
    }
  },

  loadNotificationCount: async () => {
    try {
      const { user } = get();
      if (!user?.id) {
        set({ unreadNotificationCount: 0 });
        return;
      }

      const notifications = await fetchNotifications(user.id);
      const unreadCount = notifications.filter((n: any) => !n.is_read).length;
      set({ unreadNotificationCount: unreadCount });
    } catch (error) {
      console.error('[Store] Error loading notification count:', error);
      set({ unreadNotificationCount: 0 });
    }
  },

  decrementNotificationCount: () => {
    const { unreadNotificationCount } = get();
    if (unreadNotificationCount > 0) {
      set({ unreadNotificationCount: unreadNotificationCount - 1 });
    }
  },

  clearNotificationCount: () => {
    set({ unreadNotificationCount: 0 });
  },
}));

// Poll for notifications every 30 seconds (only when user is logged in)
let notificationPollingInterval: NodeJS.Timeout | null = null;

export const startNotificationPolling = () => {
  if (notificationPollingInterval) {
    clearInterval(notificationPollingInterval);
  }

  notificationPollingInterval = setInterval(() => {
    const store = useUserStore.getState();
    if (store.isLoggedIn && store.user?.id) {
      store.loadNotificationCount();
    }
  }, 30000); // Poll every 30 seconds
};

export const stopNotificationPolling = () => {
  if (notificationPollingInterval) {
    clearInterval(notificationPollingInterval);
    notificationPollingInterval = null;
  }
};
