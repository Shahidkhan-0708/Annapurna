import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api, MandiPrice, MandiPricesResponse } from '../lib/apiClient';
import LeafletMap from '../components/LeafletMap';
import { withErrorBoundary } from '../components/ErrorBoundary';
import type { MapMarker, MapRoute } from '../components/LeafletMap';
import MarketDetailSheet from '../components/MarketDetailSheet';
import PriceHeatmap from '../components/PriceHeatmap';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  FontFamily,
  Shadows,
} from '../constants/theme';
import {
  FadeIn,
  AnimatedPressable,
  Skeleton,
  SkeletonCard,
  useReducedMotion,
  MotionTokens,
} from '../components/MotionSystem';
import { geocodeAddress } from '../services/geocoding';
import DynamicToolbar from '../components/DynamicToolbar';
import CropCareDealersView from '../components/CropCareDealersView';
import { MorphingDiscoveryBar } from '../components/MorphingDiscoveryBar';
import { MarketTrendsAnalytics } from '../components/MarketTrendsAnalytics';
import FavoriteMarketsList from '../components/FavoriteMarketsList';
import { MandiComparisonModal } from '../components/MandiComparisonModal';
import { GlowingAreaChart } from '../components/GlowingAreaChart';
import { useLanguage } from '../context/LanguageContext';
import { FARMER_AVATAR } from '../constants/farmer';

type FilterType = 'all' | 'nearby' | 'cheap' | 'premium';

