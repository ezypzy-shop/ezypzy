import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing and using this mobile application, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use this application.
        </Text>

        <Text style={styles.sectionTitle}>2. Use of Service</Text>
        <Text style={styles.paragraph}>
          You agree to use the service only for lawful purposes and in a way that does not infringe the rights of, restrict or inhibit anyone else's use and enjoyment of the service.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          When you create an account with us, you must provide accurate, complete, and up-to-date information. Failure to do so constitutes a breach of the Terms. You are responsible for safeguarding the password and for all activities that occur under your account.
        </Text>

        <Text style={styles.sectionTitle}>4. Business Listings</Text>
        <Text style={styles.paragraph}>
          Businesses registered on this platform must provide accurate information about their products and services. We reserve the right to remove any listing that violates our policies or contains misleading information.
        </Text>

        <Text style={styles.sectionTitle}>5. Orders and Payments</Text>
        <Text style={styles.paragraph}>
          All orders placed through the application are subject to availability and confirmation of the order price. Payment must be made through the provided payment methods. We are not responsible for any issues arising from payment processing.
        </Text>

        <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The service and its original content, features, and functionality are and will remain the exclusive property of the company and its licensors. The service is protected by copyright, trademark, and other laws.
        </Text>

        <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          In no event shall the company, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
        </Text>

        <Text style={styles.sectionTitle}>8. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to defend, indemnify and hold harmless the company and its licensee and licensors from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses arising from your use of the service.
        </Text>

        <Text style={styles.sectionTitle}>9. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes by posting the new Terms on this page.
        </Text>

        <Text style={styles.sectionTitle}>11. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact us through the Contact Us section in the app.
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
});
