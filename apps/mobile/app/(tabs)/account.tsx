import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  User, 
  MapPin, 
  Bell, 
  Heart, 
  FileText, 
  Lock,
  LogOut,
  ChevronRight,
  ShoppingBag,
  Briefcase,
  Package,
  Gift,
  Copy,
  Share2,
  Users,
} from 'lucide-react-native';
import { useUserStore, startNotificationPolling, stopNotificationPolling } from '@/lib/store';
import { fetchReferrals, createReferralCode } from '@/lib/api';
import * as Clipboard from 'expo-clipboard';

export default function AccountScreen() {
  const router = useRouter();
  const { user, isLoggedIn, loadUser, logout, unreadNotificationCount, loadNotificationCount } = useUserStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      loadReferralData();
      loadNotificationCount();
      startNotificationPolling();
    } else {
      stopNotificationPolling();
    }

    return () => {
      stopNotificationPolling();
    };
  }, [isLoggedIn, user]);

  // Refresh notification count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn && user?.id) {
        loadNotificationCount();
      }
    }, [isLoggedIn, user])
  );

  const loadReferralData = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingReferral(true);
      const data = await fetchReferrals(user.id);
      
      // If no referral code exists, create one
      if (!data.referralCode) {
        const newCode = await createReferralCode(user.id);
        setReferralData(newCode);
      } else {
        setReferralData(data);
      }
    } catch (error) {
      console.error('[Account] Error loading referral data:', error);
    } finally {
      setLoadingReferral(false);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!referralData?.referralCode) return;
    
    await Clipboard.setStringAsync(referralData.referralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const handleShareReferral = async () => {
    if (!referralData?.referralCode) return;
    
    try {
      const message = `Join me on EzyPzy and get 10% off your first order!\n\nUse my referral code: ${referralData.referralCode}\n\nDownload the app now!`;
      
      await Share.share({
        message,
        title: 'Join EzyPzy',
      });
    } catch (error) {
      console.error('[Account] Error sharing referral:', error);
    }
  };

  const handleLogout = async () => {
    console.log('🔵 [Account] Logout button clicked!');
    
    // On web, use browser confirm; on native, skip confirmation for now
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (!confirmed) {
        console.log('🟡 [Account] Logout cancelled');
        return;
      }
    }

    try {
      setLoggingOut(true);
      console.log('🔴 [Account] Starting logout...');
      
      // Call logout from store
      await logout();
      console.log('✅ [Account] Logout complete, navigating to sign-in...');
      
      // Navigate immediately
      router.replace('/sign-in');
      setLoggingOut(false);
    } catch (error) {
      console.error('❌ [Account] Logout error:', error);
      setLoggingOut(false);
      if (Platform.OS === 'web') {
        window.alert('Failed to sign out. Please try again.');
      }
    }
  };

  const MenuItem = ({ 
    icon: Icon, 
    title, 
    onPress, 
    showChevron = true,
    badge,
  }: { 
    icon: any; 
    title: string; 
    onPress: () => void;
    showChevron?: boolean;
    badge?: number;
  }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={() => {
        console.log(`📱 [Account] Menu item clicked: ${title}`);
        onPress();
      }}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>
          <Icon size={20} color="#f97316" />
          {badge !== undefined && badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      {showChevron && <ChevronRight size={20} color="#9ca3af" />}
    </TouchableOpacity>
  );

  // Show loading state during logout
  if (loggingOut) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Signing out...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        <View style={styles.guestContainer}>
          <View style={styles.guestIconContainer}>
            <User size={48} color="#9ca3af" />
          </View>
          <Text style={styles.guestTitle}>Welcome to EzyPzy!</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to access your profile, orders, and saved items
          </Text>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/sign-in')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push('/sign-up')}
          >
            <Text style={styles.createAccountButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.guestMenu}>
          <MenuItem
            icon={FileText}
            title="Terms & Conditions"
            onPress={() => router.push('/terms')}
          />
          <MenuItem
            icon={Lock}
            title="Privacy Policy"
            onPress={() => router.push('/privacy')}
          />
          <MenuItem
            icon={FileText}
            title="Shipping Policy"
            onPress={() => router.push('/shipping-policy')}
          />
          <MenuItem
            icon={FileText}
            title="Refund Policy"
            onPress={() => router.push('/refund-policy')}
          />
        </View>
      </SafeAreaView>
    );
  }

  // For business users, show business-focused menu
  if (user?.is_business_user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Business Account</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Briefcase size={32} color="#f97316" />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={styles.businessBadge}>
                <Briefcase size={14} color="#f97316" />
                <Text style={styles.businessBadgeText}>Business Account</Text>
              </View>
            </View>
          </View>

          {/* Referral Program */}
          {referralData && (
            <View style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <Gift size={24} color="#f97316" />
                <Text style={styles.referralTitle}>Invite & Earn</Text>
              </View>
              
              <View style={styles.referralCodeContainer}>
                <View style={styles.referralCodeBox}>
                  <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
                  <Text style={styles.referralCode}>{referralData.referralCode}</Text>
                </View>
                <View style={styles.referralActions}>
                  <TouchableOpacity 
                    style={styles.referralActionButton}
                    onPress={handleCopyReferralCode}
                  >
                    <Copy size={18} color="#f97316" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.referralActionButton}
                    onPress={handleShareReferral}
                  >
                    <Share2 size={18} color="#f97316" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.referralStats}>
                <View style={styles.referralStat}>
                  <Users size={20} color="#f97316" />
                  <Text style={styles.referralStatValue}>
                    {referralData.rewards?.total_referrals || 0}
                  </Text>
                  <Text style={styles.referralStatLabel}>Friends Invited</Text>
                </View>
                <View style={styles.referralStatDivider} />
                <View style={styles.referralStat}>
                  <Gift size={20} color="#f97316" />
                  <Text style={styles.referralStatValue}>
                    ₹{(referralData.rewards?.total_earned || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.referralStatLabel}>Rewards Earned</Text>
                </View>
              </View>

              <Text style={styles.referralInfo}>
                • Share your code with friends{'\n'}
                • They get 10% off first order{'\n'}
                • You earn ₹25 per friend
              </Text>
            </View>
          )}

          {/* My Account Section */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>My Account</Text>
            <View style={styles.menu}>
              <MenuItem
                icon={ShoppingBag}
                title="My Orders"
                onPress={() => router.push('/(tabs)/orders')}
              />
            </View>
          </View>

          {/* Business Management */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Business Management</Text>
            <View style={styles.menu}>
              <MenuItem
                icon={Briefcase}
                title="Business Dashboard"
                onPress={() => router.push('/business-dashboard')}
              />
            </View>
          </View>

          {/* Account Settings */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.menu}>
              <MenuItem
                icon={User}
                title="Edit Profile"
                onPress={() => router.push('/edit-profile')}
              />
              <MenuItem
                icon={Bell}
                title="Notifications"
                onPress={() => router.push('/notifications')}
                badge={unreadNotificationCount}
              />
            </View>
          </View>

          {/* Legal */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Legal</Text>
            <View style={styles.menu}>
              <MenuItem
                icon={FileText}
                title="Terms & Conditions"
                onPress={() => router.push('/terms')}
              />
              <MenuItem
                icon={Lock}
                title="Privacy Policy"
                onPress={() => router.push('/privacy')}
              />
            </View>
          </View>

          {/* Logout */}
          <View style={styles.menuSection}>
            <View style={styles.menu}>
              <MenuItem
                icon={LogOut}
                title="Logout"
                onPress={handleLogout}
                showChevron={false}
              />
            </View>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // For regular customers
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={32} color="#f97316" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
        </View>

        {/* Referral Program */}
        {referralData && (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <Gift size={24} color="#f97316" />
              <Text style={styles.referralTitle}>Invite Friends, Earn Rewards</Text>
            </View>
            
            <View style={styles.referralCodeContainer}>
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
                <Text style={styles.referralCode}>{referralData.referralCode}</Text>
              </View>
              <View style={styles.referralActions}>
                <TouchableOpacity 
                  style={styles.referralActionButton}
                  onPress={handleCopyReferralCode}
                >
                  <Copy size={18} color="#f97316" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.referralActionButton}
                  onPress={handleShareReferral}
                >
                  <Share2 size={18} color="#f97316" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.referralStats}>
              <View style={styles.referralStat}>
                <Users size={20} color="#f97316" />
                <Text style={styles.referralStatValue}>
                  {referralData.rewards?.total_referrals || 0}
                </Text>
                <Text style={styles.referralStatLabel}>Friends Invited</Text>
              </View>
              <View style={styles.referralStatDivider} />
              <View style={styles.referralStat}>
                <Gift size={20} color="#f97316" />
                <Text style={styles.referralStatValue}>
                  ₹{(referralData.rewards?.total_earned || 0).toFixed(2)}
                </Text>
                <Text style={styles.referralStatLabel}>Rewards Earned</Text>
              </View>
            </View>

            <Text style={styles.referralInfo}>
              • Share your code with friends{'\n'}
              • They get 10% off first order{'\n'}
              • You earn ₹25 per friend
            </Text>
          </View>
        )}

        {/* Account Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>My Account</Text>
          <View style={styles.menu}>
            <MenuItem
              icon={ShoppingBag}
              title="My Orders"
              onPress={() => router.push('/(tabs)/orders')}
            />
            <MenuItem
              icon={MapPin}
              title="Addresses"
              onPress={() => router.push('/addresses')}
            />
            <MenuItem
              icon={Heart}
              title="Saved Items"
              onPress={() => router.push('/saved')}
            />
            <MenuItem
              icon={Bell}
              title="Notifications"
              onPress={() => router.push('/notifications')}
              badge={unreadNotificationCount}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menu}>
            <MenuItem
              icon={User}
              title="Edit Profile"
              onPress={() => router.push('/edit-profile')}
            />
          </View>
        </View>

        {/* Legal */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.menu}>
            <MenuItem
              icon={FileText}
              title="Terms & Conditions"
              onPress={() => router.push('/terms')}
            />
            <MenuItem
              icon={Lock}
              title="Privacy Policy"
              onPress={() => router.push('/privacy')}
            />
            <MenuItem
              icon={FileText}
              title="Shipping Policy"
              onPress={() => router.push('/shipping-policy')}
            />
            <MenuItem
              icon={FileText}
              title="Refund Policy"
              onPress={() => router.push('/refund-policy')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.menuSection}>
          <View style={styles.menu}>
            <MenuItem
              icon={LogOut}
              title="Logout"
              onPress={handleLogout}
              showChevron={false}
            />
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  guestIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  signInButton: {
    width: '100%',
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  createAccountButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f97316',
    marginBottom: 40,
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f97316',
  },
  guestMenu: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    columnGap: 4,
  },
  businessBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f97316',
  },
  referralCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#fff7ed',
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    columnGap: 12,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  referralCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  referralCodeBox: {
    flex: 1,
  },
  referralCodeLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
    fontWeight: '500',
  },
  referralCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f97316',
    letterSpacing: 1,
  },
  referralActions: {
    flexDirection: 'row',
    columnGap: 8,
  },
  referralActionButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  referralStat: {
    flex: 1,
    alignItems: 'center',
    columnGap: 8,
  },
  referralStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  referralStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  referralStatDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e5e7eb',
  },
  referralInfo: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  menuSection: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menu: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#f9fafb',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
});
