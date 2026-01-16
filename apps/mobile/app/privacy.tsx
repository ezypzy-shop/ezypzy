import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

        <Text style={styles.paragraph}>
          We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we handle your personal data when you use our mobile application.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          We collect several types of information for various purposes to provide and improve our service to you:
        </Text>
        <Text style={styles.bulletPoint}>• Personal Data: Name, email address, phone number, and delivery address</Text>
        <Text style={styles.bulletPoint}>• Usage Data: Information about how you use our application</Text>
        <Text style={styles.bulletPoint}>• Location Data: With your permission, we may collect location data</Text>
        <Text style={styles.bulletPoint}>• Payment Information: Payment details processed through secure payment gateways</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the collected data for various purposes:
        </Text>
        <Text style={styles.bulletPoint}>• To provide and maintain our service</Text>
        <Text style={styles.bulletPoint}>• To process your orders and transactions</Text>
        <Text style={styles.bulletPoint}>• To notify you about changes to our service</Text>
        <Text style={styles.bulletPoint}>• To provide customer support</Text>
        <Text style={styles.bulletPoint}>• To gather analysis or valuable information to improve our service</Text>
        <Text style={styles.bulletPoint}>• To monitor the usage of our service</Text>
        <Text style={styles.bulletPoint}>• To detect, prevent and address technical issues</Text>

        <Text style={styles.sectionTitle}>3. Data Storage and Security</Text>
        <Text style={styles.paragraph}>
          Your data is stored securely on servers located in India. We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={styles.sectionTitle}>4. Sharing of Information</Text>
        <Text style={styles.paragraph}>
          We do not sell, trade, or rent your personal identification information to others. We may share your information with:
        </Text>
        <Text style={styles.bulletPoint}>• Businesses registered on the platform (only order-related information)</Text>
        <Text style={styles.bulletPoint}>• Payment processors (for transaction processing)</Text>
        <Text style={styles.bulletPoint}>• Service providers who assist us in operating our application</Text>
        <Text style={styles.bulletPoint}>• Law enforcement or regulatory authorities when required by law</Text>

        <Text style={styles.sectionTitle}>5. Your Data Protection Rights</Text>
        <Text style={styles.paragraph}>
          Under Indian data protection laws, you have the following rights:
        </Text>
        <Text style={styles.bulletPoint}>• The right to access your personal data</Text>
        <Text style={styles.bulletPoint}>• The right to rectification of inaccurate data</Text>
        <Text style={styles.bulletPoint}>• The right to erasure of your data</Text>
        <Text style={styles.bulletPoint}>• The right to restrict processing</Text>
        <Text style={styles.bulletPoint}>• The right to data portability</Text>
        <Text style={styles.bulletPoint}>• The right to object to processing</Text>

        <Text style={styles.sectionTitle}>6. Cookies and Tracking</Text>
        <Text style={styles.paragraph}>
          We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your device to refuse all cookies or to indicate when a cookie is being sent.
        </Text>

        <Text style={styles.sectionTitle}>7. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          Our application may contain links to third-party websites or services that are not operated by us. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
        </Text>

        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our service is not intended for use by children under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and you are aware that your child has provided us with personal data, please contact us.
        </Text>

        <Text style={styles.sectionTitle}>9. Changes to Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us through the Contact Us section in the app.
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
