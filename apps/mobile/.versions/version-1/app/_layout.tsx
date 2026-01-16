import '@/utils/console-logger';
import '@/utils/screenshot-capture';
import '@/utils/routing-error-detector';
import '@/utils/navigation-tracker';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Toaster } from 'sonner-native';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Initialize notification system after app loads
    const initNotifications = async () => {
      try {
        // Dynamic import to avoid blocking app startup
        const notifModule = await import('@/lib/notifications');
        await notifModule.requestNotificationPermissions();
        
        // Set up notification listeners
        notifModule.setupNotificationListeners(router);
        
        // Start polling for new notifications
        notifModule.startNotificationPolling();
      } catch (error) {
        console.log('Notifications not available:', error);
      }
    };

    initNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="business/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="order-success" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="contact" options={{ headerShown: false }} />
        <Stack.Screen name="track-order" options={{ headerShown: false }} />
        <Stack.Screen name="business-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="create-business" options={{ headerShown: false }} />
        <Stack.Screen name="manage-business/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="manage-products/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="manage-ads/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="business-orders/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="custom-request" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="saved" options={{ headerShown: false }} />
        <Stack.Screen name="addresses" options={{ headerShown: false }} />
        <Stack.Screen name="ad/[id]" options={{ headerShown: false }} />
      </Stack>
      <Toaster />
    </SafeAreaProvider>
  );
}
