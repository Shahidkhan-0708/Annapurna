/**
 * PwaInstallModal — Progressive Web App Install & Download Prompt
 *
 * Designed to strictly match the Annapurna design system:
 * - Soft green agricultural palette (#00431D, #1A4122, #6BA35A)
 * - Warm cream backgrounds (#FEF9F0, #F8F3EA)
 * - Plus Jakarta Sans typography
 * - Pill buttons (radius 28px) & card radius (28px)
 * - Subtle dividers (#E7E2D9) and soft modal shadows
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontFamily, Shadows, BorderRadius, Spacing } from '../constants/theme';
import { hapticMedium, hapticSuccess } from '../utils/haptics';

interface PwaInstallModalProps {
  delayMs?: number; // Delay after logo display (defaults to 2400ms)
}

export default function PwaInstallModal({ delayMs = 2400 }: PwaInstallModalProps) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // 1. Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    // 3. Capture beforeinstallprompt event (Chrome, Edge, Samsung Internet, Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      setVisible(false);
      setIsInstalled(true);
    });

    // 4. Trigger popup right after the splash screen logo entrance has finished
    const timer = setTimeout(() => {
      setVisible(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    }, delayMs);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [delayMs]);

  const handleInstallClick = async () => {
    hapticSuccess();

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        setVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosInstructions(true);
    } else {
      alert(
        'To install Annapurna:\nClick the Install icon (⊕) on the right side of your browser address bar, or choose "Install Annapurna" from your browser menu.'
      );
    }
  };

  const handleDismiss = () => {
    hapticMedium();
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  if (!visible || isInstalled) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Top Row: App Badge & Close Button */}
          <View style={styles.topRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeEmoji}>🌾</Text>
              <Text style={styles.badgeText}>ANNAPURNA APP</Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close install popup"
            >
              <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Logo & Headline */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🌾</Text>
            </View>

            <Text style={styles.title}>Install Annapurna App</Text>
            <Text style={styles.subtitle}>
              Add Annapurna FreshGuard to your device for instant launch, zero lag, and full offline field support.
            </Text>
          </View>

          {/* Nested Value Container (matches app's surfaceAlt card pattern) */}
          <View style={styles.featureBox}>
            <View style={styles.featureRow}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#E8F4E6' }]}>
                <MaterialCommunityIcons name="home-variant-outline" size={17} color={Colors.primaryDark} />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={styles.featureTitle}>Home Screen Access</Text>
                <Text style={styles.featureDesc}>Launch with 1 tap without opening browser tabs.</Text>
              </View>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.featureRow}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="wifi-off" size={17} color={Colors.primary} />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={styles.featureTitle}>100% Offline Mode</Text>
                <Text style={styles.featureDesc}>View batches & evaluate produce decay in remote fields.</Text>
              </View>
            </View>

            <View style={styles.featureDivider} />

            <View style={styles.featureRow}>
              <View style={[styles.featureIconCircle, { backgroundColor: '#FEF9E7' }]}>
                <MaterialCommunityIcons name="chart-line" size={17} color={Colors.warning} />
              </View>
              <View style={styles.featureTextWrapper}>
                <Text style={styles.featureTitle}>APMC Mandi Radar</Text>
                <Text style={styles.featureDesc}>Real-time price arbitrage & Plan-B salvage rerouting.</Text>
              </View>
            </View>
          </View>

          {/* iOS Safari Installation Steps */}
          {showIosInstructions && (
            <View style={styles.iosGuidanceBox}>
              <View style={styles.iosHeaderRow}>
                <MaterialCommunityIcons name="apple" size={16} color={Colors.warningIcon} />
                <Text style={styles.iosTitle}>Installing on iPhone / iPad:</Text>
              </View>
              <Text style={styles.iosStep}>1. Tap the <Text style={{ fontWeight: '700' }}>Share</Text> icon (⎋) at the bottom of Safari.</Text>
              <Text style={styles.iosStep}>2. Scroll down and tap <Text style={{ fontWeight: '700' }}>"Add to Home Screen"</Text> (⊞).</Text>
              <Text style={styles.iosStep}>3. Tap <Text style={{ fontWeight: '700' }}>"Add"</Text> in the top right corner.</Text>
            </View>
          )}

          {/* Action CTAs */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.installButton}
              onPress={handleInstallClick}
              activeOpacity={0.88}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="download" size={19} color={Colors.textOnPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.installButtonText}>
                {isIos && !deferredPrompt ? 'Add to Home Screen' : 'Download / Install App'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.75}
              accessibilityRole="button"
            >
              <Text style={styles.dismissButtonText}>Continue in Browser</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 30, 15, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    zIndex: 99999,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: 22,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    ...Shadows.modal,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.chip,
    gap: 5,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    color: Colors.textOnDark,
    letterSpacing: 0.6,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 30,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.primaryDark,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  featureBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDivider: {
    height: 1,
    backgroundColor: Colors.dividerLight,
    marginVertical: 10,
  },
  featureIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 1,
    lineHeight: 15,
  },
  iosGuidanceBox: {
    backgroundColor: Colors.warningBg,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: BorderRadius.card,
    padding: 12,
    marginBottom: 16,
  },
  iosHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iosTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.warningIcon,
  },
  iosStep: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  actionContainer: {
    gap: 10,
  },
  installButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    paddingVertical: 14,
    borderRadius: BorderRadius.button,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  installButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textOnPrimary,
    letterSpacing: -0.2,
  },
  dismissButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissButtonText: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
