/**
 * Routing error detector for AppGen preview
 * Detects "Unmatched Route" errors and reports them to the parent window
 * Automatically imported in _layout.tsx.
 */

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let lastReportedPath: string | null = null;
  
  const checkForRoutingError = () => {
    try {
      // Check for Expo Router's "Unmatched Route" error page
      // The error page typically contains these indicators:
      const bodyText = document.body?.textContent || '';
      const hasUnmatchedRoute = 
        bodyText.includes('Unmatched Route') || 
        bodyText.includes('Page could not be found') ||
        document.querySelector('[data-testid="unmatched-route"]') !== null ||
        document.querySelector('.unmatched-route') !== null;
      
      if (hasUnmatchedRoute) {
        const currentPath = window.location.pathname + window.location.search;
        
        // Only report if path changed (avoid spam)
        if (currentPath !== lastReportedPath) {
          lastReportedPath = currentPath;
          
          // Post message to parent window (only if available, not in Expo Go)
          if (window.parent && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage({
              type: 'appgen:routing-error',
              error: 'Unmatched Route',
              path: currentPath,
              message: 'Page could not be found',
              timestamp: Date.now()
            }, '*');
          }
          
          console.error('[Routing Error] Unmatched route detected:', currentPath);
        }
      } else {
        // Reset if error is gone
        if (lastReportedPath) {
          lastReportedPath = null;
        }
      }
    } catch (error) {
      // Silently fail - don't break the app
    }
  };
  
  // Check immediately
  checkForRoutingError();
  
  // Check on navigation (Expo Router uses client-side routing)
  let checkInterval: ReturnType<typeof setInterval> | null = null;
  
  const startChecking = () => {
    if (checkInterval) return; // Already checking
    
    // Check every 2 seconds
    checkInterval = setInterval(checkForRoutingError, 2000);
    
    // Also check on popstate (browser back/forward) - only if addEventListener is available
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('popstate', checkForRoutingError);
    }
  };
  
  const stopChecking = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    if (typeof window.removeEventListener === 'function') {
      window.removeEventListener('popstate', checkForRoutingError);
    }
  };
  
  // Start checking when DOM is ready - only if document is available
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      if (typeof document.addEventListener === 'function') {
        document.addEventListener('DOMContentLoaded', startChecking);
      }
    } else {
      startChecking();
    }
    
    // Cleanup on page unload - only if addEventListener is available
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', stopChecking);
    }
  }
}
