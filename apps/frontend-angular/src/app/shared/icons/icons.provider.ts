import { provideIcons } from '@ng-icons/core';
import {
  lucideHome,
  lucideMap,
  lucideAlertTriangle,
  lucideLayers,
  lucideBell,
  lucideCar,
  lucideFileSearch,
  lucideCalendar,
  lucideBarChart3,
  lucideBarChart,
  lucideSettings,
  lucideChevronLeft,
  lucideChevronRight,
  lucideRefreshCw,
  lucideClock,
  lucideWifi,
  lucideWifiOff,
  lucideMoon,
  lucideSun,
  lucideUser,
  lucideUsers,
  lucideMenu,
  lucideX,
  lucideMapPin,
  lucideActivity,
  lucideZap,
  lucideTimer,
  lucideVolume2,
  lucideVolumeX,
  lucideCheck,
  lucideCheckCircle,
  lucideFilter,
  lucideSearch,
  lucideTrash2,
  lucideEye,
  lucideEyeOff,
  lucideInfo,
  lucideAlertCircle,
  lucideCloudRain,
  lucideConstruction,
  lucideTrendingUp,
  lucideTrendingDown,
  lucidePlay,
  lucideSquare,
  lucideSave,
  lucideExternalLink,
  lucideGithub,
  lucideServer,
  lucideDatabase,
  lucideShieldCheck,
  lucideShieldAlert,
  lucideShield,
  lucideTarget,
  lucideNavigation,
  lucideCircle,
  lucideCircleDot,
  // Additional icons for new components
  lucidePlus,
  lucideCamera,
  lucideUpload,
  lucideThermometer,
  lucideWind,
  lucideCloudOff,
  lucideFileText,
  lucideImage,
  // Risk Dashboard icons
  lucideMinus,
  lucideBrain,
  lucideGauge,
  lucideList,
  lucideLayoutGrid,
  // Statistics and History icons
  lucideHistory,
  lucideRadio,
  lucideLineChart,
  // Auth icons
  lucideLock,
  lucideLogIn,
  lucideLogOut,
  lucideUserCheck,
  lucideUserX,
  lucideKey,
  lucideEdit,
  // Notification snackbar icons
  lucideOctagon,
  lucideTag,
} from '@ng-icons/lucide';

export function provideAppIcons() {
  return provideIcons({
    // Navigation
    lucideHome,
    lucideMap,
    lucideAlertTriangle,
    lucideLayers,
    lucideBell,
    lucideCar,
    lucideFileSearch,
    lucideCalendar,
    lucideBarChart3,
    lucideSettings,

    // UI Controls
    lucideChevronLeft,
    lucideChevronRight,
    lucideRefreshCw,
    lucideMenu,
    lucideX,
    lucideFilter,
    lucideSearch,
    lucideTrash2,
    lucideEye,
    lucidePlay,
    lucideSquare,
    lucideSave,
    lucideExternalLink,

    // Status
    lucideClock,
    lucideWifi,
    lucideWifiOff,
    lucideCheck,
    lucideCheckCircle,
    lucideInfo,
    lucideAlertCircle,
    lucideCircle,
    lucideCircleDot,

    // Theme
    lucideMoon,
    lucideSun,
    lucideUser,

    // Map
    lucideMapPin,
    lucideTarget,
    lucideNavigation,

    // Metrics
    lucideActivity,
    lucideZap,
    lucideTimer,
    lucideTrendingUp,
    lucideTrendingDown,

    // Audio
    lucideVolume2,
    lucideVolumeX,

    // Weather & Hazards
    lucideCloudRain,
    lucideConstruction,

    // Admin
    lucideGithub,
    lucideServer,
    lucideDatabase,
    lucideShieldCheck,

    // Additional icons
    lucidePlus,
    lucideCamera,
    lucideUpload,
    lucideThermometer,
    lucideWind,
    lucideCloudOff,
    lucideFileText,
    lucideImage,

    // Risk Dashboard icons
    lucideUsers,
    lucideShieldAlert,
    lucideMinus,
    lucideBrain,
    lucideGauge,
    lucideList,
    lucideLayoutGrid,

    // Statistics and History icons
    lucideHistory,
    lucideRadio,
    lucideLineChart,
    lucideBarChart,

    // Auth icons
    lucideLock,
    lucideLogIn,
    lucideLogOut,
    lucideUserCheck,
    lucideUserX,
    lucideKey,
    lucideEdit,
    lucideEyeOff,
    lucideShield,
    
    // Notification snackbar icons
    lucideOctagon,
    lucideTag,
  });
}

// Icon names mapping for easy reference
export const ICON_NAMES = {
  // Navigation
  home: 'lucideHome',
  map: 'lucideMap',
  alertTriangle: 'lucideAlertTriangle',
  layers: 'lucideLayers',
  bell: 'lucideBell',
  car: 'lucideCar',
  fileSearch: 'lucideFileSearch',
  calendar: 'lucideCalendar',
  barChart: 'lucideBarChart3',
  settings: 'lucideSettings',

  // UI
  chevronLeft: 'lucideChevronLeft',
  chevronRight: 'lucideChevronRight',
  refresh: 'lucideRefreshCw',
  menu: 'lucideMenu',
  close: 'lucideX',
  filter: 'lucideFilter',
  search: 'lucideSearch',
  trash: 'lucideTrash2',
  eye: 'lucideEye',
  play: 'lucidePlay',
  stop: 'lucideSquare',
  save: 'lucideSave',
  externalLink: 'lucideExternalLink',

  // Status
  clock: 'lucideClock',
  wifi: 'lucideWifi',
  wifiOff: 'lucideWifiOff',
  check: 'lucideCheck',
  checkCircle: 'lucideCheckCircle',
  info: 'lucideInfo',
  alertCircle: 'lucideAlertCircle',
  circle: 'lucideCircle',
  circleDot: 'lucideCircleDot',

  // Theme
  moon: 'lucideMoon',
  sun: 'lucideSun',
  user: 'lucideUser',

  // Map
  mapPin: 'lucideMapPin',
  target: 'lucideTarget',
  navigation: 'lucideNavigation',

  // Metrics
  activity: 'lucideActivity',
  zap: 'lucideZap',
  timer: 'lucideTimer',
  trendUp: 'lucideTrendingUp',
  trendDown: 'lucideTrendingDown',

  // Audio
  volume: 'lucideVolume2',
  volumeOff: 'lucideVolumeX',

  // Weather
  cloudRain: 'lucideCloudRain',
  construction: 'lucideConstruction',

  // Admin
  github: 'lucideGithub',
  server: 'lucideServer',
  database: 'lucideDatabase',
  shield: 'lucideShieldCheck',
} as const;
