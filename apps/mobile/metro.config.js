const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  'require',
  'react-native',
  'default',
];

// Web polyfills for native-only modules
const WEB_ALIASES = {
  'expo-secure-store': path.resolve(__dirname, './polyfills/web/secureStore.web.ts'),
  'react-native-webview': path.resolve(__dirname, './polyfills/web/webview.web.tsx'),
  'react-native-maps': path.resolve(__dirname, './polyfills/web/maps.web.jsx'),
  'expo-location': path.resolve(__dirname, './polyfills/web/location.web.ts'),
  'expo-notifications': path.resolve(__dirname, './polyfills/web/notifications.web.tsx'),
  'expo-contacts': path.resolve(__dirname, './polyfills/web/contacts.web.ts'),
  'react-native-web/dist/exports/Alert': path.resolve(__dirname, './polyfills/web/alerts.web.tsx'),
  '@react-native-community/netinfo': path.resolve(__dirname, './polyfills/web/netinfo.web.ts'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@expo-google-fonts/') && moduleName !== '@expo-google-fonts/dev') {
    return context.resolveRequest(context, '@expo-google-fonts/dev', platform);
  }
  
  if (platform === 'web' && moduleName.includes('zustand')) {
    const result = require.resolve(moduleName);
    return context.resolveRequest(context, result, platform);
  }
  if (platform === 'web' && WEB_ALIASES[moduleName]) {
    return context.resolveRequest(context, WEB_ALIASES[moduleName], platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
