import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { api, DashboardStats, Notification, MandiPrice } from '../lib/apiClient';
import { useDashboard } from '../hooks/useApiQueries';
import { withErrorBoundary } from '../components/ErrorBoundary';
import { Colors, Spacing, BorderRadius, Typography, FontFamily, Shadows } from '../constants/theme';
import {
  GlassCard,
  GlassButton,
  GlassBadge,
  GlassSkeleton,
  GlassSkeletonCard,
  useReducedMotion,
  MotionTokens,
  FadeIn,
  ScaleIn,
} from '../components/GlassPrimitives';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { CategorizedFAQ, type FAQCategory } from '../components/AccordionMenu';
import TextEffect from '../components/TextEffect';
import TextLoop from '../components/TextLoop';
import Clock from '../components/Clock';
import CropCardGrid from '../components/CropCardGrid';
import FarmInsightsCarousel from '../components/FarmInsightsCarousel';
import ActionAlert from '../components/ActionAlert';
import VoiceAssistantModal from '../components/VoiceAssistantModal';
import FloatingVoiceButton from '../components/FloatingVoiceButton';
import { CalendarWidget } from '../components/CalendarWidget';
import { FloatingDisclosure } from '../components/FloatingDisclosure';
import { FARMER_AVATAR } from '../constants/farmer';

import { getWeatherByCoords, getWeatherAlerts, getFaq } from '../services/api';

interface WeatherData { temp: number; humidity: number; description: string; location_name: string }
interface WeatherAlert { severity: string; title: string; recommended_action: string }

function getLocalizedFaqCategories(t: (k: string, fb?: string) => string): FAQCategory[] {
  return [
    {
      id: 'crops',
      label: t('nav_crops', 'Crops'),
      icon: 'eco',
      items: [
        {
          question: t('faq_q1', 'How do I add and track a new crop?'),
          answer: t('faq_a1', 'Open Crops, tap Add Crop, then enter the crop, variety, sowing date, farm area, and field location. Annapurna will begin tracking the batch after you save it.'),
        },
        {
          question: t('faq_q2', 'Where do crop recommendations come from?'),
          answer: t('faq_a2', 'Recommendations combine your crop details with weather, market, satellite, and spoilage-risk signals. Each recommendation includes its reasoning so you can review it before acting.'),
        },
        {
          question: t('faq_q3', 'Can I use the app when connectivity is poor?'),
          answer: t('faq_a3', 'Yes. Supported actions are queued securely on your device and synchronized when a connection becomes available.'),
        },
      ],
    },
    {
      id: 'market',
      label: t('nav_market', 'Market'),
      icon: 'storefront',
      items: [
        {
          question: t('faq_q4', 'How are mandi prices selected?'),
          answer: t('faq_a4', 'Market prices are matched to your crop and nearby markets. Smart Move also considers distance, transport cost, expected profit, and remaining shelf life.'),
        },
        {
          question: t('faq_q5', 'What does Smart Move compare?'),
          answer: t('faq_a5', 'It compares choices such as selling locally, storing, processing, or transporting to another market and highlights the option with the strongest risk-adjusted outcome.'),
        },
        {
          question: t('faq_q6', 'Can I view the route to a recommended market?'),
          answer: t('faq_a6', 'Yes. Choose a scenario with a destination and tap View Route to see the route and market details.'),
        },
      ],
    },
  ];
}

