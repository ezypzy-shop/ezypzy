import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowLeft, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { toast } from 'sonner-native';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL;

export default function SignInScreen() {
  const router = useRouter();
  const [signInMethod, setSignInMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    
    if (countryCode === '+1') {
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (countryCode === '+91') {
      if (cleaned.length <= 5) return cleaned;
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 10)}`;
    }
    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
  };

  const getCleanPhoneNumber = () => {
    return phone.replace(/\D/g, '');
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const cleanPhone = getCleanPhoneNumber();
    if (countryCode === '+1' && cleanPhone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit US phone number');
      return;
    }
    if (countryCode === '+91' && cleanPhone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit Indian phone number');
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${cleanPhone}`;
      console.log('📞 Sending OTP to:', fullPhoneNumber);

      const response = await fetch(`${APP_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: fullPhoneNumber,
          action: 'sign-in', // Indicate this is for sign-in
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoading(false);
        Alert.alert('Error', data.error || 'Failed to send OTP');
        return;
      }

      // Store debug OTP for testing
      if (data.debug_otp) {
        setDebugOtp(data.debug_otp);
        console.log('🔐 Debug OTP:', data.debug_otp);
        toast.success(`OTP sent! Debug code: ${data.debug_otp}`);
      } else {
        toast.success('OTP sent successfully!');
      }

      console.log('✅ OTP sent successfully');
      setLoading(false);
      setShowOtpInput(true);
      
    } catch (error: any) {
      console.error('❌ Send OTP error:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP code');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = getCleanPhoneNumber();
      const fullPhoneNumber = `${countryCode}${cleanPhone}`;
      
      console.log('✅ Verifying OTP for sign-in...');

      const response = await fetch(`${APP_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: fullPhoneNumber,
          otp: otp.trim(),
          action: 'sign-in', // Indicate this is for sign-in (not sign-up)
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setLoading(false);
        Alert.alert('Error', result.error || 'Invalid OTP. Please try again.');
        return;
      }

      console.log('✅ OTP verified successfully');

      // Verify we have user data from the sign-in
      if (!result.user) {
        setLoading(false);
        console.error('❌ No user data in response');
        Alert.alert('Error', 'User account not found. Please sign up first.');
        return;
      }

      console.log('✅ User logged in:', result.user.phone);
      console.log('👤 User type:', result.user.is_business_user ? 'Business' : 'Customer');

      // Store user info in BOTH storage systems to keep them in sync
      const userData = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email || null,
        phone: result.user.phone,
        login_method: result.user.login_method,
        is_business_user: result.user.is_business_user,
      };

      // Store for useAuth hook (key: @ezypzy_user)
      await AsyncStorage.setItem('@ezypzy_user', JSON.stringify(userData));
      
      // Store for useUserStore (keys: isLoggedIn, userData)
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      console.log('✅ User data stored in AsyncStorage');

      // Register for push notifications
      try {
        const pushToken = await registerForPushNotifications();
        if (pushToken) {
          const userType = result.user.is_business_user ? 'business' : 'customer';
          await savePushToken(result.user.id, userType, pushToken);
          console.log('✅ Push token registered:', pushToken);
        }
      } catch (error) {
        console.log('⚠️ Could not register push notifications:', error);
        // Don't block sign-in if push registration fails
      }

      setLoading(false);
      
      // Navigate based on account type
      if (result.user.is_business_user) {
        console.log('🚀 Navigating to Account tab (Business user)...');
        router.replace('/(tabs)/account');
      } else {
        console.log('🚀 Navigating to Home tab (Customer)...');
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('❌ Verify OTP error:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Attempting sign in with email:', email.trim());
      
      // Call login API endpoint
      const response = await fetch(`${APP_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      // Parse the response
      const result = await response.json();

      // Check if response was successful
      if (!response.ok) {
        setLoading(false);
        // Don't log the error to console since we're showing an Alert
        Alert.alert('Sign In Failed', result.error || 'Invalid credentials. Please check your email and password.');
        return;
      }

      // Verify we have user data
      if (!result.user) {
        setLoading(false);
        console.error('❌ No user data in response');
        Alert.alert('Error', 'Unexpected error. Please try again.');
        return;
      }

      console.log('✅ Sign in successful:', result.user.email);
      console.log('👤 User type:', result.user.is_business_user ? 'Business' : 'Customer');

      // Store user info in BOTH storage systems to keep them in sync
      const userData = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        login_method: result.user.login_method,
        is_business_user: result.user.is_business_user,
      };

      // Store for useAuth hook (key: @ezypzy_user)
      await AsyncStorage.setItem('@ezypzy_user', JSON.stringify(userData));
      
      // Store for useUserStore (keys: isLoggedIn, userData)
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      console.log('✅ User data stored in AsyncStorage');

      // Register for push notifications
      try {
        const pushToken = await registerForPushNotifications();
        if (pushToken) {
          const userType = result.user.is_business_user ? 'business' : 'customer';
          await savePushToken(result.user.id, userType, pushToken);
          console.log('✅ Push token registered:', pushToken);
        }
      } catch (error) {
        console.log('⚠️ Could not register push notifications:', error);
        // Don't block sign-in if push registration fails
      }

      setLoading(false);
      
      // Navigate based on account type
      if (result.user.is_business_user) {
        console.log('🚀 Navigating to Account tab (Business user)...');
        router.replace('/(tabs)/account');
      } else {
        console.log('🚀 Navigating to Home tab (Customer)...');
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('❌ Sign in network error:', error.message);
      setLoading(false);
      Alert.alert('Error', 'An error occurred. Please check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/account')}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign In</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue shopping</Text>
        </View>

        {/* Sign In Method Tabs */}
        <View style={styles.methodTabs}>
          <TouchableOpacity
            style={[styles.methodTab, signInMethod === 'email' && styles.methodTabActive]}
            onPress={() => {
              setSignInMethod('email');
              setShowOtpInput(false);
              setOtp('');
              setDebugOtp('');
            }}
            disabled={loading}
          >
            <Mail size={18} color={signInMethod === 'email' ? '#f97316' : '#6b7280'} />
            <Text style={[styles.methodTabText, signInMethod === 'email' && styles.methodTabTextActive]}>
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodTab, signInMethod === 'phone' && styles.methodTabActive]}
            onPress={() => {
              setSignInMethod('phone');
              setShowOtpInput(false);
              setOtp('');
              setDebugOtp('');
            }}
            disabled={loading}
          >
            <Phone size={18} color={signInMethod === 'phone' ? '#f97316' : '#6b7280'} />
            <Text style={[styles.methodTabText, signInMethod === 'phone' && styles.methodTabTextActive]}>
              Phone OTP
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {signInMethod === 'email' ? (
            <>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock size={20} color="#9ca3af" />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => router.push('/reset-password')}
                disabled={loading}
              >
                <Text style={styles.forgotButtonText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleEmailSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Country Code Selector */}
              <View style={styles.countryCodeButtons}>
                <TouchableOpacity
                  style={[styles.countryCodeButton, countryCode === '+1' && styles.countryCodeButtonActive]}
                  onPress={() => setCountryCode('+1')}
                  disabled={loading || showOtpInput}
                >
                  <Text style={[styles.countryCodeButtonText, countryCode === '+1' && styles.countryCodeButtonTextActive]}>
                    🇺🇸 +1
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.countryCodeButton, countryCode === '+91' && styles.countryCodeButtonActive]}
                  onPress={() => setCountryCode('+91')}
                  disabled={loading || showOtpInput}
                >
                  <Text style={[styles.countryCodeButtonText, countryCode === '+91' && styles.countryCodeButtonTextActive]}>
                    🇮🇳 +91
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Phone size={20} color="#9ca3af" />
                <Text style={styles.phonePrefix}>{countryCode}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={countryCode === '+1' ? '(555) 123-4567' : '98765-43210'}
                  placeholderTextColor="#9ca3af"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  editable={!loading && !showOtpInput}
                  maxLength={countryCode === '+1' ? 14 : 11}
                />
              </View>

              {showOtpInput && (
                <>
                  {/* Debug OTP Display */}
                  {debugOtp && (
                    <View style={styles.debugOtpBox}>
                      <Text style={styles.debugOtpLabel}>🔐 Test OTP Code:</Text>
                      <Text style={styles.debugOtpCode}>{debugOtp}</Text>
                      <Text style={styles.debugOtpHint}>
                        (In production, this would be sent via SMS)
                      </Text>
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Lock size={20} color="#9ca3af" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit OTP"
                      placeholderTextColor="#9ca3af"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={() => {
                      setShowOtpInput(false);
                      setOtp('');
                      setDebugOtp('');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.resendButtonText}>Change Phone Number</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.signInButton}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.signInButtonText}>Verify & Sign In</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {!showOtpInput && (
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.signInButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push('/sign-up')}
            disabled={loading}
          >
            <Text style={styles.createAccountButtonText}>Create New Account</Text>
          </TouchableOpacity>

          <View style={styles.helpSection}>
            <Text style={styles.helpText}>Don't have an account yet?</Text>
            <Text style={styles.helpSubtext}>Tap "Create New Account" above to get started!</Text>
          </View>
        </View>
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
  welcomeSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    columnGap: 4,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    columnGap: 8,
  },
  methodTabActive: {
    backgroundColor: '#ffffff',
  },
  methodTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  methodTabTextActive: {
    color: '#f97316',
    fontWeight: '600',
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
  phonePrefix: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  countryCodeButtons: {
    flexDirection: 'row',
    columnGap: 12,
  },
  countryCodeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  countryCodeButtonActive: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  countryCodeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  countryCodeButtonTextActive: {
    color: '#f97316',
    fontWeight: '600',
  },
  debugOtpBox: {
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    marginBottom: 8,
  },
  debugOtpLabel: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '600',
    marginBottom: 6,
  },
  debugOtpCode: {
    fontSize: 24,
    color: '#15803d',
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 6,
  },
  debugOtpHint: {
    fontSize: 11,
    color: '#166534',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotButtonText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: -8,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    columnGap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  createAccountButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f97316',
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f97316',
  },
  helpSection: {
    marginTop: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
  },
  helpSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
