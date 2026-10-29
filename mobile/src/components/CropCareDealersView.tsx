import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Colors, FontFamily, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { FadeInUp } from './Animations';
import { CROP_CARE_STORES_DATA, CropCareStore, PesticideProduct } from '../data/cropCareStoresData';

interface Props {
  onSelectStore?: (store: CropCareStore) => void;
  selectedStoreId?: string;
  searchQuery?: string;
  showMapToggle?: boolean;
  onToggleMap?: () => void;
  isMapVisible?: boolean;
}

type CategoryFilter = 'All' | 'Insecticide' | 'Fungicide' | 'Fertilizer' | 'Bio-Control';

export default function CropCareDealersView({
  onSelectStore,
  selectedStoreId,
  showMapToggle = false,
  onToggleMap,
  isMapVisible = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>('store_1');

  const filteredStores = useMemo(() => {
    return CROP_CARE_STORES_DATA.map((store) => {
      // Filter products within store by category and search
      const matchingProducts = store.products.filter((p) => {
        const matchesCategory =
          selectedCategory === 'All' ||
          (selectedCategory === 'Fertilizer'
            ? p.category.includes('Fertilizer') || p.category.includes('NPK')
            : p.category.toLowerCase().includes(selectedCategory.toLowerCase()));

        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          p.name.toLowerCase().includes(query) ||
          p.targetIssue.toLowerCase().includes(query) ||
          store.name.toLowerCase().includes(query) ||
          store.district.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
      });

      return {
        ...store,
        displayProducts: matchingProducts,
      };
    }).filter((s) => s.displayProducts.length > 0 || !search.trim());
  }, [search, selectedCategory]);

  const handleCallDealer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string, storeName: string, productName?: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      productName
        ? `Namaste! I saw ${productName} available at ${storeName} on Annapurna Farmer App. Is it in stock today?`
        : `Namaste! I am contacting you from Annapurna Farmer App regarding crop care supplies at ${storeName}.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
  };

  const handleDirections = (googleMapsUrl: string) => {
    Linking.openURL(googleMapsUrl);
  };

  const handleShare = async (store: CropCareStore) => {
    try {
      await Share.share({
        title: store.name,
        message: `🌾 ${store.name} (${store.dealerType})\n📍 ${store.address}\n📞 Call: ${store.phone}\nVerified on Annapurna Farmer App`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const getCategoryColor = (cat: string) => {
    if (cat.includes('Insecticide')) return { bg: '#F3E8FF', text: '#7E22CE', border: '#D8B4FE' };
    if (cat.includes('Fungicide')) return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' };
    if (cat.includes('Fertilizer') || cat.includes('NPK')) return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
    return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
  };

  return (
    <View style={styles.container}>
      {/* Search & Map Bar */}
      <View style={styles.topControlRow}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pesticides, fertilizers, dealers..."
            placeholderTextColor={Colors.textPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {showMapToggle && (
          <TouchableOpacity
            style={[styles.mapToggleBtn, isMapVisible && styles.mapToggleBtnActive]}
            onPress={onToggleMap}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={isMapVisible ? 'list' : 'map'}
              size={18}
              color={isMapVisible ? '#FFFFFF' : Colors.primaryDark}
            />
            <Text style={[styles.mapToggleText, isMapVisible && styles.mapToggleTextActive]}>
              {isMapVisible ? 'List' : 'Map'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Category Chips */}
      <View style={styles.categoryChipsRow}>
        {(['All', 'Insecticide', 'Fungicide', 'Fertilizer', 'Bio-Control'] as CategoryFilter[]).map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {cat === 'All' ? 'All Inputs' : cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Verified Guarantee Banner */}
      <View style={styles.guaranteeBanner}>
        <View style={styles.guaranteeIcon}>
          <MaterialIcons name="verified-user" size={18} color="#15803D" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.guaranteeTitle}>100% Certified Genuine Agri-Inputs</Text>
          <Text style={styles.guaranteeSub}>
            Licensed dealers verified by Dept. of Agriculture • IFFCO, Syngenta, Bayer authorized
          </Text>
        </View>
      </View>

      {/* Dealer Cards */}
      <View style={styles.dealersList}>
        <Text style={styles.dealersCountHeader}>
          Nearby Licensed Agri-Stores ({filteredStores.length})
        </Text>

        {filteredStores.map((store, index) => {
          const isExpanded = expandedStoreId === store.id;
          const isSelected = selectedStoreId === store.id;

          return (
            <FadeInUp key={store.id} delay={100 + index * 50} duration={400}>
              <View
                style={[
                  styles.dealerCard,
                  isSelected && styles.dealerCardSelected,
                ]}
              >
                {/* Store Header */}
                <TouchableOpacity
                  style={styles.dealerHeader}
                  activeOpacity={0.8}
                  onPress={() => {
                    setExpandedStoreId(isExpanded ? null : store.id);
                    onSelectStore?.(store);
                  }}
                >
                  <View style={styles.storeLogoBadge}>
                    <MaterialCommunityIcons name="storefront" size={24} color="#145C2E" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.storeNameRow}>
                      <Text style={styles.storeName} numberOfLines={1}>
                        {store.name}
                      </Text>
                      {store.isGovtLicensed && (
                        <View style={styles.verifiedPill}>
                          <MaterialIcons name="verified" size={13} color="#15803D" />
                          <Text style={styles.verifiedPillText}>Licensed</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.storeDealerType} numberOfLines={1}>
                      {store.dealerType}
                    </Text>

                    <View style={styles.storeMetaRow}>
                      <View style={styles.distBadge}>
                        <MaterialIcons name="navigation" size={12} color="#15803D" />
                        <Text style={styles.distBadgeText}>{store.distanceKm} km</Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <MaterialIcons name="star" size={13} color="#D97706" />
                        <Text style={styles.ratingBadgeText}>{store.rating} ({store.reviewsCount})</Text>
                      </View>
                      <View
                        style={[
                          styles.openStatusPill,
                          { backgroundColor: store.isOpen ? '#DCFCE7' : '#FEE2E2' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.openStatusText,
                            { color: store.isOpen ? '#15803D' : '#B91C1C' },
                          ]}
                        >
                          {store.isOpen ? '● Open Now' : '● Closed'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Address Snippet */}
                <View style={styles.addressBar}>
                  <MaterialIcons name="location-on" size={14} color={Colors.textMuted} />
                  <Text style={styles.addressBarText} numberOfLines={1}>
                    {store.address}
                  </Text>
                </View>

                {/* Products Catalog - Always visible or expanded */}
                <View style={styles.productsContainer}>
                  <View style={styles.productsHeaderRow}>
                    <Text style={styles.productsSectionTitle}>
                      In-Stock Pesticides & Fertilizers ({store.displayProducts.length}):
                    </Text>
                  </View>

                  <View style={{ gap: 8 }}>
                    {(isExpanded
                      ? store.displayProducts
                      : store.displayProducts.slice(0, 2)
                    ).map((prod, pIdx) => {
                      const colors = getCategoryColor(prod.category);
                      return (
                        <View key={pIdx} style={styles.productTile}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <View
                                style={[
                                  styles.catBadge,
                                  { backgroundColor: colors.bg, borderColor: colors.border },
                                ]}
                              >
                                <Text style={[styles.catBadgeText, { color: colors.text }]}>
                                  {prod.category}
                                </Text>
                              </View>
                              <View style={styles.inStockPill}>
                                <Text style={styles.inStockText}>✓ In Stock</Text>
                              </View>
                            </View>

                            <Text style={styles.prodName}>{prod.name}</Text>
                            <Text style={styles.prodTarget}>
                              <Text style={{ fontWeight: '600' }}>Target: </Text>
                              {prod.targetIssue}
                            </Text>
                          </View>

                          <View style={styles.prodPriceCol}>
                            <Text style={styles.prodPrice}>{prod.price}</Text>
                            <Text style={styles.prodPack}>{prod.packSize}</Text>
                            <TouchableOpacity
                              style={styles.askProdBtn}
                              onPress={() => handleWhatsApp(store.phone, store.name, prod.name)}
                              activeOpacity={0.7}
                            >
                              <FontAwesome5 name="whatsapp" size={12} color="#15803D" />
                              <Text style={styles.askProdText}>Inquire</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {!isExpanded && store.displayProducts.length > 2 && (
                    <TouchableOpacity
                      style={styles.showMoreBtn}
                      onPress={() => setExpandedStoreId(store.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.showMoreText}>
                        + {store.displayProducts.length - 2} more items available
                      </Text>
                      <MaterialIcons name="expand-more" size={16} color={Colors.primaryDeep} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Professional Action Toolbar */}
                <View style={styles.actionToolbar}>
                  <TouchableOpacity
                    style={styles.callActionButton}
                    onPress={() => handleCallDealer(store.phone)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="phone" size={16} color="#FFFFFF" />
                    <Text style={styles.callActionText}>Call Dealer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.whatsappActionButton}
                    onPress={() => handleWhatsApp(store.phone, store.name)}
                    activeOpacity={0.8}
                  >
                    <FontAwesome5 name="whatsapp" size={16} color="#FFFFFF" />
                    <Text style={styles.whatsappActionText}>WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mapsActionButton}
                    onPress={() => handleDirections(store.googleMapsUrl)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="directions" size={16} color={Colors.primaryDark} />
                    <Text style={styles.mapsActionText}>Directions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareIconButton}
                    onPress={() => handleShare(store)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="share" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </FadeInUp>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  mapToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  mapToggleBtnActive: {
    backgroundColor: Colors.primaryDark,
  },
  mapToggleText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.primaryDark,
  },
  mapToggleTextActive: {
    color: '#FFFFFF',
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.chip,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#145C2E',
    borderColor: '#145C2E',
  },
  filterChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  guaranteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: BorderRadius.card,
    padding: 12,
    marginBottom: 16,
  },
  guaranteeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guaranteeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#14532D',
  },
  guaranteeSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  dealersList: {
    gap: 14,
  },
  dealersCountHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  dealerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    ...Shadows.card,
  },
  dealerCardSelected: {
    borderColor: '#145C2E',
    borderWidth: 2,
  },
  dealerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storeLogoBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  storeName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedPillText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
    color: '#15803D',
  },
  storeDealerType: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  storeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#0F172A',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#92400E',
  },
  openStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openStatusText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addressBarText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  productsContainer: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productsHeaderRow: {
    marginBottom: 6,
  },
  productsSectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: '#334155',
  },
  productTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  catBadgeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
  },
  inStockPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inStockText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: '#15803D',
  },
  prodName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  prodTarget: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  prodPriceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  prodPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#15803D',
  },
  prodPack: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  askProdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  askProdText: {
    fontFamily: FontFamily.semibold,
    fontSize: 10,
    color: '#15803D',
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  showMoreText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.primaryDeep,
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  callActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: BorderRadius.button,
    backgroundColor: '#145C2E',
  },
  callActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  whatsappActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: BorderRadius.button,
    backgroundColor: '#25D366',
  },
  whatsappActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  mapsActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.button,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapsActionText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    color: Colors.primaryDark,
  },
  shareIconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.button,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
