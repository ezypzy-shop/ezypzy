// Complete web polyfill for expo-location - does NOT import from expo-location

export type LocationGeocodedAddress = {
  city: string | null;
  street: string | null;
  district: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  isoCountryCode: string | null;
  name: string | null;
  streetNumber: string | null;
  subregion: string | null;
  timezone: string | null;
  formattedAddress: string | null;
};

export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

export const PermissionStatus = {
  UNDETERMINED: 'undetermined',
  GRANTED: 'granted',
  DENIED: 'denied',
};

export async function requestForegroundPermissionsAsync() {
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return { status: 'granted' };
  }
  return { status: 'denied' };
}

export async function requestBackgroundPermissionsAsync() {
  return { status: 'denied' };
}

export async function getForegroundPermissionsAsync() {
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return { status: 'granted' };
  }
  return { status: 'undetermined' };
}

export async function getBackgroundPermissionsAsync() {
  return { status: 'denied' };
}

export async function getCurrentPositionAsync(options?: { accuracy?: number }) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocation not available on web'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: (options?.accuracy ?? 3) >= 4,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

export async function getLastKnownPositionAsync() {
  return null;
}

export async function reverseGeocodeAsync({ latitude, longitude }: { latitude: number; longitude: number }): Promise<LocationGeocodedAddress[]> {
  return [
    {
      city: 'Sample City',
      street: 'Main Street',
      district: 'Downtown',
      region: 'Sample State',
      postalCode: '12345',
      country: 'Sample Country',
      isoCountryCode: 'SC',
      name: `Location at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      streetNumber: '123',
      subregion: null,
      timezone: null,
      formattedAddress: null,
    },
  ];
}

export async function geocodeAsync(address: string) {
  return [];
}

export async function watchPositionAsync(options: any, callback: Function) {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return { remove: () => {} };
  }
  
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        },
        timestamp: position.timestamp,
      });
    },
    undefined,
    { enableHighAccuracy: true }
  );
  
  return {
    remove: () => navigator.geolocation.clearWatch(watchId),
  };
}

export async function hasServicesEnabledAsync() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export async function isBackgroundLocationAvailableAsync() {
  return false;
}

// Default export with all functions
const LocationModule = {
  Accuracy,
  PermissionStatus,
  requestForegroundPermissionsAsync,
  requestBackgroundPermissionsAsync,
  getForegroundPermissionsAsync,
  getBackgroundPermissionsAsync,
  getCurrentPositionAsync,
  getLastKnownPositionAsync,
  reverseGeocodeAsync,
  geocodeAsync,
  watchPositionAsync,
  hasServicesEnabledAsync,
  isBackgroundLocationAvailableAsync,
};

export default LocationModule;