function HomeScreen({ navigation }: any) {
  const { t, language } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>({
    temp: 22,
    humidity: 75,
    description: 'Overcast Clouds',
    location_name: 'Madanapalle, AP',
  });
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState('Madanapalle, AP');
  const [isLoading, setIsLoading] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [username, setUsername] = useState('Farmer');
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [faqCategories, setFaqCategories] = useState<FAQCategory[]>(() => getLocalizedFaqCategories(t));

  useEffect(() => {
    setFaqCategories(getLocalizedFaqCategories(t));
  }, [language]);

  const [activityItems, setActivityItems] = useState<Array<{
    id?: string;
    icon: string;
    text: string;
    color: string;
    onPress: () => void;
  }>>([
    {
      id: 'init-scan-ready',
      icon: 'camera-iris',
      text: t('act_scan_ready', '5-sample quality scan ready · Assess field health'),
      color: Colors.primary,
      onPress: () => navigation?.navigate('Scan'),
    },
    {
      id: 'init-mandi-update',
      icon: 'trending-up',
      text: t('act_mandi_update', 'Mandi price updates received for Madanapalle & AP'),
      color: Colors.secondary,
      onPress: () => navigation?.navigate('Market'),
    },
    {
      id: 'init-smart-move',
      icon: 'shield-check',
      text: t('act_smart_move', 'Smart Move recommendations active for your crops'),
      color: Colors.warning,
      onPress: () => navigation?.navigate('SmartMove'),
    },
  ]);
  const reducedMotion = useReducedMotion();

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();

  const fetchData = useCallback(async () => {
    try {
      setLoadingWeather(true);
      
      const storedName = await AsyncStorage.getItem('username');
      if (storedName) setUsername(storedName);

      let lat = 13.5560;
      let lng = 78.5010;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = location.coords.latitude;
          lng = location.coords.longitude;
          const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          if (geocode.length > 0) {
            const place = geocode[0];
            const loc = `${place.city || place.district || place.subregion || 'Madanapalle'}, ${place.region || 'AP'}`;
            setLocationName(loc);
          }
        }
      } catch (e) {
        console.warn('Location resolution warning:', e);
      }

      // Execute all major dashboard API requests concurrently in parallel
      const [weatherResult, alertsResult, dashResult, faqResult] = await Promise.allSettled([
        getWeatherByCoords(lat, lng),
        getWeatherAlerts(lat, lng, 'Tomato'),
        refetchDashboard(),
        getFaq(),
      ]);

      // 1. Process Weather
      if (weatherResult.status === 'fulfilled' && weatherResult.value) {
        const weatherData = weatherResult.value;
        setWeather({
          temp: weatherData.temp,
          humidity: weatherData.humidity,
          description: weatherData.description || 'Clear',
          location_name: weatherData.location_name && weatherData.location_name !== 'Unknown' ? weatherData.location_name : locationName,
        });
      }

      // 2. Process Alerts
      if (alertsResult.status === 'fulfilled' && alertsResult.value?.alerts) {
        setWeatherAlerts(alertsResult.value.alerts.map((a: any) => ({
          severity: a.severity,
          title: a.title,
          recommended_action: a.recommended_action || a.description,
        })));
      }

      // 3. Process Dashboard stats
      const currentDash = (dashResult.status === 'fulfilled' && dashResult.value?.data) ? dashResult.value.data : dashboard;

      // 4. Populate dynamic Recent Activities
      const activities: Array<{ id: string; icon: string; text: string; color: string; onPress: () => void }> = [];
      if (currentDash?.recent_batches && currentDash.recent_batches.length > 0) {
        currentDash.recent_batches.slice(0, 3).forEach((b, index) => {
          activities.push({
            id: `batch-${b.batch_id}-${index}`,
            icon: 'sprout',
            text: `Batch ${b.batch_id} tracked · ${b.initial_weight_kg}kg (${b.detected_ripeness_stage || 'Optimal'})`,
            color: Colors.primary,
            onPress: () => navigation?.navigate('CropDetails', { batchId: b.batch_id }),
          });
        });
      }

      if (activities.length === 0) {
        activities.push(
          {
            id: 'activity-scan-ready',
            icon: 'camera-iris',
            text: '5-sample quality scan ready · Assess field health',
            color: Colors.primary,
            onPress: () => navigation?.navigate('Scan'),
          },
          {
            id: 'activity-mandi-update',
            icon: 'trending-up',
            text: 'Mandi price updates received for Nashik & Maharashtra',
            color: Colors.secondary,
            onPress: () => navigation?.navigate('Market'),
          },
          {
            id: 'activity-smart-move',
            icon: 'shield-check',
            text: 'Smart Move recommendations active for your crops',
            color: Colors.warning,
            onPress: () => navigation?.navigate('SmartMove'),
          }
        );
      }
      setActivityItems(activities);

      // 5. Process FAQs
      if (faqResult.status === 'fulfilled' && faqResult.value) {
        const faqRes = faqResult.value;
        if (Array.isArray(faqRes.categories) && faqRes.categories.length > 0) {
          setFaqCategories(faqRes.categories.map((c: any) => ({
            id: c.category.toLowerCase().replace(/\s+/g, '-'),
            title: c.category,
            icon: c.icon || '🌾',
            faqs: Array.isArray(c.faqs) ? c.faqs.map((f: any, idx: number) => ({
              id: `${c.category}-${idx}`,
              question: f.question,
              answer: f.answer,
            })) : [],
          })));
        }
      }

    } catch (err) {
      console.warn('HomeScreen data fetch warning:', err);
    } finally {
      setLoadingWeather(false);
      setRefreshing(false);
      setIsLoading(false);
    }
  }, [navigation, refetchDashboard, dashboard, locationName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    hapticMedium();
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const displayTemp = weather ? `${Math.round(weather.temp)}°C` : '28°C';
  const displayCondition = weather ? weather.description : 'Sunny';

  const actionCards = [
    {
      label: t('action_add_crop', 'Add Crop'),
      icon: 'add',
      bgTint: '#E8F5E9',
      iconColor: '#1B7A3D',
      screen: 'AddCrop',
      haptic: 'medium' as const,
    },
    {
      label: t('action_scan_crop', 'Scan Crop'),
      icon: 'photo-camera',
      bgTint: '#E0F2FE',
      iconColor: '#0284C7',
      screen: 'Scan',
      haptic: 'medium' as const,
    },
    {
      label: t('action_smart_move', 'Smart Move'),
      icon: 'trending-up',
      bgTint: '#FEF3C7',
      iconColor: '#D97706',
      screen: 'SmartMove',
      haptic: 'medium' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      {/* Top App Bar Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => {
            hapticLight();
            navigation?.navigate('Profile');
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open Farmer Profile"
        >
          <View style={styles.avatarContainer}>
            <Image source={FARMER_AVATAR} style={styles.avatar} resizeMode="cover" />
          </View>
          <View style={styles.titleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={styles.appTitle} numberOfLines={1}>Annapurna</Text>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primaryDeep} />
            </View>
            <Text style={styles.appSubtitle} numberOfLines={1}>{locationName}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ask Annapurna Vaani Voice Assistant"
            testID="home-voice-assistant"
            style={styles.voiceHeaderBtn}
            onPress={() => {
              hapticMedium();
              setVoiceModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="mic" size={20} color="#145C2E" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            testID="home-notifications"
            style={styles.notifButton}
            onPress={() => {
              hapticLight();
              navigation?.navigate('Notification');
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="notifications-none" size={22} color={Colors.primaryDeep} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={Colors.primary}
            progressViewOffset={0}
          />
        }
      >
        {/* Greeting Section — FadeInDown */}
        <FadeIn delay={50} duration={MotionTokens.duration.standard} direction="down" reducedMotion={false}>
            <View style={styles.greetingSection}>
              <TextEffect style={styles.greetingText} stagger={18}>
                {t('greeting_farmer', `Good morning, ${username}`)}
              </TextEffect>
              <TextLoop style={styles.greetingLoop} interval={3200}>
                {[
                  t('greeting_sub', 'Track every crop from sowing to sale'),
                  language === 'te' ? 'పంట నాణ్యత మరియు తెగుళ్ల రక్షణ' :
                  language === 'hi' ? 'फसल की सही कीमत और सुरक्षा' :
                  'Compare markets before you move',
                ]}
              </TextLoop>
            </View>
            </FadeIn>

            {/* Weather Summary Card */}
            <ScaleIn delay={100} duration={MotionTokens.duration.standard} reducedMotion={false}>
              <TouchableOpacity
                style={styles.weatherCardWrapper}
                onPress={() => {
                  hapticLight();
                  navigation?.navigate('Weather');
                }}
                activeOpacity={0.85}
              >
                <View style={styles.weatherCard}>
                  <View style={styles.weatherLeft}>
                    <View style={styles.weatherIconCircle}>
                      <MaterialIcons name="wb-sunny" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.weatherInfo}>
                      <Text style={styles.weatherTempText} numberOfLines={1}>
                        {displayTemp} {displayCondition}
                      </Text>
                      <Text style={styles.weatherLocationText} numberOfLines={1}>
                        {locationName}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.forecastPill}>
                    <Text style={styles.forecastLink}>Forecast</Text>
                    <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            </ScaleIn>

            <FadeIn delay={140} duration={MotionTokens.duration.standard} direction="up" reducedMotion={false}>
              <FarmInsightsCarousel cards={[
                {
                  id: 'active-crops',
                  icon: 'grass',
                  trend: `${dashboard?.by_status?.find((status) => status.current_status === 'ACTIVE')?.batch_count || 0} batches`,
                  value: String(dashboard?.by_crop_category?.length || 0),
                  label: 'Active Crops',
                  tint: Colors.successBg,
                  onPress: () => navigation?.navigate('CropBatches'),
                },
                {
                  id: 'weather',
                  icon: 'cloud',
                  trend: displayTemp,
                  value: displayCondition,
                  label: 'Weather Conditions',
                  tint: Colors.infoBg,
                  onPress: () => navigation?.navigate('Weather'),
                },
                {
                  id: 'harvest',
                  icon: 'inventory-2',
                  trend: `${dashboard?.totals?.batch_count || 0} total`,
                  value: String(dashboard?.by_status?.find((status) =>
                    ['READY', 'READY_TO_SELL', 'HARVESTED'].includes(status.current_status),
                  )?.batch_count || 0),
                  label: 'Harvest Ready',
                  tint: Colors.warningBg,
                  onPress: () => navigation?.navigate('CropBatches'),
                },
                {
                  id: 'revenue',
                  icon: 'trending-up',
                  trend: 'Estimate',
                  value: `₹${Math.round(((dashboard?.totals?.total_weight_kg || 0) * 24) / 1000)}K`,
                  label: 'Potential Revenue',
                  tint: Colors.successBg,
                  onPress: () => navigation?.navigate('Market'),
                },
              ]} />
            </FadeIn>

            {/* Primary Quick Actions Grid */}
            <View style={styles.quickActionsGrid}>
              {actionCards.map((action, index) => (
                <View key={action.label} style={styles.actionCardWrapper}>
                  <FadeIn delay={150 + index * 50} duration={MotionTokens.duration.standard} direction="up" reducedMotion={false} style={{ flex: 1 }}>
                    <TouchableOpacity
                      onPress={() => {
                        hapticMedium();
                        navigation?.navigate(action.screen);
                      }}
                      activeOpacity={0.75}
                      style={styles.actionCard}
                    >
                      <View style={[styles.actionIconContainer, { backgroundColor: action.bgTint }]}>
                        <MaterialIcons 
                          name={action.icon as any} 
                          size={24} 
                          color={action.iconColor} 
                        />
                      </View>
                      <Text style={styles.actionLabel} numberOfLines={1}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  </FadeIn>
                </View>
              ))}
            </View>

            {/* Expandable Your Crops grid */}
            <ScaleIn delay={250} duration={MotionTokens.duration.standard} reducedMotion={false}>
              <CropCardGrid
                crops={(dashboard?.by_crop_category || []).map((crop, index) => ({
                  id: `${crop.crop_category}-${index}`,
                  title: crop.crop_category,
                  batchCount: crop.batch_count,
                  totalWeightKg: crop.total_weight_kg,
                  status: 'Active',
                }))}
                activeBatches={dashboard?.by_status?.find((status) => status.current_status === 'ACTIVE')?.batch_count || 0}
                healthScore={dashboard?.totals?.avg_visual_score || 0}
                onViewDetails={() => navigation?.navigate('CropBatches')}
                onManage={() => navigation?.navigate('CropBatches')}
              />
            </ScaleIn>

            {/* Actionable crop/weather warning */}
            {Boolean((dashboard?.pathogen_alerts && dashboard.pathogen_alerts > 0) || (weatherAlerts.length > 0 && weatherAlerts[0].severity !== 'LOW')) ? (
              <FadeIn delay={300} duration={MotionTokens.duration.standard} direction="up" reducedMotion={false}>
                <ActionAlert
                  severity={dashboard?.pathogen_alerts ? 'error' : 'warning'}
                  title={dashboard?.pathogen_alerts
                    ? `${dashboard.pathogen_alerts} crop ${dashboard.pathogen_alerts === 1 ? 'batch needs' : 'batches need'} attention`
                    : `${weatherAlerts[0].title}: ${weatherAlerts[0].recommended_action}`}
                  onPress={() => navigation?.navigate(dashboard?.pathogen_alerts ? 'CropBatches' : 'Weather')}
                />
              </FadeIn>
            ) : null}

            {/* Farm Activity & Harvest Schedule Calendar */}
            <FadeIn delay={320} duration={MotionTokens.duration.standard} direction="up" reducedMotion={false}>
              <CalendarWidget />
            </FadeIn>

            {/* Categorized FAQ Section */}
            <FadeIn delay={350} duration={MotionTokens.duration.standard} direction="up" reducedMotion={false}>
              <View style={styles.section}>
                <CategorizedFAQ categories={faqCategories} />
              </View>
            </FadeIn>

            {/* Recent Activity List */}
            <FadeIn delay={400} duration={MotionTokens.duration.standard} direction="up" reducedMotion={false}>
              <View style={styles.recentActivitySection}>
                <View style={styles.activityHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>{t('recent_activity', 'Recent Activity')}</Text>
                  <MaterialIcons name="history" size={20} color={Colors.primary} />
                </View>
                <View style={styles.activityList}>
                  {activityItems.map((activity, index) => (
                    <TouchableOpacity
                      key={activity.id || `${activity.text}-${index}`}
                      onPress={() => {
                        hapticLight();
                        activity.onPress();
                      }}
                      activeOpacity={0.75}
                      style={styles.activityCard}
                    >
                      <View style={styles.activityIconCircle}>
                        <MaterialCommunityIcons name={activity.icon as any} size={20} color={activity.color} />
                      </View>
                      <Text style={styles.activityText} numberOfLines={2}>{activity.text}</Text>
                      <MaterialIcons name="chevron-right" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </FadeIn>
      </ScrollView>

      {/* Floating Speed Dial Quick Action Button */}
      <FloatingDisclosure navigation={navigation} />

      {/* Floating 1-Tap Multilingual Voice Assistant Button */}
      <FloatingVoiceButton
        onPress={() => setVoiceModalVisible(true)}
        label="Ask Vaani"
      />

      {/* Multilingual Voice Assistant Modal */}
      <VoiceAssistantModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        navigation={navigation}
        defaultLanguage="te"
      />
    </SafeAreaView>
  );
}

export default withErrorBoundary(HomeScreen, 'Home');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    zIndex: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  titleContainer: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryDeep,
    letterSpacing: -0.3,
  },
  appSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: -1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F4E6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A8D5A2',
  },
  notifButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: 120,
    gap: Spacing.sectionGap,
  },
  skeletonContainer: {
    gap: Spacing.sectionGap,
  },
  skeletonActionCard: {
    width: '30%',
    height: 96,
  },
  // --- Greeting ---
  greetingSection: {
    marginBottom: Spacing.xs,
  },
  greetingText: {
    fontFamily: FontFamily.semibold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  greetingLoop: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // --- Weather Card ---
  weatherCardWrapper: {
    marginBottom: Spacing.xs,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(27, 122, 61, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  weatherIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherInfo: {
    justifyContent: 'center',
    flex: 1,
  },
  weatherTempText: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  weatherLocationText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  forecastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(27, 122, 61, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  forecastLink: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  // --- Quick Actions ---
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: Spacing.xs,
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCard: {
    height: 102,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  // --- Active Crop Card ---
  activeCropCardWrapper: {
    marginBottom: Spacing.sectionGap,
  },
  activeCropCard: {
    gap: Spacing.md,
  },
  activeCropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cropTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.h4.fontSize,
    lineHeight: Typography.h4.lineHeight,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cropStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xxs + 2,
  },
  healthyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  healthyText: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.bodyMd.fontSize,
    lineHeight: Typography.bodyMd.lineHeight,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.xxl,
  },
  metricItem: {
    gap: Spacing.xxs,
  },
  metricLabel: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    lineHeight: Typography.small.lineHeight,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  metricValue: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.h4.fontSize,
    lineHeight: Typography.h4.lineHeight,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressSection: {
    marginTop: Spacing.sm,
  },
  progressLabel: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  // --- Alert ---
  alertCard: {
    backgroundColor: Colors.warningBg,
    borderLeftWidth: Spacing.xxs,
    borderLeftColor: Colors.warningIcon,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sectionGap,
  },
  alertCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    flex: 1,
  },
  alertIcon: {
    marginTop: Spacing.xxs,
  },
  alertText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: Typography.bodyMd.fontSize,
    lineHeight: Typography.bodyMd.lineHeight,
    fontWeight: '400',
    color: '#5D4037',
  },
  // --- FAQ Section ---
  faqTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.bodyLg.fontSize,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.sectionGap,
  },
  // --- Recent Activity ---
  recentActivitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: Spacing.md,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
  activityList: {
    gap: 8,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  activityText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
  },
});
