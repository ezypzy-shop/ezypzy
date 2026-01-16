import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Package, CheckCircle, Clock, Store, ShoppingBag, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, fetchUserBusinesses } from '@/lib/api';

type Notification = {
  id: number;
  user_id: number;
  business_id?: number;
  order_id?: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [businessIds, setBusinessIds] = useState<number[]>([]);

  useEffect(() => {
    loadUserAndNotifications();
  }, []);

  const loadUserAndNotifications = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUserId(userData.id);
        
        // Get business IDs if business user
        if (userData.is_business_user) {
          const businesses = await fetchUserBusinesses(userData.id);
          if (businesses && businesses.length > 0) {
            setBusinessIds(businesses.map((b: any) => b.id));
          }
        }
        
        await loadNotifications(userData.id, userData.is_business_user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async (uid: number, isBusinessUser: boolean) => {
    try {
      // Fetch user notifications
      const userNotifs = await fetchNotifications(uid);
      
      // If business user, also fetch business notifications
      let allNotifs = [...(userNotifs || [])];
      
      if (isBusinessUser) {
        const businesses = await fetchUserBusinesses(uid);
        for (const business of businesses) {
          const businessNotifs = await fetchNotifications(undefined, business.id);
          allNotifs = [...allNotifs, ...(businessNotifs || [])];
        }
      }
      
      // Sort by date and remove duplicates
      const uniqueNotifs = allNotifs.reduce((acc: Notification[], notif) => {
        if (!acc.find(n => n.id === notif.id)) {
          acc.push(notif);
        }
        return acc;
      }, []);
      
      uniqueNotifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setNotifications(uniqueNotifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userId) {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        await loadNotifications(userId, userData.is_business_user);
      }
    }
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // Navigate to order if applicable
    if (notification.order_id) {
      router.push({ pathname: '/track-order', params: { orderId: notification.order_id.toString() } });
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    
    try {
      await markAllNotificationsRead(userId);
      for (const businessId of businessIds) {
        await markAllNotificationsRead(undefined, businessId);
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order': return ShoppingBag;
      case 'order_status': return Package;
      case 'order_ready': return CheckCircle;
      case 'order_delivered': return Store;
      default: return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'new_order': return '#22c55e';
      case 'order_status': return '#f97316';
      case 'order_ready': return '#3b82f6';
      case 'order_delivered': return '#10b981';
      default: return '#6b7280';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
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
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 80 }} />}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#f97316']} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>You'll see order updates and alerts here</Text>
          </View>
        ) : (
          <>
            {unreadCount > 0 && (
              <Text style={styles.sectionTitle}>{unreadCount} New</Text>
            )}
            {notifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              const iconColor = getIconColor(notification.type);
              
              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.is_read && styles.notificationCardUnread,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                    <IconComponent size={20} color={iconColor} />
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>{formatTime(notification.created_at)}</Text>
                  </View>
                  {!notification.is_read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })}
          </>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
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
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    color: '#f97316',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  notificationCardUnread: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
