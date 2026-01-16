/**
 * Screenshot capture utility that periodically captures the app and sends to parent.
 * Uses html2canvas to capture the DOM and postMessage to send to AppGen.
 * Automatically imported in _layout.tsx.
 */

let screenshotInterval: ReturnType<typeof setInterval> | null = null;
let lastScreenshotTime = 0;
let hasInitialScreenshot = false;
const SCREENSHOT_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MIN_SCREENSHOT_GAP = 30 * 1000; // Minimum 30 seconds between screenshots

// Mobile viewport dimensions (iPhone 14 Pro)
const MOBILE_WIDTH = 390;
const MOBILE_HEIGHT = 844;

async function captureScreenshot(force = false) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  // Don't capture too frequently (unless forced)
  const now = Date.now();
  if (!force && now - lastScreenshotTime < MIN_SCREENSHOT_GAP) return;
  
  try {
    // Dynamically import html2canvas to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default;
    
    // Find the root element to capture
    const targetElement = document.getElementById('root') || document.body;
    
    // Capture the screenshot with mobile viewport dimensions
    const canvas = await html2canvas(targetElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale: 2, // 2x scale for retina quality
      logging: false,
      width: MOBILE_WIDTH,
      height: MOBILE_HEIGHT,
      windowWidth: MOBILE_WIDTH,
      windowHeight: MOBILE_HEIGHT,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
    });
    
    // Resize canvas to 1x for smaller file size
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = MOBILE_WIDTH;
    resizedCanvas.height = MOBILE_HEIGHT;
    const ctx = resizedCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, MOBILE_WIDTH, MOBILE_HEIGHT);
    }
    
    // Convert to base64 PNG
    const dataUrl = resizedCanvas.toDataURL('image/png', 0.85);
    
    // Send to parent window
    try {
      if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({
          type: 'appgen:screenshot',
          data: dataUrl,
          timestamp: now,
        }, '*');
        lastScreenshotTime = now;
        hasInitialScreenshot = true;
      }
    } catch (err) {
      console.error('[AppGen] Failed to send screenshot to parent:', err);
    }
  } catch (error) {
    console.error('[AppGen] Failed to capture screenshot:', error);
  }
}

// Start capturing screenshots after the app loads
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Notify parent that screenshot utility is ready
  const notifyReady = () => {
    try {
      if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({ type: 'appgen:screenshotReady' }, '*');
      }
    } catch { /* ignore */ }
  };
  
  // Take initial screenshot when app is fully rendered
  const captureInitialScreenshot = () => {
    if (hasInitialScreenshot) return;
    
    // Use requestAnimationFrame to ensure paint is complete
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        // Wait a bit more for any async content to load
        setTimeout(() => {
          captureScreenshot(true);
        }, 2000);
      });
    } else {
      // Fallback if requestAnimationFrame is not available
      setTimeout(() => {
        captureScreenshot(true);
      }, 2000);
    }
  };
  
  // Start interval for periodic screenshots
  const startPeriodicCapture = () => {
    if (screenshotInterval) return;
    if (typeof setInterval === 'function') {
      screenshotInterval = setInterval(() => captureScreenshot(false), SCREENSHOT_INTERVAL);
    }
  };
  
  // Initialize when DOM is ready
  const initialize = () => {
    notifyReady();
    captureInitialScreenshot();
    startPeriodicCapture();
  };
  
  // Check if document.readyState exists before using it
  try {
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      initialize();
    } else if (typeof window.addEventListener === 'function') {
      window.addEventListener('load', initialize);
    } else {
      // Fallback: just initialize after a delay
      setTimeout(initialize, 1000);
    }
  } catch {
    // If document access fails, just initialize after a delay
    setTimeout(initialize, 1000);
  }
  
  // Listen for capture requests from parent
  try {
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'appgen:captureScreenshot') {
          captureScreenshot(true); // Force capture when requested
        }
      });
    }
  } catch { /* ignore */ }
}

export { captureScreenshot };
