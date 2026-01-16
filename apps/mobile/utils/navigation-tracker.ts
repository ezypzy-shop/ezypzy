/**
 * Navigation tracker for AppGen preview
 * Tracks route changes and sends them to the parent window for screen restriction
 * Automatically imported in _layout.tsx.
 * Note: This only runs in web context (iframe), not in Expo Go (native app).
 */

// Only run in web context where window.location exists (not in Expo Go native app)
if (typeof window !== 'undefined' && typeof window.location !== 'undefined' && window.location !== null) {
  let lastReportedRoute: string | null = null;
  
  const reportNavigation = (route: string) => {
    // Only report if route changed
    if (route === lastReportedRoute) return;
    lastReportedRoute = route;
    
    try {
      // Only send postMessage if window.parent is available (not in Expo Go)
      if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage(
          { type: 'NAVIGATION', screen: route, timestamp: Date.now() },
          '*'
        );
      }
    } catch { /* ignore - not in iframe context */ }
  };
  
  // Report initial route - safely access pathname
  try {
    const initialRoute = window.location?.pathname || '/';
    reportNavigation(initialRoute);
  } catch { /* ignore - location not available */ }
  
  // Listen for URL changes (works for Expo Router web)
  if (typeof window.addEventListener === 'function' && typeof history !== 'undefined') {
    try {
      // History API changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(...args) {
        originalPushState.apply(this, args);
        try {
          reportNavigation(window.location?.pathname || '/');
        } catch { /* ignore */ }
      };
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        try {
          reportNavigation(window.location?.pathname || '/');
        } catch { /* ignore */ }
      };
      
      // Back/forward navigation
      window.addEventListener('popstate', () => {
        try {
          reportNavigation(window.location?.pathname || '/');
        } catch { /* ignore */ }
      });
      
      // Also observe hash changes for hash-based routing
      window.addEventListener('hashchange', () => {
        try {
          const route = window.location?.hash ? window.location.hash.slice(1) : window.location?.pathname;
          reportNavigation(route || '/');
        } catch { /* ignore */ }
      });
    } catch { /* ignore - history API not available */ }
  }
}

export {};
