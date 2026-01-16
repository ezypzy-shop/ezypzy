// netinfo.web.ts - Web polyfill for @react-native-community/netinfo

type NetInfoState = {
  type: string;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  details: {
    isConnectionExpensive: boolean;
  } | null;
};

const getState = (): NetInfoState => ({
  type: typeof navigator !== 'undefined' && navigator.onLine ? 'wifi' : 'none',
  isConnected: typeof navigator !== 'undefined' ? navigator.onLine : null,
  isInternetReachable: typeof navigator !== 'undefined' ? navigator.onLine : null,
  details: {
    isConnectionExpensive: false,
  },
});

export const fetch = async (): Promise<NetInfoState> => {
  return getState();
};

export const addEventListener = (callback: (state: NetInfoState) => void) => {
  const handleOnline = () => callback(getState());
  const handleOffline = () => callback(getState());
  
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }
  
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
};

export const useNetInfo = () => {
  return getState();
};

export const refresh = async (): Promise<NetInfoState> => {
  return getState();
};

export const configure = (config: any) => {
  // no-op for web
};

export default {
  fetch,
  addEventListener,
  useNetInfo,
  refresh,
  configure,
};
