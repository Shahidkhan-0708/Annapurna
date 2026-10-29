/**
 * Annapurna Design System — Formal Token System
 * 
 * Soft Premium Glassmorphism Design Language
 * 
 * Based on the UI/UX design review (iPhone 393×852 viewport).
 * Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48
 * Radius scale:  12 / 16 / 24 / 28 / 32
 * Type scale:    14 / 16 / 18 / 24 / 28 / 32
 * Weights:       400 / 500 / 600 / 700
 * 
 * Color Philosophy: Soft green with warm yellow undertone
 * - Fresh leaves under warm sunlight
 * - Young crops, soft lime-green, muted yellow-green
 * - Light olive-lime accents
 * - Avoid: Dark forest green, blue-green, neon green, highly saturated lime
 */

// ============================================================================
// COLORS — Soft Green Agricultural Palette (Semantic)
// ============================================================================
export const Colors = {
  // Brand — Soft green with warm yellow undertone (agricultural, fresh, modern)
  primary: '#6BA35A',        // Main brand — soft leaf green
  primaryLight: '#8FC07E',   // Lighter variant for hover/active states
  primarySoft: '#A8D5A0',    // Very soft — backgrounds, subtle fills
  primaryMuted: '#7DB86E',   // Muted — secondary actions
  primaryDeep: '#4A803D',    // Deep — headings, key actions (darker but still soft)

  // Backgrounds & Surfaces — Warm off-white base
  background: '#FAF9F5',     // Warm off-white — screen background
  surface: '#FFFFFF',        // Pure white — solid cards
  surfaceGlass1: 'rgba(255, 255, 255, 0.75)',   // Glass Level 1 — main cards
  surfaceGlass2: 'rgba(255, 255, 255, 0.85)',   // Glass Level 2 — elevated
  surfaceGlass3: 'rgba(255, 255, 255, 0.55)',   // Glass Level 3 — subtle
  surfaceAlt: '#F5F3ED',     // Warm cream — icon circles, subtle fills
  surfaceElevated: '#FFFFFF', // Elevated surfaces (modals, sheets)

  // Dividers & Borders — Very low contrast
  divider: '#E8E5DD',        // Subtle divider
  dividerLight: '#F0EDE6',   // Very light divider
  borderGlass: 'rgba(107, 163, 90, 0.12)',      // Glass border — primary tinted
  borderGlassStrong: 'rgba(107, 163, 90, 0.20)', // Stronger glass border

  // Text — High readability
  textPrimary: '#1A1A18',    // Near-black — headings, card titles
  textSecondary: '#4A4F48',  // Dark grey — body text, metadata
  textMuted: '#8A8F87',      // Medium grey — captions, tertiary info
  textOnPrimary: '#FFFFFF',  // White — text on primary buttons
  textOnGlass: '#2D3A28',    // Dark green — text on glass surfaces
  textPlaceholder: '#A8ADA5', // Input placeholders

  // Status / Semantic — Muted but clear
  success: '#4E9B42',        // Healthy — softer green
  successBg: '#E8F4E6',      // Light success background
  successLight: '#8FD97A',   // Bright success — progress bars, accents
  warning: '#E8A317',        // Amber — warnings, alerts
  warningBg: '#FEF9E7',      // Light amber background
  warningIcon: '#F0A500',    // Warning icons
  error: '#D14343',          // Red — errors (softer)
  errorBg: '#FEF0F0',        // Light error background
  info: '#3A8FD8',           // Blue — informational
  infoBg: '#EBF5FC',         // Light blue background

  // Glass-specific shadows
  shadowGlass1: 'rgba(45, 58, 40, 0.06)',   // Level 1 — subtle
  shadowGlass2: 'rgba(45, 58, 40, 0.10)',   // Level 2 — elevated
  shadowGlass3: 'rgba(45, 58, 40, 0.14)',   // Level 3 — dialogs
  shadowGlassStrong: 'rgba(45, 58, 40, 0.18)', // Strong — modals

  // Highlight / inner glow for glass
  highlightGlass: 'rgba(255, 255, 255, 0.4)', // Top edge highlight

  // Badge / Chip (updated for new palette)
  chipGreen: '#B1CEB4',      // Stable badge background
  chipGreenDark: '#334C39',  // Stable badge text
  chipGreenBright: '#78DB8C', // Good option badge
  chipGreenText: '#005323',  // Good option badge text
  chipGreenLight: '#A4C1A8', // Support button background

  // Legacy aliases for backward compatibility during migration
  primaryDark: '#4A803D',    // Maps to primaryDeep
  secondary: '#7DB86E',      // Maps to primaryMuted
  textOnDark: '#2D3A28',     // Maps to textOnGlass
} as const;

