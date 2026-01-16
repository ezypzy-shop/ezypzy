import '@/utils/console-logger';
import '@/utils/screenshot-capture';
import '@/utils/routing-error-detector';
import '@/utils/navigation-tracker';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { clearAllUserData } from '@/utils/clear-storage';

export default function RootLayout() {
  // Clear all user data on app start (one-time cleanup)
  useEffect(() => {
    clearAllUserData();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen 
          name="checkout" 
          options={{ 
            headerShown: true,
            headerTitle: 'Checkout',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="order-success" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen 
          name="business-dashboard" 
          options={{ 
            headerShown: true,
            headerTitle: 'Business Dashboard',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="create-business" 
          options={{ 
            headerShown: true,
            headerTitle: 'Create Business',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="addresses" 
          options={{ 
            headerShown: true,
            headerTitle: 'My Addresses',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="contact" 
          options={{ 
            headerShown: true,
            headerTitle: 'Contact Us',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="custom-request" 
          options={{ 
            headerShown: true,
            headerTitle: 'Custom Request',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="edit-profile" 
          options={{ 
            headerShown: true,
            headerTitle: 'Edit Profile',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="privacy" 
          options={{ 
            headerShown: true,
            headerTitle: 'Privacy Policy',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="notifications" 
          options={{ 
            headerShown: true,
            headerTitle: 'Notifications',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="refund-policy" 
          options={{ 
            headerShown: true,
            headerTitle: 'Refund Policy',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="reset-password" 
          options={{ 
            headerShown: true,
            headerTitle: 'Reset Password',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="saved" 
          options={{ 
            headerShown: true,
            headerTitle: 'Saved Items',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="shipping-policy" 
          options={{ 
            headerShown: true,
            headerTitle: 'Shipping Policy',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="terms" 
          options={{ 
            headerShown: true,
            headerTitle: 'Terms & Conditions',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="track-order" 
          options={{ 
            headerShown: true,
            headerTitle: 'Track Order',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="business/[id]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Store Details',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="ad-products/[id]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Product Details',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="manage-products/[id]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Manage Product',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="edit-business/[id]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Edit Business',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="order-details/[id]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Order Details',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="manage-ads/[id]" 
          options={{ 
            headerShown: true,
            headerTitle: 'Manage Ad',
            headerBackTitle: 'Back',
          }} 
        />
        <Stack.Screen 
          name="(modals)/cart" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Shopping Cart',
          }} 
        />
        <Stack.Screen 
          name="(modals)/search" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Search',
          }} 
        />
        <Stack.Screen 
          name="(modals)/spin-wheel" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Spin the Wheel',
          }} 
        />
        <Stack.Screen 
          name="(modals)/offer-form" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Create Offer',
          }} 
        />
        <Stack.Screen 
          name="(modals)/product-form" 
          options={{ 
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Add Product',
          }} 
        />
      </Stack>
      <Toaster />
    </SafeAreaProvider>
  );
}
