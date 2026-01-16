import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, Store, Phone, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { getFirebaseAuth } from '@/lib/firebase-config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { registerForPushNotifications, savePushToken } from '@/lib/notifications';
import { toast } from 'sonner-native';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL;

export default function SignUpScreen() {
  const router = useRouter();
  const { login } = useUserStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1'); // Default to US
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isBusinessUser, setIsBusinessUser] = useState(false);
  const [signUpMethod, setSignUpMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Field validation errors
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    if (countryCode === '+1') {
      // US format: (XXX) XXX-XXXX
      if (cleaned.length <= 3) return cleaned;
      if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (countryCode === '+91') {
      // India format: XXXXX-XXXXX
      if (cleaned.length <= 5) return cleaned;
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 10)}`;
    }
    return cleaned;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
    if (errors.phone) {
      setErrors({ ...errors, phone: '' });
    }
  };

  const getCleanPhoneNumber = () => {
    return phone.replace(/\D/g, '');
  };

  const validateEmailFields = () => {
    const newErrors = { name: '', email: '', phone: '', password: '', confirmPassword: '' };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const validatePhoneFields = () => {
    const newErrors = { name: '', email: '', phone: '', password: '', confirmPassword: '' };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else {
      const cleanPhone = getCleanPhoneNumber();
      if (countryCode === '+1' && cleanPhone.length !== 10) {
        newErrors.phone = 'Please enter a valid 10-digit US phone number';
        isValid = false;
      }
      if (countryCode === '+91' && cleanPhone.length !== 10) {
        newErrors.phone = 'Please enter a valid 10-digit Indian phone number';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSendOtp = async () => {
    if (!validatePhoneFields()) {
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `${countryCode}${getCleanPhoneNumber()}`;
      console.log('📞 Sending OTP to:', fullPhoneNumber);

      const response = await fetch(`${APP_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: fullPhoneNumber,
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      console.log('✅ OTP sent successfully');
      
      // Show debug OTP in development
      if (data._debug?.otp) {
        console.log('🔐 Debug OTP:', data._debug.otp);
        setDebugOtp(data._debug.otp);
        toast.success(`OTP sent! For testing: ${data._debug.otp}`, {
          duration: 10000,
        });
      } else {
        toast.success('OTP sent to your phone number');
      }
      
      setShowOtpInput(true);
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Send OTP error:', error);
      setLoading(false);
      toast.error(error.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = getCleanPhoneNumber();
      const fullPhoneNumber = `${countryCode}${cleanPhone}`;

      console.log('✅ Verifying OTP...');

      // Step 1: Verify OTP with backend
      const verifyResponse = await fetch(`${APP_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: fullPhoneNumber,
          otp: otp.trim(),
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Invalid OTP');
      }

      console.log('✅ OTP verified successfully');

      // Step 2: Create user record in database
      console.log('💾 Creating user in database...');
      const dbResponse = await fetch(`${APP_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: fullPhoneNumber,
          login_method: 'phone',
          is_business_user: isBusinessUser,
        }),
      });

      const dbData = await dbResponse.json();

      if (!dbResponse.ok) {
        if (dbData.error === 'ACCOUNT_EXISTS') {
          // Account exists - show alert and navigate to sign in
          setLoading(false);
          Alert.alert(
            'Account Already Exists',
            dbData.message || 'An account with this phone number already exists. Please sign in instead.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Go to Sign In',
                onPress: () => router.replace('/sign-in'),
              },
            ]
          );
          return;
        }
        throw new Error(dbData.error || 'Failed to create user account');
      }

      const dbUser = dbData;
      console.log('✅ User created in database:', dbUser.id);

      // Step 3: Store user in local state
      await login({
        id: dbUser.id,
        name: dbUser.name,
        phone: dbUser.phone,
        login_method: dbUser.login_method,
        is_business_user: dbUser.is_business_user,
      });

      console.log('✅ User logged in:', dbUser.phone);

      // Step 4: Register for push notifications
      try {
        const pushToken = await registerForPushNotifications();
        if (pushToken) {
          const userType = isBusinessUser ? 'business' : 'customer';
          await savePushToken(dbUser.id, userType, pushToken);
          console.log('✅ Push token registered:', pushToken);
        }
      } catch (error) {
        console.log('⚠️ Could not register push notifications:', error);
        // Don't block sign-up if push registration fails
      }

      setLoading(false);
      toast.success('Account created successfully!');
      
      // Navigate based on account type
      if (isBusinessUser) {
        console.log('🚀 Navigating to Account (Business user)...');
        router.replace('/(tabs)/account');
      } else {
        console.log('🚀 Navigating to Home (Customer)...');
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('❌ Verify OTP error:', error);
      setLoading(false);
      toast.error(error.message || 'Invalid OTP. Please check and try again.');
    }
  };

  const handleEmailSignUp = async () => {
    if (!validateEmailFields()) {
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        toast.error('Authentication service not available');
        setLoading(false);
        return;
      }

      console.log('📝 Creating account for:', email.trim());

      // Step 1: Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const firebaseUser = userCredential.user;

      console.log('✅ Firebase account created:', firebaseUser.uid);

      // Step 2: Update Firebase profile with name
      await updateProfile(firebaseUser, {
        displayName: name.trim(),
      });

      console.log('✅ Firebase profile updated with name:', name.trim());

      // Step 3: Create user record in database
      console.log('💾 Creating user in database...');
      const dbResponse = await fetch(`${APP_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: firebaseUser.email || email.trim().toLowerCase(),
          login_method: 'email',
          is_business_user: isBusinessUser,
          password: password, // Will be hashed by backend
        }),
      });

      const dbData = await dbResponse.json();

      if (!dbResponse.ok) {
        if (dbData.error === 'ACCOUNT_EXISTS') {
          // Account exists - show alert and navigate to sign in
          setLoading(false);
          Alert.alert(
            'Account Already Exists',
            dbData.message || 'An account with this email already exists. Please sign in instead.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Go to Sign In',
                onPress: () => router.replace('/sign-in'),
              },
            ]
          );
          return;
        }
        throw new Error(dbData.error || 'Failed to create user in database');
      }

      const dbUser = dbData;
      console.log('✅ User created in database:', dbUser.id);

      // Step 4: Store user in local state
      await login({
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        login_method: dbUser.login_method,
        is_business_user: dbUser.is_business_user,
      });

      console.log('✅ User logged in:', dbUser.email);

      // Step 5: Register for push notifications
      try {
        const pushToken = await registerForPushNotifications();
        if (pushToken) {
          const userType = isBusinessUser ? 'business' : 'customer';
          await savePushToken(dbUser.id, userType, pushToken);
          console.log('✅ Push token registered:', pushToken);
        }
      } catch (error) {
        console.log('⚠️ Could not register push notifications:', error);
        // Don't block sign-up if push registration fails
      }
      
      setLoading(false);
      toast.success('Account created successfully!');
      
      // Navigate based on account type
      if (isBusinessUser) {
        console.log('🚀 Navigating to Account (Business user)...');
        router.replace('/(tabs)/account');
      } else {
        console.log('🚀 Navigating to Home (Customer)...');
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      
      setLoading(false);
      
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Account Already Exists', 
          'An account with this email already exists. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Sign In', 
              onPress: () => {
                router.replace('/sign-in');
              }
            }
          ]
        );
        return;
      }
      
      let message = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use a stronger password';
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Get Started</Text>
          <Text style={styles.subtitle}>Create an account to start shopping</Text>

          {/* Account Type Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Store size={20} color={isBusinessUser ? '#f97316' : '#6b7280'} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Business Account</Text>
                <Text style={styles.toggleHint}>
                  {isBusinessUser ? 'Create and manage your business' : 'Sign up as a regular customer'}
                </Text>
              </View>
            </View>
            <Switch
              value={isBusinessUser}
              onValueChange={setIsBusinessUser}
              trackColor={{ false: '#e5e7eb', true: '#fed7aa' }}
              thumbColor={isBusinessUser ? '#f97316' : '#9ca3af'}
            />
          </View>

          {/* Sign Up Method Tabs */}
          <View style={styles.methodTabs}>
            <TouchableOpacity
              style={[styles.methodTab, signUpMethod === 'email' && styles.methodTabActive]}
              onPress={() => setSignUpMethod('email')}
              disabled={loading}
            >
              <Mail size={18} color={signUpMethod === 'email' ? '#f97316' : '#6b7280'} />
              <Text style={[styles.methodTabText, signUpMethod === 'email' && styles.methodTabTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodTab, signUpMethod === 'phone' && styles.methodTabActive]}
              onPress={() => setSignUpMethod('phone')}
              disabled={loading}
            >
              <Phone size={18} color={signUpMethod === 'phone' ? '#f97316' : '#6b7280'} />
              <Text style={[styles.methodTabText, signUpMethod === 'phone' && styles.methodTabTextActive]}>
                Phone OTP
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name Input (Common) */}
          <View style={[styles.inputContainer, errors.name && styles.inputContainerError]}>
            <User size={20} color={errors.name ? '#ef4444' : '#9ca3af'} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) {
                  setErrors({ ...errors, name: '' });
                }
              }}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          {signUpMethod === 'email' ? (
            <>
              {/* Email Input */}
              <View style={[styles.inputContainer, errors.email && styles.inputContainerError]}>
                <Mail size={20} color={errors.email ? '#ef4444' : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

              {/* Password Input */}
              <View style={[styles.inputContainer, errors.password && styles.inputContainerError]}>
                <Lock size={20} color={errors.password ? '#ef4444' : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min. 6 characters)"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors({ ...errors, password: '' });
                    }
                  }}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#9ca3af" />
                  ) : (
                    <Eye size={20} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

              {/* Confirm Password Input */}
              <View style={[styles.inputContainer, errors.confirmPassword && styles.inputContainerError]}>
                <Lock size={20} color={errors.confirmPassword ? '#ef4444' : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: '' });
                    }
                  }}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#9ca3af" />
                  ) : (
                    <Eye size={20} color="#9ca3af" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

              {/* Email Sign Up Button */}
              <TouchableOpacity 
                style={[styles.signUpButton, loading && styles.buttonDisabled]}
                onPress={handleEmailSignUp}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={[styles.signUpButtonText, { marginLeft: 10 }]}>Creating account...</Text>
                  </View>
                ) : (
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Country Code Selector */}
              <View style={styles.countryCodeContainer}>
                <Text style={styles.countryCodeLabel}>Country</Text>
                <View style={styles.countryCodeButtons}>
                  <TouchableOpacity
                    style={[styles.countryCodeButton, countryCode === '+1' && styles.countryCodeButtonActive]}
                    onPress={() => setCountryCode('+1')}
                    disabled={loading || showOtpInput}
                  >
                    <Text style={[styles.countryCodeButtonText, countryCode === '+1' && styles.countryCodeButtonTextActive]}>
                      🇺🇸 +1 (US)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.countryCodeButton, countryCode === '+91' && styles.countryCodeButtonActive]}
                    onPress={() => setCountryCode('+91')}
                    disabled={loading || showOtpInput}
                  >
                    <Text style={[styles.countryCodeButtonText, countryCode === '+91' && styles.countryCodeButtonTextActive]}>
                      🇮🇳 +91 (India)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Phone Input */}
              <View style={[styles.inputContainer, errors.phone && styles.inputContainerError]}>
                <Phone size={20} color={errors.phone ? '#ef4444' : '#9ca3af'} style={styles.inputIcon} />
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
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

              {showOtpInput && (
                <>
                  {/* Debug OTP Display */}
                  {debugOtp && (
                    <View style={styles.debugOtpContainer}>
                      <CheckCircle size={20} color="#10b981" />
                      <View style={styles.debugOtpContent}>
                        <Text style={styles.debugOtpLabel}>Test OTP Code:</Text>
                        <Text style={styles.debugOtpCode}>{debugOtp}</Text>
                      </View>
                    </View>
                  )}

                  {/* OTP Input */}
                  <View style={styles.otpContainer}>
                    <Text style={styles.otpLabel}>Enter 6-digit OTP sent to {countryCode}{getCleanPhoneNumber()}</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="000000"
                      placeholderTextColor="#9ca3af"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
                  </View>

                  {/* Verify OTP Button */}
                  <TouchableOpacity 
                    style={[styles.signUpButton, loading && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text style={[styles.signUpButtonText, { marginLeft: 10 }]}>Verifying...</Text>
                      </View>
                    ) : (
                      <Text style={styles.signUpButtonText}>Verify & Create Account</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.resendButton}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    <Text style={styles.resendButtonText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}

              {!showOtpInput && (
                <>
                  {/* Send OTP Button */}
                  <TouchableOpacity 
                    style={[styles.signUpButton, loading && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text style={[styles.signUpButtonText, { marginLeft: 10 }]}>Sending OTP...</Text>
                      </View>
                    ) : (
                      <Text style={styles.signUpButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/sign-in')} disabled={loading}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
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
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  toggleHint: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    backgroundColor: '#f9fafb',
  },
  inputContainerError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  phonePrefix: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    marginRight: 8,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },
  countryCodeContainer: {
    marginBottom: 16,
  },
  countryCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  debugOtpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    columnGap: 12,
  },
  debugOtpContent: {
    flex: 1,
  },
  debugOtpLabel: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
    marginBottom: 4,
  },
  debugOtpCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 4,
  },
  otpContainer: {
    marginBottom: 16,
  },
  otpLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 20,
    color: '#111827',
    backgroundColor: '#f9fafb',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '600',
  },
  signUpButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  termsText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signInLink: {
    fontSize: 14,
    color: '#f97316',
    fontWeight: '600',
  },
});