// ============================================================================
// SPACING — 8px-based scale: 4, 8, 12, 16, 20, 24, 32, 40, 48
// Rule: related things = smaller gap, different sections = larger gap
// ============================================================================
export const Spacing = {
  /** 4px — tight inline gaps (dot + label, icon + text) */
  xxs: 4,
  /** 8px — small element gaps, internal chip padding */
  xs: 8,
  /** 12px — action card gaps, list item gaps */
  sm: 12,
  /** 16px — normal card padding (small), internal content gaps */
  md: 16,
  /** 20px — screen horizontal padding, normal card padding */
  lg: 20,
  /** 24px — large card padding, section gaps between related sections */
  xl: 24,
  /** 32px — major section gaps (different sections), large internal gaps */
  xxl: 32,
  /** 40px — reserved for major visual breaks */
  xxxl: 40,
  /** 48px — rare, only for intentional large whitespace */
  huge: 48,

  // Named layout tokens
  screenPadding: 20, // Outer horizontal padding for all screens
  cardPadding: 24, // Standard card internal padding
  cardPaddingSm: 20, // Smaller card padding (weather, crop card)
  cardPaddingLg: 28, // Larger card padding (feature cards)
  sectionGap: 24, // Gap between related content sections
  majorSectionGap: 32, // Gap between different major sections
  headerPadding: 16, // Vertical padding inside the top bar
} as const;

// ============================================================================
// BORDER RADIUS — Consistent scale: 12 / 16 / 24 / 28 / 32
// ============================================================================
export const BorderRadius = {
  /** 8px — chips, badges, small elements */
  xs: 8,
  /** 12px — small components (badges, pills, small chips) */
  sm: 12,
  /** 16px — buttons, alerts, activity cards, inputs */
  md: 16,
  /** 20px — standard cards (most common) */
  lg: 20,
  /** 24px — large cards, prominent buttons */
  xl: 24,
  /** 28px — large containers, sheets, modals */
  xxl: 28,
  /** 32px — large containers, full-screen modals */
  xxxl: 32,
  /** 9999 — fully rounded (avatar circles, pill shapes) */
  full: 9999,

  /** Semantic aliases */

  card: 20,

  chip: 8,

  button: 16,

} as const;

// ============================================================================
// TYPOGRAPHY — Formal type scale with weights
// ============================================================================
import { Platform } from 'react-native';

const FONT = 'PlusJakartaSans';
const TELUGU_FALLBACK = "'Noto Sans Telugu', 'Kohinoor Telugu', 'Telugu Sangam MN', sans-serif";

export const FontFamily = {
  regular: Platform.select({ web: `${FONT}_400Regular, ${TELUGU_FALLBACK}`, default: `${FONT}_400Regular` }),
  medium: Platform.select({ web: `${FONT}_500Medium, ${TELUGU_FALLBACK}`, default: `${FONT}_500Medium` }),
  semibold: Platform.select({ web: `${FONT}_600SemiBold, ${TELUGU_FALLBACK}`, default: `${FONT}_600SemiBold` }),
  bold: Platform.select({ web: `${FONT}_700Bold, ${TELUGU_FALLBACK}`, default: `${FONT}_700Bold` }),
} as const;

