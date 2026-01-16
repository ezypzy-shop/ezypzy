import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_URL } from './api';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the push token
 * Call this when user logs in or signs up
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // This will be configured automatically by Expo
    })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Save push token to backend (for current user)
 */
export async function savePushToken(userId: string, userType: 'customer' | 'business', token: string) {
  try {
    const response = await fetch(`${API_URL}/api/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userType, pushToken: token }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save push token');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Notification received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  // User tapped on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    onNotificationResponse?.(response);
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
