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

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₹0.00';
    return `₹${num.toFixed(2)}`
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
          {(orderId && orderId !== 'undefined') ? (
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
            <Text style={styles.notificationText}>Order details have been sent to:</Text>
            <Text style={styles.notificationEmail}>{customerEmail}</Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={18} color="#f97316" />
            <Text style={styles.sectionTitle}>Order Summary</Text>
          </View>
          
          {(businessName && businessName !== 'undefined') ? (
            <Text style={styles.businessName}>{businessName}</Text>
          ) : null}
          
          {/* Product Items List */}
          {hasProducts ? (
            <View style={styles.itemsList}>
              {items.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                return (
                  <View key={index} style={styles.orderItem}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.itemImage} />
                    ) : null}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>{formatCurrency(itemTotal)}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Custom Orders Section */}
          {hasCustomOrders ? (
            <View style={[styles.customOrdersWrapper, hasProducts ? styles.customOrdersWithBorder : null]}>
              <View style={styles.customOrdersHeader}>
                <FileText size={16} color="#f97316" />
                <Text style={styles.customOrdersTitle}>
                  {customOrderCount > 1 || customOrders.length > 1 ? 'Custom Requests' : 'Custom Request'}
                </Text>
              </View>
              
              {customOrders.length > 0 ? (
                <>
                  {customOrders.map((customOrder, index) => (
                    <View key={index} style={styles.customOrderCard}>
                      <Text style={styles.customOrderDescription}>{customOrder.description}</Text>
                      
                      {customOrder.image_url ? (
                        <View style={styles.customOrderImageContainer}>
                          <Image 
                            source={{ uri: customOrder.image_url }} 
                            style={styles.customOrderImage} 
                          />
                          <View style={styles.customOrderImageLabel}>
                            <ImageIcon size={12} color="#6b7280" />
                            <Text style={styles.customOrderImageLabelText}>Attached Photo</Text>
                          </View>
                        </View>
                      ) : null}
                      
                      <View style={styles.customOrderEstimate}>
                        <Clock size={14} color="#f59e0b" />
                        <Text style={styles.customOrderEstimateText}>
                          Price estimate on {customOrder.delivery_preference === 'delivery' ? 'delivery' : 'pickup'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : customOrderCount > 0 ? (
                <View style={styles.customOrderCard}>
                  <View style={styles.customOrderPlaceholder}>
                    <FileText size={24} color="#f97316" />
                    <Text style={styles.customOrderPlaceholderText}>
                      {customOrderCount} shopping list request{customOrderCount > 1 ? 's' : ''} submitted
                    </Text>
                  </View>
                  
                  <View style={styles.customOrderEstimate}>
                    <Clock size={14} color="#f59e0b" />
                    <Text style={styles.customOrderEstimateText}>
                      Price estimate on {deliveryType === 'delivery' ? 'delivery' : 'pickup'}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
          
          {hasProducts ? (
            <>
              <View style={styles.summaryDivider} />
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {deliveryType === 'delivery' ? 'Delivery Fee' : 'Pickup'}
                </Text>
                <Text style={styles.summaryValue}>
                  {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Free'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Paid</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
            </>
          ) : null}

          {isCustomOrderOnly ? (
            <View style={styles.customOnlyNote}>
              <Text style={styles.customOnlyNoteText}>💡 You'll receive the price estimate when the store prepares your items. Payment will be collected on {deliveryType === 'delivery' ? 'delivery' : 'pickup'}.</Text>
            </View>
          ) : null}
        </View>

        {/* Delivery/Pickup Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {deliveryType === 'delivery' ? (
              <Truck size={18} color="#f97316" />
            ) : (
              <Store size={18} color="#f97316" />
            )}
            <Text style={styles.sectionTitle}>
              {deliveryType === 'delivery' ? 'Delivery Details' : 'Pickup Details'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Customer</Text>
            <Text style={styles.detailValue}>{customerName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{customerPhone}</Text>
          </View>
          
          {(deliveryType === 'delivery' && deliveryAddress && deliveryAddress !== 'undefined') ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{deliveryAddress}</Text>
            </View>
          ) : null}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusContainer}>
              <Clock size={12} color="#f59e0b" />
              <Text style={styles.statusText}>
                {isCustomOrderOnly ? 'Awaiting Quote' : 'Pending'}
              </Text>
            </View>
          </View>
          
          {(createdAt && createdAt !== 'undefined') ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Time</Text>
              <Text style={styles.detailValue}>{formatDate(createdAt)}</Text>
            </View>
          ) : null}
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wallet size={18} color="#f97316" />
            <Text style={styles.sectionTitle}>Payment</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Method</Text>
            <Text style={styles.detailValue}>{getPaymentLabel(paymentMethod)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>
              {paymentMethod === 'cod' || paymentMethod === 'cop' 
                ? `Pay on ${paymentMethod === 'cod' ? 'delivery' : 'pickup'}`
                : isCustomOrderOnly ? 'Pay after quote' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Special Instructions */}
        {(specialInstructions && specialInstructions !== 'undefined') ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color="#f97316" />
              <Text style={styles.sectionTitle}>Special Instructions</Text>
            </View>
            <Text style={styles.instructionsText}>{specialInstructions}</Text>
          </View>
        ) : null}
        
        <View style={styles.bottomSpacing} />
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
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 180,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#bbf7d0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  orderNumberCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fed7aa',
    elevation: 2,
  },
  orderNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  orderNumberLabel: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '700',
    letterSpacing: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
  },
  copyButton: {
    padding: 4,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copiedText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  orderIdText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    columnGap: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 13,
    color: '#6b7280',
  },
  notificationEmail: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  businessName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  itemsList: {
    rowGap: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  itemQty: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  // Custom Orders Section
  customOrdersWrapper: {
    marginTop: 0,
  },
  customOrdersWithBorder: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  customOrdersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 12,
  },
  customOrdersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  customOrderCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  customOrderDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 10,
  },
  customOrderPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 12,
  },
  customOrderPlaceholderText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  customOrderImageContainer: {
    marginBottom: 10,
  },
  customOrderImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  customOrderImageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    marginTop: 6,
  },
  customOrderImageLabelText: {
    fontSize: 12,
    color: '#6b7280',
  },
  customOrderEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  customOrderEstimateText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  customOnlyNote: {
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  customOnlyNoteText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f97316',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    rowGap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    elevation: 8,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
  },
  trackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: '#f9fafb',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  homeButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
});
