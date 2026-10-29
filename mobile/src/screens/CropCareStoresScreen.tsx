import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontFamily, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import LeafletMap, { MapMarker } from '../components/LeafletMap';
import { useLanguage } from '../context/LanguageContext';
import { FadeInUp } from '../components/Animations';
import CropCareDealersView from '../components/CropCareDealersView';
import { CROP_CARE_STORES_DATA, CropCareStore } from '../data/cropCareStoresData';

export default function CropCareStoresScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [selectedStoreId, setSelectedStoreId] = useState<string>('store_1');
  const [isMapVisible, setIsMapVisible] = useState(true);

  // Map markers from store locations
  const mapMarkers: MapMarker[] = CROP_CARE_STORES_DATA.map((store) => ({
    id: store.id,
    latitude: store.latitude,
    longitude: store.longitude,
    title: store.name,
    subtitle: `⭐ ${store.rating} • ${store.distanceKm} km • ${store.products.length} products`,
    color: store.id === selectedStoreId ? '#145C2E' : '#4A803D',
    icon: '🧪',
  }));

  const activeStore = CROP_CARE_STORES_DATA.find((s) => s.id === selectedStoreId) || CROP_CARE_STORES_DATA[0];

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'Verified Agri-Care Stores',
        message: 'Find verified pesticide and fertilizer dealers near Madanapalle & APMC yards on Annapurna App.',
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('crop_care_stores', 'Agri-Care & Input Stores')}</Text>
          <Text style={styles.headerSubtitle}>Verified Fertilizers & Pesticides • Madanapalle</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          activeOpacity={0.7}
          onPress={handleShareApp}
        >
          <MaterialIcons name="share" size={20} color={Colors.primaryDeep} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Interactive Map */}
        {isMapVisible && (
          <FadeInUp delay={50} duration={400}>
            <View style={styles.mapCard}>
              <View style={styles.mapHeaderRow}>
                <View style={styles.mapTitleGroup}>
                  <MaterialIcons name="pin-drop" size={20} color={Colors.primaryDeep} />
                  <Text style={styles.mapTitle}>Live Store Locations & Radius</Text>
                </View>
                <View style={styles.storeCountBadge}>
                  <Text style={styles.storeCountText}>{CROP_CARE_STORES_DATA.length} Stores</Text>
                </View>
              </View>

              <LeafletMap
                latitude={activeStore ? activeStore.latitude : 13.5562}
                longitude={activeStore ? activeStore.longitude : 78.5028}
                zoom={11}
                markers={mapMarkers}
                height={210}
                onMarkerPress={(id) => setSelectedStoreId(id)}
              />

              <Text style={styles.mapHintText}>
                💡 Tap any marker on the map to view instant stock and prices.
              </Text>
            </View>
          </FadeInUp>
        )}

        {/* Professional Dealers Component */}
        <CropCareDealersView
          selectedStoreId={selectedStoreId}
          onSelectStore={(st) => setSelectedStoreId(st.id)}
          showMapToggle={true}
          isMapVisible={isMapVisible}
          onToggleMap={() => setIsMapVisible(!isMapVisible)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dividerLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: Typography.h4.fontSize,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sm,
    paddingBottom: 130,
    gap: Spacing.md,
  },
  mapCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    ...Shadows.card,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mapTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mapTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
  },
  storeCountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.chip,
  },
  storeCountText: {
    fontFamily: FontFamily.medium,
    fontSize: Typography.caption.fontSize,
    color: '#15803D',
  },
  mapHintText: {
    fontFamily: FontFamily.regular,
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
