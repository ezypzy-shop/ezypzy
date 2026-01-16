import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function RefundPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund & Cancellation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

        <Text style={styles.sectionTitle}>1. Order Cancellation</Text>
        <Text style={styles.paragraph}>
          You can cancel your order before it has been dispatched by the business. Once an order has been dispatched, cancellation may not be possible.
        </Text>
        <Text style={styles.bulletPoint}>• Orders can be cancelled within 1 hour of placement (if not dispatched)</Text>
        <Text style={styles.bulletPoint}>• Contact the business directly through the app to request cancellation</Text>
        <Text style={styles.bulletPoint}>• No cancellation fee for cancellations within the allowed time</Text>

        <Text style={styles.sectionTitle}>2. Refund Eligibility</Text>
        <Text style={styles.paragraph}>
          Refunds are processed in the following cases:
        </Text>
        <Text style={styles.bulletPoint}>• Product received is defective or damaged</Text>
        <Text style={styles.bulletPoint}>• Wrong product delivered</Text>
        <Text style={styles.bulletPoint}>• Product is significantly different from description</Text>
        <Text style={styles.bulletPoint}>• Order cancelled before dispatch</Text>
        <Text style={styles.bulletPoint}>• Non-delivery of product within the promised time frame</Text>

        <Text style={styles.sectionTitle}>3. Non-Refundable Items</Text>
        <Text style={styles.paragraph}>
          The following items are not eligible for refund:
        </Text>
        <Text style={styles.bulletPoint}>• Perishable goods (food items, flowers, etc.)</Text>
        <Text style={styles.bulletPoint}>• Custom-made or personalized products</Text>
        <Text style={styles.bulletPoint}>• Products marked as "non-returnable"</Text>
        <Text style={styles.bulletPoint}>• Digital products or services already consumed</Text>

        <Text style={styles.sectionTitle}>4. Refund Process</Text>
        <Text style={styles.paragraph}>
          To request a refund:
        </Text>
        <Text style={styles.bulletPoint}>1. Go to Orders section in the app</Text>
        <Text style={styles.bulletPoint}>2. Select the order you want to return/refund</Text>
        <Text style={styles.bulletPoint}>3. Click on "Request Refund" and provide reason</Text>
        <Text style={styles.bulletPoint}>4. Upload photos if product is damaged/defective</Text>
        <Text style={styles.bulletPoint}>5. Wait for business approval (within 24-48 hours)</Text>

        <Text style={styles.sectionTitle}>5. Refund Timeline</Text>
        <Text style={styles.paragraph}>
          Once your refund request is approved:
        </Text>
        <Text style={styles.bulletPoint}>• Refunds will be processed within 5-7 business days</Text>
        <Text style={styles.bulletPoint}>• Amount will be credited to your original payment method</Text>
        <Text style={styles.bulletPoint}>• Bank processing may take additional 3-5 business days</Text>
        <Text style={styles.bulletPoint}>• You will receive a notification once refund is processed</Text>

        <Text style={styles.sectionTitle}>6. Return Shipping</Text>
        <Text style={styles.paragraph}>
          For products eligible for return:
        </Text>
        <Text style={styles.bulletPoint}>• Business will arrange pickup at no extra cost (for defective/wrong items)</Text>
        <Text style={styles.bulletPoint}>• Customer is responsible for return shipping (for change of mind)</Text>
        <Text style={styles.bulletPoint}>• Products must be in original condition with tags/packaging intact</Text>

        <Text style={styles.sectionTitle}>7. Partial Refunds</Text>
        <Text style={styles.paragraph}>
          Partial refunds may be granted in cases where:
        </Text>
        <Text style={styles.bulletPoint}>• Only part of the order is damaged/defective</Text>
        <Text style={styles.bulletPoint}>• Product shows signs of use or damage by customer</Text>
        <Text style={styles.bulletPoint}>• Product is returned without original packaging</Text>

        <Text style={styles.sectionTitle}>8. Business-Specific Policies</Text>
        <Text style={styles.paragraph}>
          Individual businesses may have their own return and refund policies. Always check the business's specific policy before making a purchase. In case of conflict, the more customer-friendly policy will apply.
        </Text>

        <Text style={styles.sectionTitle}>9. Dispute Resolution</Text>
        <Text style={styles.paragraph}>
          If you are not satisfied with the refund decision:
        </Text>
        <Text style={styles.bulletPoint}>• Contact us through the Contact Us section</Text>
        <Text style={styles.bulletPoint}>• Provide order details and reason for dispute</Text>
        <Text style={styles.bulletPoint}>• We will review and respond within 48 hours</Text>

        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          For any questions regarding refunds and cancellations, please contact us through the Contact Us section in the app.
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
