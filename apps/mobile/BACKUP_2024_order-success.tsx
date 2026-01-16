import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Home, FileText, MapPin, Phone, Mail, Clock, Package, Truck, Store, Wallet, Copy, Check, ShoppingBag, Image as ImageIcon } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

type OrderItem = {
  product_id?: number;
  product_name: string;
  quantity: number;
  price: number;
  image?: string;
};

type CustomOrderItem = {
  description: string;
  image_url?: string;
  delivery_preference?: string;
};

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [copied, setCopied] = useState(false);

  // Parse params
  const orderId = params.orderId as string;
  const orderNumber = params.orderNumber as string;
  const customerName = params.customerName as string;
  const customerEmail = params.customerEmail as string;
  const customerPhone = params.customerPhone as string;
  const deliveryType = params.deliveryType as string;
  const deliveryAddress = params.deliveryAddress as string;
  const paymentMethod = params.paymentMethod as string;
  const subtotal = parseFloat(params.subtotal as string) || 0;
  const deliveryFee = parseFloat(params.deliveryFee as string) || 0;
  const total = parseFloat(params.total as string) || 0;
  const specialInstructions = params.specialInstructions as string;
  const businessName = params.businessName as string;
  const createdAt = params.createdAt as string;
  const customOrderCount = parseInt(params.customOrderCount as string) || 0;
  const isCustomOrderOnly = params.isCustomOrderOnly === 'true';
  
  // Parse items
  let items: OrderItem[] = [];
  try {
    items = JSON.parse(params.items as string) || [];
  } catch (e) {
    items = [];
  }

  // Parse custom orders
  let customOrders: CustomOrderItem[] = [];
  try {
    customOrders = JSON.parse(params.customOrders as string) || [];
  } catch (e) {
    customOrders = [];
  }

  const handleCopyOrderNumber = async () => {
    await Clipboard.setStringAsync(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'gpay': return 'Google Pay';
      case 'paytm': return 'Paytm';
      case 'card': return 'Credit/Debit Card';
      case 'cod': return 'Cash on Delivery';
      case 'cop': return 'Cash on Pickup';
      default: return method;
    }
  };

  const handleTrackOrder = () => {
    // Navigate with both orderId and orderNumber for redundancy
    router.push({
      pathname: '/track-order',
      params: {
        orderId: orderId,
        orderNumber: orderNumber,
      }
    });
  };

  // Check if we have custom orders (either from parsed list or from count)
  const hasCustomOrders = customOrders.length > 0 || customOrderCount > 0;
  const hasProducts = items.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Header with Animation */}
        <View style={styles.successHeader}>
          <View style={styles.iconContainer}>
            <View style={styles.iconRing}>
              <CheckCircle size={56} color="#22c55e" />
            </View>
          </View>
          
          <Text style={styles.title}>
            {isCustomOrderOnly ? 'Request Submitted!' : 'Order Placed!'}
          </Text>
          <Text style={styles.subtitle}>
            {isCustomOrderOnly 
              ? 'The store will review your request and provide a quote'
              : 'Your order has been confirmed'}
          </Text>
        </View>

        {/* Order Number Card */}
        <View style={styles.orderNumberCard}>
          <View style={styles.orderNumberBadge}>
            <ShoppingBag size={16} color="#f97316" />
            <Text style={styles.orderNumberLabel}>ORDER NUMBER</Text>
          </View>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>{orderNumber}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyOrderNumber}>
              {copied ? (
                <View style={styles.copiedBadge}>
                  <Check size={14} color="#22c55e" />
                  <Text style={styles.copiedText}>Copied!</Text>
                </View>
              ) : (
                <View style={styles.copyBadge}>
                  <Copy size={14} color="#6b7280" />
                  <Text style={styles.copyText}>Copy</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {orderId ? (
            <Text style={styles.orderIdText}>Reference ID: #{orderId}</Text>
          ) : null}
        </View>

        {/* Notification Info */}
        <View style={styles.notificationCard}>
          <View style={styles.notificationIcon}>
            <Mail size={20} color="#ffffff" />
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Confirmation Sent!</Text>
            <Text style={styles.notificationText}>
              Order details have been sent to:
            </Text>
            <Text style={styles.notificationEmail}>{customerEmail}</Text>
          </View>
        </View>

        {/* Rest of the component stays the same */}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.trackButton}
          onPress={handleTrackOrder}
        >
          <MapPin size={18} color="#ffffff" />
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Home size={18} color="#374151" />
          <Text style={styles.homeButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // All your existing styles here...
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 180,
  },
  // ... (rest of your styles)
});
