import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Gift, Clock, Store, LogIn, UserPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spinWheel, getActiveCodes, checkSpinCooldown } from '@/lib/api';

interface SpinCode {
  id: string;
  code: string;
  discount_amount: number;
  expires_at: string;
  business_name: string;
  business_id: string;
}

export default function SpinWheelScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [activeCodes, setActiveCodes] = useState<SpinCode[]>([]);
  const [canSpin, setCanSpin] = useState(false);
  const [nextSpinTime, setNextSpinTime] = useState<Date | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  // Update timer every minute
  useEffect(() => {
    if (!canSpin && nextSpinTime) {
      const interval = setInterval(() => {
        const now = new Date();
        if (now >= nextSpinTime) {
          setCanSpin(true);
          setNextSpinTime(null);
          clearInterval(interval);
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [canSpin, nextSpinTime]);

  const checkAuthAndLoadData = async () => {
    try {
      // Check if user is signed in
      const userData = await AsyncStorage.getItem('@ezypzy_user');
      
      if (!userData) {
        // Not signed in - show the screen but disable features
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      setUserId(user.id);
      setIsAuthenticated(true);

      // Load data
      await Promise.all([
        loadActiveCodes(user.id),
        loadCooldownStatus(user.id)
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking auth:', error);
      setLoading(false);
      setIsAuthenticated(false);
    }
  };

  const loadCooldownStatus = async (uid: string) => {
    try {
      // Check server-side cooldown status (source of truth)
      const cooldownData = await checkSpinCooldown(uid);
      
      setCanSpin(cooldownData.canSpin);
      
      if (!cooldownData.canSpin && cooldownData.nextSpinTime) {
        setNextSpinTime(new Date(cooldownData.nextSpinTime));
      } else {
        setNextSpinTime(null);
      }
    } catch (error) {
      console.error('Error loading cooldown status:', error);
      // On error, optimistically allow spinning
      setCanSpin(true);
      setNextSpinTime(null);
    }
  };

  const loadActiveCodes = async (uid: string) => {
    try {
      const codes = await getActiveCodes(uid);
      setActiveCodes(codes);
    } catch (error) {
      console.error('Error loading codes:', error);
    }
  };

  const handleSpin = async () => {
    if (!userId || !isAuthenticated) return;

    setSpinning(true);
    try {
      const result = await spinWheel(userId);

      if (result.error) {
        Alert.alert('Unable to Spin', result.error);
        setSpinning(false);
        
        // Refresh cooldown status from server
        await loadCooldownStatus(userId);
        return;
      }

      // Show result
      Alert.alert(
        '🎉 Congratulations!',
        `You won ${result.reward.label}!${result.reward.code ? `\n\nCode: ${result.reward.code}\nExpires: ${new Date(result.reward.expiresAt).toLocaleDateString()}` : ''}`,
        [{ text: 'OK' }]
      );

      // Refresh data from server
      await Promise.all([
        loadCooldownStatus(userId),
        loadActiveCodes(userId)
      ]);
      
      setSpinning(false);
    } catch (error: any) {
      setSpinning(false);
      
      // Check if it's the cooldown error
      const errorMessage = error?.message || 'Failed to spin the wheel';
      
      if (errorMessage.includes('already spun') || errorMessage.includes('Come back tomorrow')) {
        Alert.alert(
          'Come Back Tomorrow! ⏰',
          'You\'ve already spun the wheel today. Come back in 24 hours for your next chance to win!',
          [{ text: 'OK' }]
        );
        
        // Refresh cooldown status from server
        await loadCooldownStatus(userId);
      } else {
        // Unexpected error
        console.error('Unexpected spinning error:', error);
        Alert.alert('Oops!', 'Something went wrong. Please try again later.');
      }
    }
  };

  const formatTimeRemaining = () => {
    if (!nextSpinTime) return '';

    const now = new Date();
    const diff = nextSpinTime.getTime() - now.getTime();
    
    // If time has passed, allow spinning
    if (diff <= 0) {
      if (!canSpin) {
        setCanSpin(true);
        setNextSpinTime(null);
      }
      return '';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spin the Wheel</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Wheel Section */}
        <View style={styles.wheelSection}>
          <View style={[styles.wheelContainer, !isAuthenticated && styles.wheelContainerDisabled]}>
            <Gift size={80} color={isAuthenticated ? "#f97316" : "#d1d5db"} />
          </View>
          
          <Text style={styles.wheelTitle}>Spin to Win!</Text>
          <Text style={styles.wheelSubtitle}>
            Get a chance to win discounts or coins
          </Text>

          {!isAuthenticated ? (
            // Not logged in - show auth buttons
            <View style={styles.authContainer}>
              <Text style={styles.authPrompt}>Sign in to start winning!</Text>
              <View style={styles.authButtons}>
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={() => router.push('/sign-in')}
                >
                  <LogIn size={20} color="#ffffff" />
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.signUpButton}
                  onPress={() => router.push('/sign-up')}
                >
                  <UserPlus size={20} color="#f97316" />
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : canSpin ? (
            <TouchableOpacity
              style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
              onPress={handleSpin}
              disabled={spinning}
            >
              {spinning ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.spinButtonText}>Spin Now</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.cooldownContainer}>
              <Clock size={20} color="#f97316" />
              <Text style={styles.cooldownText}>
                Next spin in {formatTimeRemaining()}
              </Text>
            </View>
          )}

          <View style={styles.ruleContainer}>
            <Text style={styles.ruleText}>• One spin per 24 hours</Text>
            <Text style={styles.ruleText}>• Rewards expire after 30 days</Text>
            <Text style={styles.ruleText}>• Use discount codes at checkout</Text>
          </View>
        </View>

        {/* Active Codes Section */}
        {isAuthenticated && (
          <View style={styles.codesSection}>
            <Text style={styles.sectionTitle}>Your Active Codes</Text>
            
            {activeCodes.length === 0 ? (
              <View style={styles.emptyState}>
                <Gift size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No active codes yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Spin the wheel to win discount codes!
                </Text>
              </View>
            ) : (
              activeCodes.map((code) => (
                <View key={code.id} style={styles.codeCard}>
                  <View style={styles.codeHeader}>
                    <View style={styles.codeAmount}>
                      <Text style={styles.codeAmountText}>₹{code.discount_amount}</Text>
                      <Text style={styles.codeAmountLabel}>OFF</Text>
                    </View>
                    <View style={styles.codeDetails}>
                      <Text style={styles.codeText}>{code.code}</Text>
                      <View style={styles.businessInfo}>
                        <Store size={14} color="#6b7280" />
                        <Text style={styles.businessName}>{code.business_name}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.codeFooter}>
                    <Clock size={14} color="#9ca3af" />
                    <Text style={styles.expiryText}>
                      Expires {new Date(code.expires_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
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
    backgroundColor: '#f9fafb',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  wheelSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    marginBottom: 24,
  },
  wheelContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 8,
    borderColor: '#fbbf24',
  },
  wheelContainerDisabled: {
    borderColor: '#e5e7eb',
    opacity: 0.6,
  },
  wheelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  wheelSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  authContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  authPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  authButtons: {
    flexDirection: 'row',
    columnGap: 12,
    width: '100%',
  },
  signInButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f97316',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  signInButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  signUpButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    borderWidth: 2,
    borderColor: '#f97316',
  },
  signUpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f97316',
  },
  spinButton: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
  },
  spinButtonDisabled: {
    opacity: 0.6,
  },
  spinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    columnGap: 8,
    marginBottom: 16,
  },
  cooldownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  ruleContainer: {
    alignItems: 'center',
  },
  ruleText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  codesSection: {
    marginBottom: 32,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  codeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeAmount: {
    backgroundColor: '#f97316',
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  codeAmountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  codeAmountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  codeDetails: {
    flex: 1,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  businessName: {
    fontSize: 14,
    color: '#6b7280',
  },
  codeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  expiryText: {
    fontSize: 13,
    color: '#9ca3af',
  },
});
