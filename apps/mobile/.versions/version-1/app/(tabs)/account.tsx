import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/lib/store';
import { Bell, Package, Store, ShoppingBag, Users, LogOut, ChevronRight, User, FileText, Shield, RefreshCw, Truck } from 'lucide-react-native';
import { fetchUserBusinesses } from '@/lib/api';

export default function AccountScreen() {
  const router = useRouter();
  const { user, isLoggedIn, logout } = useUserStore();
  const [businessCount, setBusinessCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadBusinessCount();
    }
  }, [user?.id]);

  const loadBusinessCount = async () => {
    try {
      if (!user?.id) return;
      const businesses = await fetchUserBusinesses(user.id);
      setBusinessCount(businesses.length);
    } catch (error) {
      console.error('Error loading business count:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            setBusinessCount(0);
          },
        },
      ]
    );
  };

  const renderMenuItem = (
    icon: React.ReactNode,
    label: string,
    onPress: () => void,
    badge?: number
  ) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.menuItemText}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <ChevronRight size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  if (!isLoggedIn || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Account</Text>
          </View>

          {/* Sign In / Sign Up Section */}
          <View style={styles.authSection}>
            <View style={styles.authIconContainer}>
              <User size={48} color="#FF6B35" />
            </View>
            <Text style={styles.authTitle}>Welcome!</Text>
            <Text style={styles.authSubtitle}>Sign in to access your account</Text>
            
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push('/sign-in')}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={() => router.push('/sign-up')}
            >
              <Text style={styles.signUpButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions - Available without login */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            {renderMenuItem(
              <Bell size={22} color="#FF6B35" />,
              'Notifications',
              () => router.push('/notifications')
            )}
            {renderMenuItem(
              <Package size={22} color="#FF6B35" />,
              'Track Order',
              () => router.push('/track-order')
            )}
          </View>

          {/* Legal & Policies */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal & Policies</Text>
            {renderMenuItem(
              <FileText size={22} color="#FF6B35" />,
              'Terms & Conditions',
              () => router.push('/terms')
            )}
            {renderMenuItem(
              <Shield size={22} color="#FF6B35" />,
              'Privacy Policy',
              () => router.push('/privacy')
            )}
            {renderMenuItem(
              <RefreshCw size={22} color="#FF6B35" />,
              'Refund & Cancellation',
              () => router.push('/refund-policy')
            )}
            {renderMenuItem(
              <Truck size={22} color="#FF6B35" />,
              'Shipping & Delivery',
              () => router.push('/shipping-policy')
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {renderMenuItem(
            <Bell size={22} color="#FF6B35" />,
            'Notifications',
            () => router.push('/notifications')
          )}
          {renderMenuItem(
            <Package size={22} color="#FF6B35" />,
            'Track Order',
            () => router.push('/track-order')
          )}
        </View>

        {/* Business Management - Only for logged in users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business</Text>
          
          {businessCount === 0 ? (
            renderMenuItem(
              <Store size={22} color="#FF6B35" />,
              'Create Business',
              () => router.push('/create-business')
            )
          ) : (
            <>
              {renderMenuItem(
                <Store size={22} color="#FF6B35" />,
                'Manage Businesses',
                () => router.push('/business-dashboard'),
                businessCount
              )}
              {renderMenuItem(
                <ShoppingBag size={22} color="#FF6B35" />,
                'Add Products',
                () => router.push('/business-dashboard')
              )}
              {renderMenuItem(
                <Users size={22} color="#FF6B35" />,
                'Customer List',
                () => router.push('/business-dashboard')
              )}
            </>
          )}
        </View>

        {/* Legal & Policies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Policies</Text>
          {renderMenuItem(
            <FileText size={22} color="#FF6B35" />,
            'Terms & Conditions',
            () => router.push('/terms')
          )}
          {renderMenuItem(
            <Shield size={22} color="#FF6B35" />,
            'Privacy Policy',
            () => router.push('/privacy')
          )}
          {renderMenuItem(
            <RefreshCw size={22} color="#FF6B35" />,
            'Refund & Cancellation',
            () => router.push('/refund-policy')
          )}
          {renderMenuItem(
            <Truck size={22} color="#FF6B35" />,
            'Shipping & Delivery',
            () => router.push('/shipping-policy')
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#FF6B35" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

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
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  authSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  authIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  signInButton: {
    width: '100%',
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    width: '100%',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  signUpButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F3',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 8,
  },
});
