import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DealAlertsStore {
  alerts: number[]; // Array of ad IDs with alerts set
  loadAlerts: () => Promise<void>;
  toggleAlert: (adId: number) => void;
}

export const useDealAlertsStore = create<DealAlertsStore>((set, get) => ({
  alerts: [],

  loadAlerts: async () => {
    try {
      const stored = await AsyncStorage.getItem('deal_alerts');
      if (stored) {
        set({ alerts: JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Error loading deal alerts:', error);
    }
  },

  toggleAlert: (adId: number) => {
    const { alerts } = get();
    const newAlerts = alerts.includes(adId)
      ? alerts.filter(id => id !== adId)
      : [...alerts, adId];
    
    set({ alerts: newAlerts });
    
    // Persist to AsyncStorage
    AsyncStorage.setItem('deal_alerts', JSON.stringify(newAlerts)).catch(err =>
      console.error('Error saving deal alerts:', err)
    );
  },
}));

// Load alerts on app start
useDealAlertsStore.getState().loadAlerts();