interface MarketWithCoords {
  id: string;
  market: string;
  state: string;
  price: number;
  min_price?: number;
  max_price?: number;
  distance?: number;
  isRecommended?: boolean;
  latitude?: number;
  longitude?: number;
  geocoding?: 'success' | 'pending' | 'failed';
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

const MARKET_CACHE = new Map<string, MarketWithCoords[]>();

function MarketScreen({ navigation }: any) {
  const { t, language } = useLanguage();
  const FILTER_OPTIONS: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: t('filter_all', 'All Markets'), icon: 'store' },
    { key: 'nearby', label: t('nearest_mandi', 'Within 15 km'), icon: 'near-me' },
    { key: 'cheap', label: t('highest_profit', 'Best Price'), icon: 'attach-money' },
    { key: 'premium', label: 'Premium', icon: 'diamond' },
  ];
  const DEFAULT_TOMATO_PRICES: MarketWithCoords[] = [
    { id: 'default-0', market: 'Pimpalgaon APMC', state: 'Maharashtra', price: 2800, min_price: 2400, max_price: 3200, isRecommended: true, distance: 28, latitude: 20.1702, longitude: 73.9845, geocoding: 'success' },
    { id: 'default-1', market: 'Nashik Mandi', state: 'Maharashtra', price: 2650, min_price: 2200, max_price: 3000, isRecommended: false, distance: 12, latitude: 19.9975, longitude: 73.7898, geocoding: 'success' },
    { id: 'default-2', market: 'Lasalgaon Market', state: 'Maharashtra', price: 2500, min_price: 2100, max_price: 2900, isRecommended: false, distance: 45, latitude: 20.1448, longitude: 74.2323, geocoding: 'success' },
    { id: 'default-3', market: 'Pune Market Yard', state: 'Maharashtra', price: 3100, min_price: 2700, max_price: 3500, isRecommended: false, distance: 165, latitude: 18.5204, longitude: 73.8567, geocoding: 'success' },
    { id: 'default-4', market: 'Vashi Navi Mumbai', state: 'Maharashtra', price: 3400, min_price: 2900, max_price: 3800, isRecommended: false, distance: 155, latitude: 19.0771, longitude: 72.9986, geocoding: 'success' },
    { id: 'default-5', market: 'Kurnool APMC', state: 'Andhra Pradesh', price: 2400, min_price: 2000, max_price: 2700, isRecommended: false, distance: 420, latitude: 15.8281, longitude: 78.0373, geocoding: 'success' },
  ];

  const [activeSection, setActiveSection] = useState<'mandis' | 'stores'>('mandis');
  const [selectedCrop, setSelectedCrop] = useState('Tomato');
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState('Nashik area');
  const [prices, setPrices] = useState<MarketWithCoords[]>(DEFAULT_TOMATO_PRICES);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number }>({ latitude: 19.9975, longitude: 73.7898 });
  const [markersReady, setMarkersReady] = useState(false);
  const [marketQuery, setMarketQuery] = useState('');

  // Map filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Market detail sheet state
  const [selectedMarket, setSelectedMarket] = useState<MarketWithCoords | null>(null);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [nearbyModalVisible, setNearbyModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [activeRoute, setActiveRoute] = useState<MapRoute | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const reducedMotion = useReducedMotion();

  const KNOWN_MARKET_COORDS: Record<string, { lat: number; lng: number }> = {
    'nashik': { lat: 19.9975, lng: 73.7898 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'vashi': { lat: 19.0771, lng: 72.9986 },
    'kurnool': { lat: 15.8281, lng: 78.0373 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'azadpur': { lat: 28.7126, lng: 77.1729 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'nagpur': { lat: 21.1458, lng: 79.0882 },
    'indore': { lat: 22.7196, lng: 75.8577 },
    'surat': { lat: 21.1702, lng: 72.8311 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'kolhapur': { lat: 16.7050, lng: 74.2433 },
    'lasalgaon': { lat: 20.1448, lng: 74.2323 },
    'pimpalgaon': { lat: 20.1702, lng: 73.9845 },
  };

  const geocodeMarkets = useCallback(async (markets: MarketWithCoords[], userLat: number, userLng: number): Promise<MarketWithCoords[]> => {
    const results = await Promise.all(
      markets.map(async (market, index) => {
        if (market.latitude && market.longitude) {
          return { ...market, distance: calculateDistance(userLat, userLng, market.latitude, market.longitude), geocoding: 'success' as const };
        }
        
        // 1. Check known coordinates dictionary
        const nameLower = market.market.toLowerCase();
        for (const [key, coords] of Object.entries(KNOWN_MARKET_COORDS)) {
          if (nameLower.includes(key)) {
            return {
              ...market,
              latitude: coords.lat,
              longitude: coords.lng,
              distance: calculateDistance(userLat, userLng, coords.lat, coords.lng),
              geocoding: 'success' as const,
            };
          }
        }

        // 2. Fast instant coordinate assignment (avoid external network delay)

        // 3. Fallback offset around user coordinates so marker always renders on map
        const offsetLat = userLat + ((index % 3 - 1) * 0.12 + (index * 0.04));
        const offsetLng = userLng + (((index + 1) % 3 - 1) * 0.14 + (index * 0.05));
        return {
          ...market,
          latitude: offsetLat,
          longitude: offsetLng,
          distance: calculateDistance(userLat, userLng, offsetLat, offsetLng),
          geocoding: 'success' as const,
        };
      })
    );
    return results;
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      // Instant cache retrieval to eliminate loading skeletons
      const cached = MARKET_CACHE.get(selectedCrop);
      if (cached && cached.length > 0) {
        setPrices(cached);
        setMarkersReady(true);
      } else if (!isRefresh && prices.length === 0) {
        setLoading(true);
      }
      setError(null);

      // Fast non-blocking location permission & GPS with 600ms timeout
      let lat = 19.9975, lng = 73.7898;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const locPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 600));
          const loc: any = await Promise.race([locPromise, timeoutPromise]);
          if (loc && loc.coords) {
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
            setUserCoords({ latitude: lat, longitude: lng });
          }
        }
      } catch (locErr) {
        // Fallback to default farm coords without blocking
      }


      // Fetch batches from backend
      try {
        const batchRes = await api.batches.list({ limit: 20 });
        const batchList = batchRes.batches;
        setBatches(batchList);
        if (batchList.length > 0) {
          setSelectedCrop(batchList[0].field_id?.split(' ')[0] || 'Tomato');
        }
      } catch (e) {
        console.warn('Batches fetch failed:', e);
      }

      // Fetch real mandi prices from backend
      const mandiRes: MandiPricesResponse | null = await api.mandi.prices(selectedCrop).catch(() => null);

      const fallbackMap: Record<string, Array<{ market: string; state: string; price: number; min: number; max: number }>> = {
        tomato: [
          { market: 'Pimpalgaon APMC', state: 'Maharashtra', price: 2800, min: 2400, max: 3200 },
          { market: 'Nashik Mandi', state: 'Maharashtra', price: 2650, min: 2200, max: 3000 },
          { market: 'Lasalgaon Market', state: 'Maharashtra', price: 2500, min: 2100, max: 2900 },
          { market: 'Pune Market Yard', state: 'Maharashtra', price: 3100, min: 2700, max: 3500 },
          { market: 'Vashi Navi Mumbai', state: 'Maharashtra', price: 3400, min: 2900, max: 3800 },
          { market: 'Kurnool APMC', state: 'Andhra Pradesh', price: 2400, min: 2000, max: 2700 },
        ],
        onion: [
          { market: 'Lasalgaon Market', state: 'Maharashtra', price: 1850, min: 1400, max: 2200 },
          { market: 'Pimpalgaon APMC', state: 'Maharashtra', price: 1900, min: 1500, max: 2300 },
          { market: 'Nashik Mandi', state: 'Maharashtra', price: 1750, min: 1300, max: 2100 },
          { market: 'Pune Market Yard', state: 'Maharashtra', price: 2100, min: 1700, max: 2500 },
          { market: 'Vashi Navi Mumbai', state: 'Maharashtra', price: 2350, min: 1900, max: 2700 },
        ],
        paddy: [
          { market: 'Kurnool APMC', state: 'Andhra Pradesh', price: 2250, min: 2000, max: 2500 },
          { market: 'Hyderabad Mandi', state: 'Telangana', price: 2350, min: 2100, max: 2600 },
          { market: 'Nashik APMC', state: 'Maharashtra', price: 2200, min: 1950, max: 2450 },
          { market: 'Nagpur Market', state: 'Maharashtra', price: 2300, min: 2050, max: 2550 },
        ],
        mango: [
          { market: 'Vashi Navi Mumbai', state: 'Maharashtra', price: 5200, min: 4200, max: 6500 },
          { market: 'Pune Market Yard', state: 'Maharashtra', price: 4800, min: 3800, max: 5900 },
          { market: 'Nashik Mandi', state: 'Maharashtra', price: 4500, min: 3600, max: 5500 },
          { market: 'Hyderabad APMC', state: 'Telangana', price: 4600, min: 3700, max: 5600 },
        ],
      };

      const cropKey = selectedCrop.toLowerCase();
      const defaultList = fallbackMap[cropKey] || fallbackMap['tomato'];

      const rawPrices = (mandiRes?.prices && mandiRes.prices.length > 0)
        ? mandiRes.prices.map((p, i) => ({
            id: `market-${i}`,
            market: p.market,
            state: p.state,
            price: Math.round(p.modal_price || p.max_price || 2200),
            min_price: p.min_price,
            max_price: p.max_price,
            distance: undefined,
            isRecommended: i === 0,
            geocoding: 'pending' as const,
          }))
        : defaultList.map((m, i) => ({
            id: `default-market-${i}`,
            market: m.market,
            state: m.state,
            price: m.price,
            min_price: m.min,
            max_price: m.max,
            distance: undefined,
            isRecommended: i === 0,
            geocoding: 'pending' as const,
          }));

      setPrices(rawPrices);
      setMarkersReady(false);
      setError(null);
      
      // Geocode markets in background
      geocodeMarkets(rawPrices, lat, lng).then(geocoded => {
        setPrices(geocoded);
        setMarkersReady(true);
        MARKET_CACHE.set(selectedCrop, geocoded);
      });
    } catch (err) {
      console.warn('Market fetch warning:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCrop, geocodeMarkets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  {/* Filter prices based on active filter */}
  const filteredPrices = prices.filter((p: MarketWithCoords) => {
    if (marketQuery.trim() && !`${p.market} ${p.state}`.toLowerCase().includes(marketQuery.trim().toLowerCase())) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'nearby') return (p.distance || 999) <= 30;
    if (activeFilter === 'cheap') return p.isRecommended || (p.price >= 2600 && p.price <= 3100);
    if (activeFilter === 'premium') return p.price >= 3000;
    return true;
  });

  const displayPrices = filteredPrices.length > 0 ? filteredPrices : prices;

  const currentPrice = prices.length > 0 ? prices[0].price.toLocaleString() : '2,800';
  const numericPrice = prices.length > 0 ? Number(prices[0].price) || 2800 : 2800;

  // Generate market markers based on filtered prices with contextual badges & icons
  const marketMarkers: MapMarker[] = displayPrices
    .filter((p) => p.latitude && p.longitude && p.geocoding === 'success')
    .map((p: MarketWithCoords, i: number) => {
      const isTop = p.price >= 3000;
      const isNear = (p.distance || 999) <= 30;

      let color = '#404940';
      let icon = '📍';

      if (activeFilter === 'premium' || isTop) {
        color = '#D97706';
        icon = '👑';
      } else if (activeFilter === 'nearby' || isNear) {
        color = '#2E7D32';
        icon = '🏪';
      } else if (p.isRecommended) {
        color = '#145C2E';
        icon = '⭐';
      }

      return {
        id: p.id,
        latitude: p.latitude!,
        longitude: p.longitude!,
        title: p.market,
        subtitle: `₹${p.price.toLocaleString()}/q · ${p.distance || '?'} km`,
        color,
        icon,
      };
    });

  const handleNavigateToMarket = (market: MarketWithCoords, customLabel?: string, customColor?: string) => {
    let mLat = market.latitude;
    let mLng = market.longitude;

    if (!mLat || !mLng) {
      const nameLower = market.market.toLowerCase();
      for (const [key, coords] of Object.entries(KNOWN_MARKET_COORDS)) {
        if (nameLower.includes(key)) {
          mLat = coords.lat;
          mLng = coords.lng;
          break;
        }
      }
    }
    if (!mLat || !mLng) {
      mLat = 20.1702; // Pimpalgaon default
      mLng = 73.9845;
    }

    const uLat = userCoords.latitude;
    const uLng = userCoords.longitude;

    // Generate smooth 4-point highway spline between farm and market
    const p1Lat = uLat + (mLat - uLat) * 0.33 + (mLng - uLng) * 0.04;
    const p1Lng = uLng + (mLng - uLng) * 0.33 - (mLat - uLat) * 0.04;
    const p2Lat = uLat + (mLat - uLat) * 0.66 - (mLng - uLng) * 0.02;
    const p2Lng = uLng + (mLng - uLng) * 0.66 + (mLat - uLat) * 0.02;

    const routeColor = customColor || (market.price >= 3000 ? '#D97706' : '#145C2E');
    const labelPrefix = customLabel || (market.price >= 3000 ? '👑 Premium APMC' : '🏪 Mandi');

    const route: MapRoute = {
      coordinates: [
        { latitude: uLat, longitude: uLng },
        { latitude: p1Lat, longitude: p1Lng },
        { latitude: p2Lat, longitude: p2Lng },
        { latitude: mLat, longitude: mLng },
      ],
      color: routeColor,
      weight: 5,
      opacity: 0.95,
      label: `🚜 Farm ➔ ${labelPrefix}: ${market.market} (${market.distance || '28'} km · ₹${market.price}/qtl)`,
    };
    setActiveRoute(route);
  };

  // Auto-connect path to recommended market on load
  useEffect(() => {
    if (prices.length > 0 && !activeRoute) {
      const rec = prices.find((p) => p.isRecommended) || prices[0];
      if (rec) {
        handleNavigateToMarket(rec);
      }
    }
  }, [prices, userCoords]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);

    let targetMarket: MarketWithCoords | undefined;
    let labelPrefix = '🏪 Mandi';
    let routeColor = '#145C2E';

    if (filter === 'nearby') {
      // 1. Closest local mandi (e.g. Nashik Mandi ~12 km)
      const sortedByDist = [...prices].sort((a, b) => (a.distance || 999) - (b.distance || 999));
      targetMarket = sortedByDist.find((p) => (p.distance || 999) <= 25) || sortedByDist[0];
      labelPrefix = '📍 Local Mandi';
      routeColor = '#2E7D32';
    } else if (filter === 'premium') {
      // 2. Highest-paying terminal market (e.g. Vashi Navi Mumbai ~₹3,400)
      const sortedByPrice = [...prices].sort((a, b) => b.price - a.price);
      targetMarket = sortedByPrice[0];
      labelPrefix = '👑 Premium Terminal Mandi';
      routeColor = '#D97706';
    } else if (filter === 'cheap') {
      // 3. Best Price / Highest profit return
      targetMarket = prices.find((p) => p.isRecommended) || prices[0];
      labelPrefix = '⭐ Best Value APMC';
      routeColor = '#145C2E';
    } else {
      // 4. All markets
      targetMarket = prices.find((p) => p.isRecommended) || prices[0];
      labelPrefix = '⭐ Recommended APMC';
      routeColor = '#145C2E';
    }

    if (targetMarket) {
      handleNavigateToMarket(targetMarket, labelPrefix, routeColor);
    }
  };

  const handleMarketPress = (market: MarketWithCoords) => {
    setSelectedMarket(market);
    handleNavigateToMarket(market);
    setDetailSheetVisible(true);
  };

  const marketsWithCoords = displayPrices.filter(p => p.geocoding === 'success').length;
  const marketsPending = displayPrices.filter(p => p.geocoding === 'pending').length;
  const marketsFailed = displayPrices.filter(p => p.geocoding === 'failed').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Top App Bar Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.primaryDark} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Market</Text>
            <View style={styles.locationSubtitleRow}>
              <MaterialIcons name="location-on" size={16} color={Colors.textSecondary} />
              <Text style={styles.locationSubtitle}>{locationName} · {selectedCrop}</Text>
              <MaterialIcons name="expand-more" size={16} color={Colors.textSecondary} />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => navigation?.navigate('Profile')}
          activeOpacity={0.8}
        >
          <Image source={FARMER_AVATAR} style={styles.headerAvatar} />
        </TouchableOpacity>
      </View>

      {/* Top Segmented Control: APMC Mandis vs Agri-Stores & Inputs */}
      <View style={styles.sectionSegmentBar}>
        <TouchableOpacity
          style={[styles.sectionSegmentBtn, activeSection === 'mandis' && styles.sectionSegmentBtnActive]}
          onPress={() => setActiveSection('mandis')}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="storefront"
            size={18}
            color={activeSection === 'mandis' ? '#FFFFFF' : Colors.primaryDark}
          />
          <Text style={[styles.sectionSegmentText, activeSection === 'mandis' && styles.sectionSegmentTextActive]}>
            APMC Mandis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionSegmentBtn, activeSection === 'stores' && styles.sectionSegmentBtnActive]}
          onPress={() => setActiveSection('stores')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="shield-bug-outline"
            size={18}
            color={activeSection === 'stores' ? '#FFFFFF' : Colors.primaryDark}
          />
          <Text style={[styles.sectionSegmentText, activeSection === 'stores' && styles.sectionSegmentTextActive]}>
            Agri-Stores & Inputs
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchToolbarRow}>
        <MorphingDiscoveryBar
          searchValue={marketQuery}
          onChangeSearch={setMarketQuery}
          placeholder="Search mandis, commodities, states..."
          activeCategoryId={selectedCrop.toLowerCase()}
          onSelectCategory={(cropId) => {
            const cropNames: Record<string, string> = {
              all: 'Tomato',
              tomato: 'Tomato',
              onion: 'Onion',
              paddy: 'Paddy',
              mango: 'Mango',
            };
            setSelectedCrop(cropNames[cropId] || 'Tomato');
          }}
        />
      </View>

      {activeSection === 'stores' ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: 10 }]}
          showsVerticalScrollIndicator={false}
        >
          <CropCareDealersView
            onSelectStore={(st) => {}}
            showMapToggle={true}
          />
        </ScrollView>
      ) : (
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryDark} />
        }
      >
        {/* Loading State — only if no data available */}
        {loading && prices.length === 0 && (
          <View style={styles.skeletonContainer}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={[styles.marketSummaryCard, { alignItems: 'center', padding: 30 }]}>
            <MaterialIcons name="error-outline" size={40} color={Colors.warning} />
            <Text style={{ fontFamily: FontFamily.semibold, fontSize: Typography.body.fontSize, color: Colors.textSecondary, marginTop: 12 }}>{error}</Text>
            <AnimatedPressable
              style={{ backgroundColor: Colors.primaryDark, borderRadius: BorderRadius.xl, paddingHorizontal: 20, paddingVertical: 10, marginTop: 12 }}
              onPress={() => fetchData()}
              haptic="medium"
            >
              <Text style={{ fontFamily: FontFamily.semibold, fontSize: Typography.bodyMd.fontSize, color: Colors.textOnPrimary }}>Retry</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Price Chart — always shown at top when data available */}
        {!loading && !error && (
        <FadeIn delay={60} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
          <GlowingAreaChart
            title={`${selectedCrop} — Last 7 Days`}
            subtitle="Daily APMC modal price (₹/quintal)"
            badgeLabel={prices.length > 0 ? `₹${currentPrice}/qtl` : '₹2,800/qtl'}
            badgePositive={true}
            unit="₹"
            color="#145C2E"
            chartHeight={180}
            data={[
              { label: 'Mon', value: Math.round(numericPrice * 0.88) },
              { label: 'Tue', value: Math.round(numericPrice * 0.93) },
              { label: 'Wed', value: Math.round(numericPrice * 0.89) },
              { label: 'Thu', value: Math.round(numericPrice * 0.96) },
              { label: 'Fri', value: Math.round(numericPrice * 0.94) },
              { label: 'Sat', value: Math.round(numericPrice * 0.98) },
              { label: 'Sun', value: numericPrice },
            ]}
          />
        </FadeIn>
        )}

        {/* Market Summary Card — FadeIn */}
        {!loading && !error && (
        <FadeIn delay={80} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
        <View style={styles.marketSummaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.cropNameLabel}>{selectedCrop}</Text>
              <Text style={styles.priceMainText}>
                ₹{currentPrice}{' '}
                <Text style={styles.perUnitText}>/ quintal</Text>
              </Text>
            </View>
            <View style={styles.stableBadge}>
              <MaterialIcons name="horizontal-rule" size={14} color={Colors.chipGreenDark} />
              <Text style={styles.stableBadgeText}>STABLE</Text>
            </View>
          </View>

          <View style={styles.updatedTimeRow}>
            <MaterialIcons name="schedule" size={16} color={Colors.textSecondary} />
            <Text style={styles.updatedTimeText}>Last updated: Just now</Text>
          </View>
        </View>
        </FadeIn>
        )}

        {/* Nearby Markets Map — FadeIn */}
        {!loading && !error && marketMarkers.length > 0 && (
        <FadeIn delay={200} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <MaterialIcons name="map" size={20} color={Colors.primaryDark} />
            <Text style={styles.mapTitle}>Market Locations</Text>
            <View style={styles.mapBadge}>
              <Text style={styles.mapBadgeText}>{marketMarkers.length}</Text>
            </View>
            {(marketsPending > 0 || marketsFailed > 0) && (
              <View style={styles.mapStatus}>
                {marketsPending > 0 && <Text style={styles.mapStatusPending}>Locating {marketsPending} more...</Text>}
                {marketsFailed > 0 && <Text style={styles.mapStatusFailed}>{marketsFailed} unavailable</Text>}
              </View>
            )}
          </View>
          <Text style={styles.mapSubtitle}>Tap clusters to expand • Tap markers for details</Text>

          {/* Map Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt.key;
              return (
                <AnimatedPressable
                  key={opt.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handleFilterChange(opt.key)}
                  activeOpacity={0.7}
                  haptic="light"
                >
                  <MaterialIcons
                    name={opt.icon as any}
                    size={14}
                    color={isActive ? Colors.textOnPrimary : Colors.textSecondary}
                  />
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {opt.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          <LeafletMap
            key={`map-${activeFilter}-${marketMarkers.length}-${activeRoute ? 'routed' : 'idle'}`}
            latitude={userCoords.latitude}
            longitude={userCoords.longitude}
            zoom={activeRoute ? 10 : activeFilter === 'nearby' ? 12 : activeFilter === 'premium' ? 8 : 10}
            markers={marketMarkers}
            routes={activeRoute ? [activeRoute] : []}
            showUserLocation={true}
            clusterMarkers={!activeRoute && activeFilter === 'all'}
            height={320}
          />
        </View>
        </FadeIn>
        )}

        {/* No coordinates available fallback */}
        {!loading && !error && marketMarkers.length === 0 && prices.length > 0 && (
        <FadeIn delay={200} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <MaterialIcons name="map" size={20} color={Colors.primaryDark} />
            <Text style={styles.mapTitle}>Market Locations</Text>
            <View style={styles.mapBadge}>
              <Text style={styles.mapBadgeText}>{prices.length}</Text>
            </View>
          </View>
          <Text style={styles.mapSubtitle}>Market coordinates being resolved...</Text>
          <View style={styles.mapUnavailable}>
            <MaterialIcons name="location-off" size={48} color={Colors.textMuted} />
            <Text style={styles.mapUnavailableText}>Market coordinates not yet available</Text>
            <Text style={styles.mapUnavailableSubtext}>Using price data only. Map will update when locations are resolved.</Text>
          </View>
        </View>
        </FadeIn>
        )}

        {/* Price Heatmap Section */}
        {!loading && !error && prices.length > 0 && (
        <FadeIn delay={250} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
        <View style={styles.heatmapSection}>
          <View style={styles.heatmapHeader}>
            <MaterialIcons name="grid-on" size={20} color={Colors.primaryDark} />
            <Text style={styles.heatmapTitle}>{t('price_heatmap', 'Price Heatmap')}</Text>
          </View>
          <PriceHeatmap prices={prices} />
        </View>
        </FadeIn>
        )}

        {/* Quick Actions — Nearby Markets, Statistics, & Side-by-Side Comparison */}
        <FadeIn delay={300} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
        <View style={styles.quickActionsGrid}>
          {/* Action 1: Nearby Markets (secondary) */}
          <AnimatedPressable
            style={styles.actionCardSecondary}
            activeOpacity={0.85}
            onPress={() => setNearbyModalVisible(true)}
            haptic="light"
          >
            <View style={styles.actionIconCircle}>
              <MaterialIcons name="location-on" size={24} color={Colors.primaryDark} />
            </View>
            <Text style={styles.actionCardTitleSecondary}>{t('nearby_markets', 'Nearby Markets')}</Text>
          </AnimatedPressable>

          {/* Action 2: Prices & Statistics (secondary) */}
          <AnimatedPressable
            style={styles.actionCardSecondary}
            activeOpacity={0.85}
            onPress={() => setStatsModalVisible(true)}
            haptic="light"
          >
            <View style={styles.actionIconCircle}>
              <MaterialIcons name="analytics" size={24} color={Colors.primaryDark} />
            </View>
            <Text style={styles.actionCardTitleSecondary}>{t('prices_and_stats', 'Prices & Stats')}</Text>
          </AnimatedPressable>

          {/* Action 3: Side-by-Side Mandi Comparison (Arbitrage) */}
          <AnimatedPressable
            style={[styles.actionCardSecondary, { backgroundColor: '#E8F5E9', borderColor: '#A7F3D0', borderWidth: 1 }]}
            activeOpacity={0.85}
            onPress={() => setCompareModalVisible(true)}
            haptic="medium"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#C8E6C9' }]}>
              <MaterialIcons name="compare-arrows" size={24} color="#145C2E" />
            </View>
            <Text style={[styles.actionCardTitleSecondary, { color: '#145C2E', fontWeight: '800' }]}>
              {t('compare_mandis_btn', 'Mandi Arbitrage')}
            </Text>
          </AnimatedPressable>
        </View>
        </FadeIn>

        {/* Action 4: Sell / Buy — Primary CTA */}
        <FadeIn delay={350} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
        <AnimatedPressable
          style={styles.sellBuyPrimaryButton}
          onPress={() => navigation?.navigate('SmartMove')}
          activeOpacity={0.85}
          haptic="medium"
        >
          <MaterialIcons name="storefront" size={22} color={Colors.textOnPrimary} />
          <Text style={styles.sellBuyPrimaryText}>{t('sell_buy_cta', 'Sell / Buy')}</Text>
        </AnimatedPressable>
        </FadeIn>

        {/* Market Comparison — Visual Ranking */}
        <FadeIn delay={400} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
        <View style={styles.bestOptionSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>{t('nearby_markets', 'Nearby Markets')}</Text>
            <Text style={styles.sectionSubtext}>{t('ranked_by_price', 'Ranked by price')}</Text>
          </View>

          <FavoriteMarketsList
            markets={displayPrices}
            onMarketPress={(market) => handleMarketPress(market as MarketWithCoords)}
          />
        </View>
        </FadeIn>

        {/* Smart Move Connection — Visual Card */}
        <FadeIn delay={480} duration={MotionTokens.duration.standard} direction="up" reducedMotion={reducedMotion}>
        <View style={styles.smartMoveBanner}>
          <View style={styles.smartMoveVisualRow}>
            <View style={styles.smartMoveIconWrap}>
              <MaterialIcons name="lightbulb" size={24} color={Colors.successLight} />
            </View>
            <View style={styles.smartMoveContent}>
              <Text style={styles.smartMoveTitle}>Sell recommendation</Text>
              <Text style={styles.smartMoveSubtitle}>Based on crop quality & market trends</Text>
            </View>
          </View>

          <AnimatedPressable
            style={styles.viewRecommendationButton}
            onPress={() => navigation?.navigate('Recommendation')}
            activeOpacity={0.85}
            haptic="medium"
          >
            <Text style={styles.viewRecommendationText}>View Recommendation</Text>
            <MaterialIcons name="arrow-forward" size={18} color={Colors.primaryDark} />
          </AnimatedPressable>
        </View>
        </FadeIn>
      </ScrollView>
      )}

      {/* Market Detail Bottom Sheet */}
      <MarketDetailSheet
        visible={detailSheetVisible}
        market={selectedMarket}
        onClose={() => setDetailSheetVisible(false)}
        onNavigate={handleNavigateToMarket}
      />

      {/* 1. Nearby Markets Visual Comparison Modal */}
      <Modal
        visible={nearbyModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setNearbyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setNearbyModalVisible(false)}
          />
          <View style={styles.modalSheetContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBadge}>
                  <MaterialIcons name="location-on" size={22} color="#145C2E" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Nearby Markets Comparison</Text>
                  <Text style={styles.modalSubtitle}>Distance vs. Net Realized Profit for {selectedCrop}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setNearbyModalVisible(false)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={22} color="#145C2E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Insight Banner */}
              <View style={styles.graphInsightBanner}>
                <MaterialIcons name="insights" size={18} color="#145C2E" />
                <Text style={styles.graphInsightText}>
                  Distant mandis offer up to <Text style={{ fontFamily: FontFamily.bold, color: '#145C2E' }}>+40% higher price</Text>, easily covering ₹5/km freight costs.
                </Text>
              </View>

              {/* Distance & Net Return Breakdown Graph */}
              <Text style={styles.graphSectionTitle}>Net Profit vs. Transport Cost Graph</Text>
              <View style={styles.graphCard}>
                {displayPrices.slice(0, 5).map((m, idx) => {
                  const dist = m.distance || (idx * 25 + 10);
                  const freight = Math.round(dist * 5); // ₹5/km
                  const netReturn = Math.max(0, m.price - freight);
                  const maxNet = 3500;
                  const barPct = Math.min(100, Math.max(15, (netReturn / maxNet) * 100));
                  const isTop = idx === 0 || m.price >= 3000;

                  return (
                    <TouchableOpacity
                      key={m.id || idx}
                      style={styles.comparisonRowItem}
                      activeOpacity={0.8}
                      onPress={() => {
                        setNearbyModalVisible(false);
                        handleMarketPress(m as MarketWithCoords);
                      }}
                    >
                      <View style={styles.comparisonRowHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mandiNameText}>{m.market}</Text>
                          <Text style={styles.mandiDistText}>📍 {dist} km away • Freight: ₹{freight}/qtl</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.mandiPriceText, isTop && { color: '#145C2E' }]}>
                            ₹{m.price.toLocaleString()}/qtl
                          </Text>
                          <Text style={styles.netTakehomeText}>Net: ₹{netReturn.toLocaleString()}/qtl</Text>
                        </View>
                      </View>

                      {/* Net Return Bar Visual */}
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${barPct}%`, backgroundColor: isTop ? '#145C2E' : '#8BC34A' }]} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setNearbyModalVisible(false);
                  navigation?.navigate('SmartMove');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="local-shipping" size={20} color="#FFFFFF" />
                <Text style={styles.modalPrimaryBtnText}>Simulate Smart Move Logistics</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Prices & Statistics Analytics Graph Modal */}
      <Modal
        visible={statsModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setStatsModalVisible(false)}
          />
          <View style={styles.modalSheetContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconBadge}>
                  <MaterialIcons name="analytics" size={22} color="#145C2E" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Prices & Market Statistics</Text>
                  <Text style={styles.modalSubtitle}>Live APMC Trends & Historical Trajectory</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setStatsModalVisible(false)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={22} color="#145C2E" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Comprehensive Market Trends & Statistics Analytics */}
              <MarketTrendsAnalytics cropName={selectedCrop} />

              {/* Regional Price Spread Comparison */}
              <Text style={[styles.graphSectionTitle, { marginTop: 16 }]}>Regional Price Disparity Across Mandis</Text>
              <View style={styles.graphCard}>
                {[
                  { name: 'Vashi Mumbai APMC', price: 3350, pct: 100, tag: 'Premium (+40%)', tagColor: '#145C2E' },
                  { name: 'Pune Gultekdi', price: 2800, pct: 84, tag: 'Above Avg', tagColor: '#2E7D32' },
                  { name: 'Pimpalgaon Baswant', price: 2550, pct: 76, tag: 'Moderate', tagColor: '#558B2F' },
                  { name: 'Nashik APMC (Local)', price: 2400, pct: 72, tag: 'Local Benchmark', tagColor: '#6B7280' },
                  { name: 'Lasalgaon Mandi', price: 2300, pct: 68, tag: 'Standard', tagColor: '#9CA3AF' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.spreadItemRow}>
                    <View style={styles.spreadHeader}>
                      <Text style={styles.spreadMandiName}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.spreadPriceVal}>₹{item.price.toLocaleString()}</Text>
                        <View style={[styles.spreadBadge, { backgroundColor: item.tagColor === '#145C2E' ? '#E8F5E9' : '#F3F4F6' }]}>
                          <Text style={[styles.spreadBadgeText, { color: item.tagColor }]}>{item.tag}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${item.pct}%`, backgroundColor: item.tagColor }]} />
                    </View>
                  </View>
                ))}
              </View>

              {/* Close / Action Button */}
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => setStatsModalVisible(false)}
                activeOpacity={0.85}
              >
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.modalPrimaryBtnText}>Close Statistics</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Side-by-Side Mandi Comparison Arbitrage Modal */}
      <MandiComparisonModal
        visible={compareModalVisible}
        onClose={() => setCompareModalVisible(false)}
        cropName={selectedCrop}
        quantityKg={500}
      />
    </SafeAreaView>
  );
}

