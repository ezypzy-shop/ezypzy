import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function ShippingPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipping & Delivery</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

        <Text style={styles.sectionTitle}>1. Shipping Coverage</Text>
        <Text style={styles.paragraph}>
          We facilitate shipping across India through various local businesses registered on our platform. Shipping availability and charges vary by business and location.
        </Text>
        <Text style={styles.bulletPoint}>• Local delivery within the same city</Text>
        <Text style={styles.bulletPoint}>• Regional delivery within the same state</Text>
        <Text style={styles.bulletPoint}>• Pan-India delivery (subject to business capabilities)</Text>

        <Text style={styles.sectionTitle}>2. Delivery Timeframes</Text>
        <Text style={styles.paragraph}>
          Delivery times vary based on business location and destination:
        </Text>
        <Text style={styles.bulletPoint}>• Same-day delivery: Available for select local businesses</Text>
        <Text style={styles.bulletPoint}>• Next-day delivery: For orders within the same city/region</Text>
        <Text style={styles.bulletPoint}>• Standard delivery: 3-7 business days for domestic shipments</Text>
        <Text style={styles.bulletPoint}>• Remote areas: May take 7-15 business days</Text>

        <Text style={styles.sectionTitle}>3. Shipping Charges</Text>
        <Text style={styles.paragraph}>
          Shipping charges are determined by:
        </Text>
        <Text style={styles.bulletPoint}>• Product weight and dimensions</Text>
        <Text style={styles.bulletPoint}>• Delivery location distance</Text>
        <Text style={styles.bulletPoint}>• Business shipping policy</Text>
        <Text style={styles.bulletPoint}>• Express or standard delivery option</Text>
        <Text style={styles.paragraph}>
          Shipping charges will be clearly displayed at checkout before you complete your order. Some businesses may offer free shipping for orders above a certain amount.
        </Text>

        <Text style={styles.sectionTitle}>4. Order Processing</Text>
        <Text style={styles.paragraph}>
          Orders are processed by individual businesses:
        </Text>
        <Text style={styles.bulletPoint}>• Order confirmation within 1-2 hours</Text>
        <Text style={styles.bulletPoint}>• Processing time: 1-2 business days</Text>
        <Text style={styles.bulletPoint}>• Packaging and quality check before dispatch</Text>
        <Text style={styles.bulletPoint}>• Tracking details sent once shipped</Text>

        <Text style={styles.sectionTitle}>5. Order Tracking</Text>
        <Text style={styles.paragraph}>
          Track your order easily:
        </Text>
        <Text style={styles.bulletPoint}>• Real-time tracking available in the Orders section</Text>
        <Text style={styles.bulletPoint}>• SMS and push notifications for order status updates</Text>
        <Text style={styles.bulletPoint}>• Track Order feature for quick status check</Text>
        <Text style={styles.bulletPoint}>• Estimated delivery date provided at checkout</Text>

        <Text style={styles.sectionTitle}>6. Delivery Partners</Text>
        <Text style={styles.paragraph}>
          Businesses on our platform use various trusted delivery partners including local couriers and national logistics providers. The specific delivery partner will be selected based on your location and the business's preference.
        </Text>

        <Text style={styles.sectionTitle}>7. Delivery Address</Text>
        <Text style={styles.paragraph}>
          Please ensure your delivery address is accurate and complete:
        </Text>
        <Text style={styles.bulletPoint}>• Include full name, phone number, and complete address</Text>
        <Text style={styles.bulletPoint}>• Provide landmarks for easier delivery</Text>
        <Text style={styles.bulletPoint}>• Specify alternative contact if not available</Text>
        <Text style={styles.bulletPoint}>• Address changes allowed before dispatch only</Text>

        <Text style={styles.sectionTitle}>8. Delivery Attempts</Text>
        <Text style={styles.paragraph}>
          Our delivery partners will make 2-3 delivery attempts:
        </Text>
        <Text style={styles.bulletPoint}>• First attempt on the scheduled delivery date</Text>
        <Text style={styles.bulletPoint}>• Second attempt the next business day</Text>
        <Text style={styles.bulletPoint}>• Final attempt after customer contact</Text>
        <Text style={styles.bulletPoint}>• Order returned to business if all attempts fail</Text>

        <Text style={styles.sectionTitle}>9. Delivery Confirmation</Text>
        <Text style={styles.paragraph}>
          Upon delivery:
        </Text>
        <Text style={styles.bulletPoint}>• Verify package condition before accepting</Text>
        <Text style={styles.bulletPoint}>• Check items match your order</Text>
        <Text style={styles.bulletPoint}>• Report any issues immediately</Text>
        <Text style={styles.bulletPoint}>• OTP or signature may be required for high-value items</Text>

        <Text style={styles.sectionTitle}>10. Undeliverable Orders</Text>
        <Text style={styles.paragraph}>
          Orders may be undeliverable due to:
        </Text>
        <Text style={styles.bulletPoint}>• Incorrect or incomplete address</Text>
        <Text style={styles.bulletPoint}>• Customer unavailability after multiple attempts</Text>
        <Text style={styles.bulletPoint}>• Restricted delivery area</Text>
        <Text style={styles.bulletPoint}>• Refused delivery by customer</Text>
        <Text style={styles.paragraph}>
          In such cases, the order will be returned to the business and a refund will be processed after deducting applicable shipping charges.
        </Text>

        <Text style={styles.sectionTitle}>11. Damaged or Lost Shipments</Text>
        <Text style={styles.paragraph}>
          If your shipment arrives damaged or is lost in transit:
        </Text>
        <Text style={styles.bulletPoint}>• Contact us immediately through the app</Text>
        <Text style={styles.bulletPoint}>• Provide photos of damaged packaging/product</Text>
        <Text style={styles.bulletPoint}>• We will investigate with the delivery partner</Text>
        <Text style={styles.bulletPoint}>• Replacement or refund will be processed within 7 business days</Text>

        <Text style={styles.sectionTitle}>12. International Shipping</Text>
        <Text style={styles.paragraph}>
          Currently, our platform focuses on domestic shipping within India. International shipping may be available for select businesses. Please check with individual businesses for international shipping options and charges.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact Us</Text>
        <Text style={styles.paragraph}>
          For any shipping and delivery related queries, please contact us through the Contact Us section in the app or reach out to the specific business from your order details.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 6,
    paddingLeft: 8,
  },
});
