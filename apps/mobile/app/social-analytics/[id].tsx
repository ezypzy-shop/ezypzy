import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Eye, DollarSign, TrendingUp, Award, Instagram, MessageCircle } from 'lucide-react-native';
import { fetchSocialAnalytics } from '@/lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SocialAnalyticsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await fetchSocialAnalytics(Number(id));
      setAnalytics(data);
    } catch (error) {
      console.error('[Social Analytics] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Social Impact</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Social Impact</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Failed to load analytics</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const { weeklyStats, topSharedProduct, platformBreakdown, dailyShares } = analytics;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Social Impact</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Time Period */}
          <View style={styles.periodBanner}>
            <TrendingUp size={20} color="#f97316" />
            <Text style={styles.periodText}>Last 7 Days Performance</Text>
          </View>

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: '#eff6ff' }]}>
              <View style={styles.metricIcon}>
                <Share2 size={24} color="#3b82f6" />
              </View>
              <Text style={styles.metricValue}>{weeklyStats.shares}</Text>
              <Text style={styles.metricLabel}>Product Shares</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#f0fdf4' }]}>
              <View style={styles.metricIcon}>
                <Eye size={24} color="#22c55e" />
              </View>
              <Text style={styles.metricValue}>{weeklyStats.views}</Text>
              <Text style={styles.metricLabel}>Views from Shares</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#fef3c7' }]}>
              <View style={styles.metricIcon}>
                <DollarSign size={24} color="#f59e0b" />
              </View>
              <Text style={styles.metricValue}>₹{weeklyStats.sales.toFixed(0)}</Text>
              <Text style={styles.metricLabel}>Sales from Shares</Text>
            </View>
          </View>

          {/* Most Shared Product */}
          {topSharedProduct && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Award size={20} color="#f97316" />
                <Text style={styles.sectionTitle}>Most Shared Product</Text>
              </View>

              <View style={styles.topProductCard}>
                {topSharedProduct.image && (
                  <Image 
                    source={{ uri: topSharedProduct.image }} 
                    style={styles.productImage}
                  />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{topSharedProduct.name}</Text>
                  <View style={styles.productStats}>
                    <View style={styles.productStat}>
                      <Share2 size={16} color="#3b82f6" />
                      <Text style={styles.productStatValue}>{topSharedProduct.share_count}</Text>
                      <Text style={styles.productStatLabel}>shares</Text>
                    </View>
                    <View style={styles.productStat}>
                      <DollarSign size={16} color="#22c55e" />
                      <Text style={styles.productStatValue}>{topSharedProduct.sales_count}</Text>
                      <Text style={styles.productStatLabel}>sales</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Platform Breakdown */}
          {platformBreakdown && platformBreakdown.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Share2 size={20} color="#f97316" />
                <Text style={styles.sectionTitle}>Share Platforms</Text>
              </View>
              <Text style={styles.sectionDescription}>
                Which platforms drive most shares
              </Text>

              {platformBreakdown.map((platform: any, index: number) => {
                const total = platformBreakdown.reduce((sum: number, p: any) => sum + parseInt(p.count || '0'), 0);
                const percentage = total > 0 ? (parseInt(platform.count || '0') / total) * 100 : 0;
                
                return (
                  <View key={index} style={styles.platformRow}>
                    <View style={styles.platformIcon}>
                      {platform.platform === 'whatsapp' && <MessageCircle size={18} color="#25D366" />}
                      {platform.platform === 'instagram' && <Instagram size={18} color="#E1306C" />}
                      {!['whatsapp', 'instagram'].includes(platform.platform) && <Share2 size={18} color="#6b7280" />}
                    </View>
                    <View style={styles.platformInfo}>
                      <View style={styles.platformHeader}>
                        <Text style={styles.platformName}>
                          {platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1)}
                        </Text>
                        <Text style={styles.platformCount}>{platform.count || 0} shares</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${percentage}%`,
                              backgroundColor: platform.platform === 'whatsapp' ? '#25D366' : 
                                             platform.platform === 'instagram' ? '#E1306C' : '#3b82f6'
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Daily Shares Graph */}
          {dailyShares && dailyShares.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color="#f97316" />
                <Text style={styles.sectionTitle}>Daily Shares Trend</Text>
              </View>

              <View style={styles.chartContainer}>
                {dailyShares.map((day: any, index: number) => {
                  const maxShares = Math.max(...dailyShares.map((d: any) => parseInt(d.shares || '0')));
                  const height = maxShares > 0 ? (parseInt(day.shares || '0') / maxShares) * 100 : 0;
                  const date = new Date(day.date);
                  const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

                  return (
                    <View key={index} style={styles.chartBar}>
                      <View style={styles.barContainer}>
                        <View 
                          style={[
                            styles.bar, 
                            { 
                              height: `${Math.max(height, 5)}%`,
                              backgroundColor: height > 70 ? '#22c55e' : 
                                              height > 40 ? '#f59e0b' : '#3b82f6'
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.barValue}>{day.shares || 0}</Text>
                      <Text style={styles.barLabel}>{dayLabel}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Tips to Boost Social Performance</Text>
            <View style={styles.tip}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Encourage customers to share products with friends</Text>
            </View>
            <View style={styles.tip}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Create shareable content with attractive product images</Text>
            </View>
            <View style={styles.tip}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Run social media campaigns with special offers</Text>
            </View>
            <View style={styles.tip}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={styles.tipText}>Respond quickly to inquiries from shared links</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
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
    paddingVertical: 16,
    backgroundColor: '#f97316',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  periodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    padding: 12,
    backgroundColor: '#fff7ed',
    marginBottom: 16,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    columnGap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 56) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  topProductCard: {
    flexDirection: 'row',
    columnGap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  productStats: {
    flexDirection: 'row',
    columnGap: 16,
  },
  productStat: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  productStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  productStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 16,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformInfo: {
    flex: 1,
  },
  platformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  platformCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    paddingTop: 16,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    columnGap: 4,
  },
  barContainer: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 8,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  barLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  tipsSection: {
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  tip: {
    flexDirection: 'row',
    columnGap: 8,
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '700',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