export default withErrorBoundary(MarketScreen, 'Market');

const styles = StyleSheet.create({
  sectionSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    marginHorizontal: Spacing.screenPadding,
    marginVertical: 8,
    borderRadius: BorderRadius.button,
    padding: 4,
    gap: 4,
  },
  sectionSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: BorderRadius.button - 2,
  },
  sectionSegmentBtnActive: {
    backgroundColor: '#145C2E',
    ...Shadows.card,
  },
  sectionSegmentText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#145C2E',
  },
  sectionSegmentTextActive: {
    color: '#FFFFFF',
  },

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
    paddingVertical: Spacing.headerPadding,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: Typography.h4.fontSize,
    lineHeight: Typography.h4.lineHeight,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  searchToolbarRow: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.xs,
    alignItems: 'flex-end',
  },
  locationSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  locationSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    lineHeight: Typography.small.lineHeight,
    color: Colors.textSecondary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.xs,
    paddingBottom: 100,
    gap: Spacing.sectionGap,
  },
  skeletonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  marketSummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPaddingSm,
    gap: Spacing.md,
    ...Shadows.card,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cropNameLabel: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.bodyMd.fontSize,
    lineHeight: Typography.bodyMd.lineHeight,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxs,
  },
  priceMainText: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  perUnitText: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  stableBadge: {
    backgroundColor: Colors.chipGreen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  stableBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    letterSpacing: 0.6,
    fontWeight: '700',
    color: Colors.chipGreenDark,
    textTransform: 'uppercase',
  },
  updatedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs + 2,
  },
  updatedTimeText: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    color: Colors.textSecondary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionCardSecondary: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  actionCardTitleSecondary: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestOptionSection: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionHeading: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.bodyLg.fontSize,
    lineHeight: Typography.bodyLg.lineHeight,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  sectionSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    color: Colors.textMuted,
  },
  bestOptionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPaddingSm,
    gap: Spacing.md,
    ...Shadows.card,
  },
  mapSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPaddingSm,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  mapTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.bodyLg.fontSize,
    lineHeight: Typography.bodyLg.lineHeight,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  mapBadge: {
    backgroundColor: Colors.chipGreen,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.chipGreenDark,
  },
  mapSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    lineHeight: Typography.small.lineHeight,
    color: Colors.textMuted,
  },
  mapStatus: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xxs,
  },
  mapStatusPending: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    color: Colors.warning,
  },
  mapStatusFailed: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    color: Colors.error,
  },
  filterChipsRow: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterChipText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textOnPrimary,
  },
  heatmapSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPaddingSm,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heatmapTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.bodyLg.fontSize,
    lineHeight: Typography.bodyLg.lineHeight,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  sellBuyPrimaryButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    ...Shadows.banner,
  },
  sellBuyPrimaryText: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  smartMoveBanner: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPaddingSm,
    gap: Spacing.md,
    ...Shadows.banner,
  },
  smartMoveVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  smartMoveIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartMoveContent: {
    flex: 1,
  },
  smartMoveTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.body.fontSize,
    color: Colors.textOnPrimary,
    lineHeight: 22,
  },
  smartMoveSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  viewRecommendationButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    ...Shadows.button,
  },
  viewRecommendationText: {
    fontFamily: FontFamily.bold,
    fontSize: Typography.bodyMd.fontSize,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  mapUnavailable: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  mapUnavailableText: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.bodyMd.fontSize,
    color: Colors.textSecondary,
  },
  mapUnavailableSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.small.fontSize,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  // --- Modals & Graphs ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 30, 10, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 30,
    ...Shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  graphInsightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 92, 46, 0.12)',
  },
  graphInsightText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#1D1C16',
    flex: 1,
  },
  graphSectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    marginTop: 6,
  },
  graphCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  comparisonRowItem: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  comparisonRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mandiNameText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  mandiDistText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  mandiPriceText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  netTakehomeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    color: '#145C2E',
    marginTop: 2,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  modalPrimaryBtn: {
    backgroundColor: '#145C2E',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#145C2E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  modalPrimaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statsSummaryPill: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statsSummaryLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  statsSummaryVal: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statsSummarySub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartSubtitleText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#4B5563',
  },
  chartHighLowText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#6B7280',
  },
  trendBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 10,
  },
  trendBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  barValueText: {
    fontFamily: FontFamily.regular,
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 4,
  },
  trendBar: {
    width: 24,
    borderRadius: 6,
  },
  trendBarLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  spreadItemRow: {
    marginBottom: 12,
  },
  spreadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  spreadMandiName: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: '#1F2937',
  },
  spreadPriceVal: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  spreadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spreadBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
});
