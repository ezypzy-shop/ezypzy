import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllUserData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('🔍 Found AsyncStorage keys:', keys);
    
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
      console.log('✅ Cleared all AsyncStorage data');
    }
  } catch (error) {
    console.error('❌ Error clearing AsyncStorage:', error);
  }
};
