import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, MessageSquare, Send, CheckCircle } from 'lucide-react-native';
import { useUserStore } from '@/lib/store';
import { sendContactMessage } from '@/lib/api';

export default function ContactScreen() {
  const router = useRouter();
  const { user, isLoggedIn } = useUserStore();
  
  const [name, setName] = useState(isLoggedIn ? user?.name || '' : '');
  const [email, setEmail] = useState(isLoggedIn ? user?.email || '' : '');
  const [phone, setPhone] = useState(isLoggedIn ? user?.phone || '' : '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your message');
      return;
    }

    setIsLoading(true);
    try {
      await sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim(),
      });

      setIsSuccess(true);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color="#16a34a" />
          </View>
          <Text style={styles.successTitle}>Message Sent!</Text>
          <Text style={styles.successSubtitle}>
            Thank you for reaching out. We'll get back to you as soon as possible.
          </Text>
          <TouchableOpacity style={styles.backHomeButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.backHomeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Get in Touch</Text>
          <Text style={styles.introText}>
            Have a question or feedback? We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor="#94a3b8"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject</Text>
            <View style={styles.inputContainer}>
              <MessageSquare size={20} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="What's this about?"
                placeholderTextColor="#94a3b8"
                value={subject}
                onChangeText={setSubject}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message *</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Type your message here..."
                placeholderTextColor="#94a3b8"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Send size={20} color="white" />
              <Text style={styles.submitButtonText}>Send Message</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.contactInfo}>
          <Text style={styles.contactInfoTitle}>Other Ways to Reach Us</Text>
          <View style={styles.contactItem}>
            <Mail size={18} color="#64748b" />
            <Text style={styles.contactItemText}>support@ezypzy.shop</Text>
          </View>
          <View style={styles.contactItem}>
            <Phone size={18} color="#64748b" />
            <Text style={styles.contactItemText}>+91 98765 43210</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  intro: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textAreaContainer: {
    height: 140,
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: '100%',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    marginTop: 32,
    marginBottom: 40,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  contactInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  contactItemText: {
    fontSize: 14,
    color: '#64748b',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backHomeButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backHomeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
