import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius, FontFamily } from '../constants/theme';
import AnnapurnaLogo from '../components/AnnapurnaLogo';

const { width } = Dimensions.get('window');

// Premium spring easing curves
const easeOut = { tension: 75, friction: 10 };

export default function SplashScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(14)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(10)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance — logo spring + ring ripple
    Animated.sequence([
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          ...easeOut,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 55,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(ringScale, {
          toValue: 1.35,
          tension: 35,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.35,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Title entrance
    Animated.parallel([
      Animated.spring(titleFade, {
        toValue: 1,
        delay: 220,
        ...easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(titleSlide, {
        toValue: 0,
        delay: 220,
        ...easeOut,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtitle entrance
    Animated.parallel([
      Animated.spring(subtitleFade, {
        toValue: 1,
        delay: 420,
        ...easeOut,
        useNativeDriver: true,
      }),
      Animated.spring(subtitleSlide, {
        toValue: 0,
        delay: 420,
        ...easeOut,
        useNativeDriver: true,
      }),
    ]).start();

    // Ambient breathing glow loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    // Navigate to Main or Language after entrance animations complete
    const timer = setTimeout(async () => {
      let nextScreen = 'Language';
      try {
        const completed = await AsyncStorage.getItem('@language_onboarding_completed');
        if (completed === 'true') {
          nextScreen = 'Main';
        }
      } catch (e) {
        nextScreen = 'Main';
      }

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(titleFade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleFade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.replace(nextScreen);
      });
    }, 2300);

    return () => {
      clearTimeout(timer);
      glowLoop.stop();
    };
  }, [fadeAnim, scaleAnim, ringScale, ringOpacity, titleFade, titleSlide, subtitleFade, subtitleSlide, glowAnim, navigation]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.45],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3819" />

      {/* Radiant Glow Behind Logo */}
      <View style={styles.logoWrapper}>
        <Animated.View
          style={[
            styles.logoRing,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.glowAura,
            {
              opacity: glowOpacity,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />

        {/* Dedicated Annapurna Custom Logo Component */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <AnnapurnaLogo size={116} showGlow={true} />
        </Animated.View>
      </View>

      {/* Brand Title */}
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleFade,
            transform: [{ translateY: titleSlide }],
          },
        ]}
      >
        Annapurna
      </Animated.Text>

      {/* Brand Subtitle */}
      <Animated.Text
        style={[
          styles.subtitle,
          {
            opacity: subtitleFade,
            transform: [{ translateY: subtitleSlide }],
          },
        ]}
      >
        FreshGuard & Smart Mandi Marketplace
      </Animated.Text>

      {/* Tagline Badge */}
      <Animated.View
        style={[
          styles.badgeWrap,
          {
            opacity: subtitleFade,
            transform: [{ translateY: subtitleSlide }],
          },
        ]}
      >
        <Text style={styles.badgeText}>రైతు శ్రేయస్సు • పంట భద్రత</Text>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Autonomous Edge Vision & Proactive Routing</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B3819',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  glowAura: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#22C55E',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: Typography.body.fontSize,
    lineHeight: 22,
    color: '#A7F3D0',
    marginTop: 6,
    textAlign: 'center',
  },
  badgeWrap: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#FDE68A',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.4,
  },
});
