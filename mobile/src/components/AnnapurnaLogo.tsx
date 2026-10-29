import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Circle,
  G,
  Rect,
} from 'react-native-svg';

interface AnnapurnaLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'mark' | 'full';
  showGlow?: boolean;
}

/**
 * Annapurna Official Brand Mark
 *
 * Visual Concept:
 * - Golden grain spikelet (Abundance, Harvest, APMC Prosperity)
 * - Emerald bio-shield leaf (FreshGuard, Disease Protection, Vitality)
 * - Sunlit morning dewdrop core (Freshness, Shelf-Life Longevity)
 */
export default function AnnapurnaLogo({
  size = 64,
  style,
  variant = 'mark',
  showGlow = true,
}: AnnapurnaLogoProps) {
  const viewBoxSize = 120;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        <Defs>
          {/* Deep Forest Gradient */}
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#145C2E" />
            <Stop offset="100%" stopColor="#0B3819" />
          </LinearGradient>

          {/* Golden Harvest Gradient */}
          <LinearGradient id="goldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#D97706" />
            <Stop offset="50%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#FDE68A" />
          </LinearGradient>

          {/* Emerald Bio-Leaf Gradient */}
          <LinearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#15803D" />
            <Stop offset="50%" stopColor="#22C55E" />
            <Stop offset="100%" stopColor="#86EFAC" />
          </LinearGradient>

          {/* Dewdrop Radiance Gradient */}
          <RadialGradient id="dewdropGrad" cx="40%" cy="40%" r="60%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="60%" stopColor="#A7F3D0" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
          </RadialGradient>

          {/* Outer Sun Halo Glow */}
          <RadialGradient id="haloGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#F59E0B" stopOpacity={showGlow ? 0.35 : 0} />
            <Stop offset="70%" stopColor="#22C55E" stopOpacity={showGlow ? 0.15 : 0} />
            <Stop offset="100%" stopColor="#145C2E" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Ambient Halo */}
        {showGlow && (
          <Circle cx="60" cy="60" r="58" fill="url(#haloGlow)" />
        )}

        {/* Outer Circular Shield Base */}
        <Circle
          cx="60"
          cy="60"
          r="52"
          fill="url(#bgGrad)"
          stroke="#22C55E"
          strokeWidth="2.5"
          strokeOpacity="0.4"
        />

        {/* Subtle decorative inner border ring */}
        <Circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1"
          strokeOpacity="0.25"
          strokeDasharray="4 3"
        />

        {/* Golden Rising Grain / Wheat Spikelet (Right branch) */}
        <G transform="translate(6, 0)">
          {/* Stem arch */}
          <Path
            d="M 52 90 Q 56 65 64 36"
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Grain 1 - Top Tip */}
          <Path
            d="M 64 34 Q 68 31 66 26 Q 62 28 64 34 Z"
            fill="url(#goldGrad)"
          />

          {/* Grain 2 - Upper Right */}
          <Path
            d="M 64 39 Q 74 36 73 30 Q 64 34 64 39 Z"
            fill="url(#goldGrad)"
          />

          {/* Grain 3 - Upper Left */}
          <Path
            d="M 62 44 Q 54 40 54 34 Q 61 39 62 44 Z"
            fill="url(#goldGrad)"
          />

          {/* Grain 4 - Mid Right */}
          <Path
            d="M 62 50 Q 73 47 72 40 Q 62 44 62 50 Z"
            fill="url(#goldGrad)"
          />

          {/* Grain 5 - Mid Left */}
          <Path
            d="M 59 55 Q 49 51 50 44 Q 58 49 59 55 Z"
            fill="url(#goldGrad)"
          />

          {/* Grain 6 - Lower Right */}
          <Path
            d="M 58 62 Q 70 59 69 52 Q 58 56 58 62 Z"
            fill="url(#goldGrad)"
          />

          {/* Grain 7 - Lower Left */}
          <Path
            d="M 56 68 Q 45 64 47 57 Q 55 62 56 68 Z"
            fill="url(#goldGrad)"
          />
        </G>

        {/* Emerald Bio-Leaf (Left branch protecting the grain) */}
        <Path
          d="M 32 82 C 26 62 34 38 52 30 C 50 48 42 66 50 78 C 45 81 38 82 32 82 Z"
          fill="url(#leafGrad)"
        />

        {/* Leaf Internal Rib/Vein */}
        <Path
          d="M 36 78 Q 42 58 50 34"
          fill="none"
          stroke="#86EFAC"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />

        {/* Leaf Lateral Veins */}
        <Path
          d="M 40 66 Q 46 62 49 61"
          fill="none"
          stroke="#86EFAC"
          strokeWidth="1"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        <Path
          d="M 42 54 Q 48 50 51 49"
          fill="none"
          stroke="#86EFAC"
          strokeWidth="1"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />

        {/* Central Freshness Dewdrop */}
        <Circle
          cx="48"
          cy="75"
          r="6.5"
          fill="url(#dewdropGrad)"
        />

        {/* Dewdrop Specular Highlight */}
        <Circle
          cx="46.5"
          cy="73"
          r="2"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({});