export const Typography = {
  fontFamily: FONT,

  // --- Display / Hero ---
  /** 32px/700 — app logo, hero metrics */

  // --- Headings ---
  /** 28px/600 — greeting, large card titles */
  h1: {
    fontFamily: FontFamily.semibold,
    fontSize: 28,
    lineHeight: 34,
  },
  /** 24px/700 — section headings, weather temp */
  h2: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  /** 22px/600 — card titles, market section headers */
  h3: {
    fontFamily: FontFamily.semibold,
    fontSize: 22,
    lineHeight: 28,
  },
  /** 20px/600 — header titles, card headings */
  h4: {
    fontFamily: FontFamily.semibold,
    fontSize: 20,
    lineHeight: 26,
  },
  /** 18px/600 — emphasized body, metric values */
  h5: {
    fontFamily: FontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
  },

  // --- Body ---
  /** 18px/600 — emphasized body, metric values */
  bodyLg: {
    fontFamily: FontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  /** 16px/400 — standard body text */
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  /** 16px/600 — button labels, action card titles */
  bodyBold: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
  /** 15px/400 — body text (secondary), alert text */
  bodyMd: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  /** 15px/600 — crop titles, metric values, activity text */
  bodyMdBold: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    lineHeight: 22,
  },

  // --- Small ---
  /** 14px/400 — secondary text, descriptions */
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  /** 14px/600 — indicator labels, badge text */
  captionBold: {
    fontFamily: FontFamily.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  /** 13px/400 — metadata, location, timestamps */
  small: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },

  // --- Label / Badge ---
  /** 12px/700 — badge text, forecast labels, action labels */
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
  },
  /** 11px/700 — uppercase badges (GOOD OPTION, STABLE) */
  labelSm: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
  },

  // --- Legacy compatibility (kept for gradual migration) ---
  display: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.02,
  },
  headlineLg: {
    fontFamily: FontFamily.semibold,
    fontSize: 28,
    lineHeight: 34,
  },
  headlineMd: {
    fontFamily: FontFamily.semibold,
    fontSize: 24,
    lineHeight: 30,
  },
  bodySm: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  labelMd: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.05,
    textTransform: 'uppercase' as const,
  },
  labelSmOld: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
  },
  button: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    lineHeight: 22,
  },
} as const;

// ============================================================================
// SHADOWS — Glass-appropriate elevations
// ============================================================================
export const Shadows = {
  sm: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  /** Standard card shadow — subtle elevation */
  card: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  /** Elevated card — more depth */
  cardElevated: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
  },
  /** Header shadow — very subtle top bar lift */
  header: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  /** Glass Level 1 — subtle cards */
  glass1: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  /** Glass Level 2 — elevated cards, dialogs */
  glass2: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  /** Glass Level 3 — modals, sheets */
  glass3: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 12,
  },
  /** Modal / Bottom sheet — strong elevation */
  modal: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 32 },
    shadowOpacity: 0.12,
    shadowRadius: 48,
    elevation: 16,
  },
  /** Interactive element — slightly stronger for buttons */
  button: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  /** Button pressed state */
  buttonPressed: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  /** Nav / Tab bar */
  nav: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 8,
  },
  /** Interactive element — slightly stronger for buttons */
  banner: {
    shadowColor: '#2D3A28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

// ============================================================================
// GLASS LEVELS — Three-tier glass system for consistent depth
// ============================================================================
export const GlassLevels = {
  // Level 1 — Main cards, panels (subtle, readable content)
  level1: {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropBlur: 20,
    backdropSaturate: 120,
    borderColor: 'rgba(107, 163, 90, 0.12)',
    borderWidth: 1,
    borderRadius: 20,
    shadow: {
      shadowColor: '#2D3A28',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 4,
    },
    innerHighlight: true,
  },

  // Level 2 — Elevated cards, dialogs, important widgets
  level2: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropBlur: 24,
    backdropSaturate: 130,
    borderColor: 'rgba(107, 163, 90, 0.20)',
    borderWidth: 1,
    borderRadius: 24,
    shadow: {
      shadowColor: '#2D3A28',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.08,
      shadowRadius: 32,
      elevation: 8,
    },
    innerHighlight: true,
  },

  // Level 3 — Modals, bottom sheets, high elevation
  level3: {
    background: 'rgba(255, 255, 255, 0.92)',
    backdropBlur: 28,
    backdropSaturate: 140,
    borderColor: 'rgba(107, 163, 90, 0.20)',
    borderWidth: 1,
    borderRadius: 28,
    shadow: {
      shadowColor: '#2D3A28',
      shadowOffset: { width: 0, height: 32 },
      shadowOpacity: 0.12,
      shadowRadius: 48,
      elevation: 16,
    },
    innerHighlight: true,
  },

  // Navigation / Tab bar specific
  navigation: {
    background: 'rgba(255, 255, 255, 0.88)',
    backdropBlur: 20,
    backdropSaturate: 120,
    borderTopColor: '#F0EDE6',
    borderTopWidth: 0.5,
    shadow: {
      shadowColor: '#2D3A28',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
      elevation: 8,
    },
  },

  // Modal / Bottom sheet
  modal: {
    background: 'rgba(255, 255, 255, 0.92)',
    backdropBlur: 28,
    backdropSaturate: 140,
    borderColor: 'rgba(107, 163, 90, 0.20)',
    borderWidth: 1,
    borderRadius: 28,
    shadow: {
      shadowColor: '#2D3A28',
      shadowOffset: { width: 0, height: 32 },
      shadowOpacity: 0.12,
      shadowRadius: 48,
      elevation: 16,
    },
    innerHighlight: true,
  },
} as const;

