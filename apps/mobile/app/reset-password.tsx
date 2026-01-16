import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_APP_URL || '';
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setStep('code');
        Alert.alert('Success', 'A reset code has been sent to your email');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to send reset code');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!resetCode.trim()) {
      Alert.alert('Error', 'Please enter the reset code');
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_APP_URL || '';
      const response = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: resetCode.trim() }),
      });

      if (response.ok) {
        setStep('password');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Invalid reset code');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_APP_URL || '';
      const response = await fetch(`${API_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: resetCode.trim(),
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          'Your password has been reset successfully',
          [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to reset password');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {step === 'email' && (
          <>
            <View style={styles.iconContainer}>
              <Mail size={48} color="#f97316" />
            </View>
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a code to reset your password
            </Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'code' && (
          <>
            <View style={styles.iconContainer}>
              <CheckCircle size={48} color="#22c55e" />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to {email}. Please enter it below.
            </Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#9ca3af"
                  value={resetCode}
                  onChangeText={setResetCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleSendCode}
                disabled={loading}
              >
                <Text style={styles.linkText}>Didn't receive the code? Resend</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'password' && (
          <>
            <View style={styles.iconContainer}>
              <Lock size={48} color="#f97316" />
            </View>
            <Text style={styles.title}>Create new password</Text>
            <Text style={styles.subtitle}>
              Your new password must be different from previous passwords
            </Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  placeholderTextColor="#9ca3af"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  form: {
    columnGap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    columnGap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#111827',
  },
  button: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  linkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
});
