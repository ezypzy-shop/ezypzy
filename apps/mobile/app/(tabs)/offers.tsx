import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Tag, Calendar, Store, Gift } from 'lucide-react-native';
import { fetchAds } from '@/lib/api';

interface Ad {
  id: string;
  business_id: string;
  business_name: string;
  title: string;
  description: string;
  image_url: string | null;
  start_date: string;
  end_date: string;
  view_count: number;
  click_count: number;
  is_active: boolean;
}

export default function OffersScreen() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAds = async () => {
    try {
      const data = await fetchAds();
      console.log('Ads loaded:', data);
      // Filter for active ads only
      const activeAds = data.filter((ad: Ad) => ad.is_active);
      setAds(activeAds);
    } catch (error) {
      console.error('Error loading ads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAds();
  }, []);

  const handleAdPress = (ad: Ad) => {
    router.push(`/ad-products/${ad.id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Offers & Deals</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offers & Deals</Text>
        <Text style={styles.headerSubtitle}>{ads.length} active offers</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
        }
      >
        {/* Spin Wheel Promo Card */}
        <View style={styles.spinWheelContainer}>
          <TouchableOpacity
            style={styles.spinWheelCard}
            onPress={() => router.push('/spin-wheel')}
          >
            <View style={styles.spinWheelIcon}>
              <Gift size={32} color="#FFF" />
            </View>
            <View style={styles.spinWheelContent}>
              <Text style={styles.spinWheelTitle}>Spin & Win!</Text>
              <Text style={styles.spinWheelText}>
                Try your luck for exclusive discounts
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {ads.length === 0 ? (
          <View style={styles.emptyState}>
            <Tag size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Active Offers</Text>
            <Text style={styles.emptyStateText}>Check back soon for exciting deals!</Text>
          </View>
        ) : (
          <View style={styles.offersContainer}>
            {ads.map((ad) => (
              <TouchableOpacity
                key={ad.id}
                style={styles.offerCard}
                onPress={() => handleAdPress(ad)}
              >
                <Image
                  source={{ uri: ad.image_url || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800' }}
                  style={styles.offerImage}
                  resizeMode="cover"
                />
                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle} numberOfLines={1}>
                    {ad.title}
                  </Text>
                  {ad.description && (
                    <Text style={styles.offerDescription} numberOfLines={2}>
                      {ad.description}
                    </Text>
                  )}
                  <View style={styles.offerMetaRow}>
                    <View style={styles.businessBadge}>
                      <Store size={12} color="#F97316" />
                      <Text style={styles.businessName} numberOfLines={1}>
                        {ad.business_name}
                      </Text>
                    </View>
                    <View style={styles.expiryContainer}>
                      <Calendar size={12} color="#6B7280" />
                      <Text style={styles.expiryText}>
                        Ends {formatDate(ad.end_date)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
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
    padding: 24,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinWheelContainer: {
    padding: 24,
    paddingBottom: 8,
  },
  spinWheelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
  },
  spinWheelIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  spinWheelContent: {
    flex: 1,
  },
  spinWheelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  spinWheelText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  offersContainer: {
    padding: 24,
    columnGap: 16,
  },
  offerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  offerImage: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  offerInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  offerDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  offerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flex: 1,
  },
  businessName: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
    flex: 1,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  expiryText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