// ============================================================================
// OPACITY / OVERLAY
// ============================================================================
export const Opacity = {
  overlay: 0.35,        // Modal overlay
  overlayLight: 0.2,    // Light overlay
  disabled: 0.5,        // Disabled elements
  hover: 0.08,          // Hover state
  pressed: 0.12,        // Pressed state
  focus: 0.15,          // Focus ring
} as const;

// ============================================================================
// TRANSITION / MOTION — Gentle, premium timing
// ============================================================================
export const Motion = {
  // Durations
  duration: {
    micro: 120,      // Tiny feedback
    fast: 180,       // Button press, toggle
    standard: 250,   // Card entrance, transitions
    moderate: 350,   // Panel transitions
    slow: 450,       // Modal/sheet entrance
    slower: 550,     // Page transitions
    slowest: 700,    // Major transitions
  },

  // Easing curves — Gentle deceleration
  easing: {
    standard: 'cubic-bezier(0.22, 1, 0.36, 1)',      // Main ease-out
    entrance: 'cubic-bezier(0.2, 0.9, 0.2, 1)',      // Entrances
    exit: 'cubic-bezier(0.4, 0, 0.6, 1)',            // Exits
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',     // Spring-like
    gentle: 'cubic-bezier(0.25, 0.9, 0.3, 0.99)',    // Gentle settle
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',           // Sharp exit
  },

  // Stagger
  stagger: {
    delay: 40,
    maxDelay: 200,
  },
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================
export const ZIndex = {
  base: 0,
  content: 10,
  sticky: 50,
  dropdown: 100,
  stickyHeader: 200,
  modal: 300,
  modalBackdrop: 290,
  toast: 400,
  tooltip: 500,
} as const;

// ============================================================================
// GLASS HELPER FUNCTIONS
// ============================================================================
export const GlassHelpers = {
  // Create a glass style object for a given level
  createStyle: (level: keyof typeof GlassLevels) => {
    const config = GlassLevels[level];
    return {
      backgroundColor: config.background,
      borderWidth: 'borderWidth' in config ? config.borderWidth : 0,
      borderColor: 'borderColor' in config ? config.borderColor : 'transparent',
      borderRadius: 'borderRadius' in config ? config.borderRadius : 0,
      ...config.shadow,
    };
  },

  // Get backdrop filter style (for web)
  getBackdropFilter: (level: keyof typeof GlassLevels) => {
    const config = GlassLevels[level];
    return {
      backdropFilter: `blur(${config.backdropBlur}px) saturate(${config.backdropSaturate}%)`,
      WebkitBackdropFilter: `blur(${config.backdropBlur}px) saturate(${config.backdropSaturate}%)`,
    };
  },
} as const;

// ============================================================================
// RE-EXPORT GLASS TOKENS (for backward compatibility with Glass.tsx)
// ============================================================================
export {
  GlassColors,
  GlassSpacing,
  GlassBorderRadius,
  GlassTypography,
  GlassShadows,
  GlassMotion,
  GlassOpacity,
  GlassZIndex,
  GlassSizes,
  createGlassStyle,
  getBackdropFilter,
  GlassTokens,
} from './glassTheme';
